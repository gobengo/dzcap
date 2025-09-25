#!/usr/bin/env node --test

import { createRequestForCapabilityInvocation, ZcapInvocationRequest } from "./zcap-invocation-request.ts"
import assert from "node:assert"
import { getControllerOfDidKeyVerificationMethod } from "./did-key.ts"
import { createDocumentLoader } from "./document-loader.ts"
import { Ed25519Signer } from "@did.coop/did-key-ed25519"

/** the parts of node:test these tests rely on */
type Testing = Pick<typeof import('node:test'), 'describe' | 'test'>

/**
 * run the test suite
 * @param testing - test library to register subtests with
 * @param testing.describe - register a test suite
 * @param testing.test - register a test
 */
async function test({ describe, test }: Testing) {

  await describe(`ZcapInvocationRequest`, async () => {
    await test('.invoker gets invoker', async t => {
      const alice = await Ed25519Signer.generate()
      const url = new URL('https://example.com')
      const request = new Request(url, await createRequestForCapabilityInvocation(url, {
        invocationSigner: alice,
        method: 'GET',
      }))
      const invocation = await ZcapInvocationRequest.from(request)
      assert.equal(invocation.invoker, alice.id)
      const invokerController = getControllerOfDidKeyVerificationMethod(invocation.invoker)
      assert.equal(invokerController, alice.controller)

      const documentLoader = createDocumentLoader(async (documentUrl) => {
        if (documentUrl === `urn:zcap:root:${encodeURIComponent(url.toString())}`) {
          return {
            documentUrl,
            document: {
              "@context": "https://w3id.org/zcap/v1",
              id: documentUrl,
              invocationTarget: url.toString(),
              controller: alice.controller,
            },
          }
        }
        throw new Error(`unable to load document: ${documentUrl}`, { cause: documentUrl })
      })
      const verifiedInvocation = await ZcapInvocationRequest.verified(request, { documentLoader })
      assert.equal(verifiedInvocation.invoker, alice.id)
    })
  })

  await describe('createRequestForCapabilityInvocation', async () => {
    await test(`can create a request`, async t => {
      const alice = await Ed25519Signer.generate()
      const url = new URL('http://example.example')
      const request = await createRequestForCapabilityInvocation(url, {
        invocationSigner: alice,
      })
      assert.equal(request.method, 'GET')
      assert.ok(request.headers['authorization']?.startsWith('Signature keyId="'),
        `authorization header has scheme Signature`)
    })
  })

}

/** this will be run when the file is executed as a script */
async function main() {
  await test(await import('node:test'))
}

if (`file://${process.argv[1]}` === import.meta.url) {
  await main()
}
