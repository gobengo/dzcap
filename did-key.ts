// @ts-expect-error no types
import { Ed25519VerificationKey2020 } from '@digitalbazaar/ed25519-verification-key-2020'

// @ts-expect-error no types
import * as didMethodKey from '@digitalbazaar/did-method-key';
import { DIDKeyVerificationMethodId, isDidKey } from './did.js';

const didKeyDriver = didMethodKey.driver()
didKeyDriver.use({
  multibaseMultikeyHeader: 'z6Mk',
  fromMultibase: Ed25519VerificationKey2020.from
})

export async function getDidDocumentFromDidKey(didKey: `did:key:${string}`) {
  const [,,publicKeyMultibase] = didKey.split(':')
  const publicKey = await Ed25519VerificationKey2020.from({
    controller: didKey,
    publicKeyMultibase,
  })
  const didInfo = await didKeyDriver.fromKeyPair({
    verificationKeyPair: publicKey,
  })
  return didInfo.didDocument
}

export function getControllerOfDidKeyVerificationMethod(verificationMethod: DIDKeyVerificationMethodId) {
  const did = verificationMethod.split('#').at(0)
  if ( ! isDidKey(did)) {
    throw new Error(`unable to determine did:key from did:key verificationMethod id`, {
      cause: {
        verificationMethod
      }
    })
  }
  return did
}
