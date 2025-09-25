import { describe, test } from "node:test"
import { createRequestForCapabilityInvocation, ZcapInvocationRequest } from "./zcap-invocation-request.ts"
import assert from "node:assert"
import { getControllerOfDidKeyVerificationMethod } from "./did-key.ts"
import { createDocumentLoader } from "./document-loader.ts"
import { Ed25519Signer } from "@did.coop/did-key-ed25519"

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

})
