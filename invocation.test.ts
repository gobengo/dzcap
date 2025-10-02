import { test } from "node:test"
import assert from "node:assert"
import { Ed25519Signer } from "@did.coop/did-key-ed25519";
import { invoke } from "./invocation.js";

await test(`can create json invocation`, async t => {
  const key = await Ed25519Signer.generate()
  const signed = await invoke(new URL('https://data.pub'), key)
  assert.equal(typeof signed.proof, 'object')
})
