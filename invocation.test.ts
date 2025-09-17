import { test } from "node:test"
// @ts-expect-error no types
import jsigs from "jsonld-signatures"
import { createDocumentLoader } from "./document-loader.js"
// @ts-expect-error no types
import { Ed25519Signature2020 } from '@digitalbazaar/ed25519-signature-2020';
import assert from "node:assert"
// @ts-expect-error no types
import { CapabilityInvocation } from '@digitalbazaar/zcap'
import { ISigner } from "@did.coop/did-key-ed25519/types";
import { Ed25519Signer } from "@did.coop/did-key-ed25519";

await test(`can create json invocation`, async t => {
  const key = await Ed25519Signer.generate()
  const signed = await invoke(new URL('https://data.pub'), key)
  assert.equal(typeof signed.proof, 'object')
})

export async function invoke(capability: URL, key: ISigner) {
  const parentCapability = (capability instanceof URL) ? `urn:zcap:root:${encodeURIComponent(capability.toString())}` : undefined
  const unsigned = {
    '@context': ["https://w3id.org/zcap/v1"],
    invocationTarget: capability.toString()
  }
  const signed = await jsigs.sign(
    unsigned, {
    documentLoader: createDocumentLoader(async url => {
      throw new Error('unable to load document ' + url)
    }),
    suite: new Ed25519Signature2020({
      signer: key,
      date: new Date,
    }),
    purpose: new CapabilityInvocation({
      capability: parentCapability,
      capabilityAction: 'GET',
      invocationTarget: capability.toString(),
    })
  }
  )
  return signed
}
