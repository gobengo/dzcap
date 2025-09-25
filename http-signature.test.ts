import { describe, test } from "node:test"
import assert from "node:assert"
import { HttpSignatureAuthorization, UnixTimestamp } from "./http-signature.ts"
import { Ed25519Signer } from "@did.coop/did-key-ed25519"
import { createRequestWithHttpSignature } from "authorization-signature"

await describe(`dzcap/http-signature`, async () => {
  await test('can verify request with http signature', async t => {
    const alice = await Ed25519Signer.generate()
    const signedParameters = ['(created)', '(expires)', '(key-id)', '(request-target)', 'host']
    const created = new Date
    const expires = new Date(Date.now() + 30*1000)
    const request = await createRequestWithHttpSignature(
      new URL('http://example.com'),
      {
        created,
        expires,
        signer: alice,
        includeHeaders: signedParameters,
      }
    )
    assert.ok(request.headers.get('authorization')?.startsWith('Signature '), `request has authorization header that starts with 'Signature '`)
    const verified = await HttpSignatureAuthorization.verified(request)
    assert.equal(verified.keyId, alice.id)
    assert.deepEqual(verified.signedParameters, signedParameters)
    assert.ok(verified.signature instanceof Uint8Array)
    assert.equal(verified.created.toNumber(), UnixTimestamp.from(created).toNumber())
    assert.equal(verified.expires?.toNumber(), UnixTimestamp.from(expires).toNumber())
  })
})
