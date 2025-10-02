import { test } from "node:test"
import assert from "node:assert"
import { invoke } from "./invocation.js"
import { Ed25519Signer } from "@did.coop/did-key-ed25519"
import { InvocationJsonVerification } from "./invocation-json.js"
import { createDocumentLoader } from "./document-loader.js"
import { type ISigner, type RootZcapResolver } from "./types.js"
import { isRootZcapUrn } from "./index.js"

// eslint-disable-next-line jsdoc/require-jsdoc
async function createExampleInvocation(url: URL, options:{
  signer?: ISigner
}={}) {
  const signer = options.signer || Ed25519Signer.generate()
  const invocation = await invoke(url, await signer)
  return invocation
}

await test(`dzcap/invocation-json`, async t => {
  await t.test('can verify json invocation', async t => {
    const alice = await Ed25519Signer.generate()
    const url = new URL('https://example.example')
    const invocation = await createExampleInvocation(url, { signer: alice })
    const resolveRootZcap: RootZcapResolver = async (rootZcapUrn) => {
      const invocationTarget = decodeURIComponent(rootZcapUrn.split(':')[3])
      return {
        '@context': 'https://w3id.org/zcap/v1',
        id: rootZcapUrn,
        invocationTarget,
        controller: alice.controller,
      }
    }
    const verification = await InvocationJsonVerification.from(invocation, {
      documentLoader: createDocumentLoader(
        async url => {
          if (isRootZcapUrn(url)) {
            return {
              document: await resolveRootZcap(url),
              documentUrl: url,
            }
          }
          throw new Error(`unable to load unexpected url ${url}`)
        }
      ),
      allowTargetAttenuation: true,
      expectedAction: invocation.proof.capabilityAction,
      expectedTarget: [invocation.proof.invocationTarget],
      expectedRootCapability: `urn:zcap:root:${encodeURIComponent(invocation.invocationTarget)}`
    })
    assert.equal(verification.verified, true, `verification.verified is true`)
  })
})
