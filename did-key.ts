// @ts-expect-error no types
import { Ed25519VerificationKey2020 } from '@digitalbazaar/ed25519-verification-key-2020'

// @ts-expect-error no types
import * as didMethodKey from '@digitalbazaar/did-method-key';
import { type DIDKeyVerificationMethodId, isDidKey } from './did.js';

const didKeyDriver = didMethodKey.driver()
didKeyDriver.use({
  multibaseMultikeyHeader: 'z6Mk',
  fromMultibase: Ed25519VerificationKey2020.from
})

/**
 * @param didKey - did:key:...
 * @returns did document
 */
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

/**
 * did key verificationMethods are like `did:key:{msi}#{msi}`.
 * This is long and redundant.
 * So this function returns the corresponding controller DID, `did:key:{msi}`.
 * @param verificationMethod - URI of did:key verificationMethod, e.g. did:key:{msi}#{msi}
 * @returns DID for the verificationMethod URI `did:key:{msi}`
 */
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
