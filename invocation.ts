// @ts-expect-error no types
import jsigs from "jsonld-signatures"
import { createDocumentLoader } from "./document-loader.ts"
// @ts-expect-error no types
import { Ed25519Signature2020 } from '@digitalbazaar/ed25519-signature-2020';
// @ts-expect-error no types
import { CapabilityInvocation } from '@digitalbazaar/zcap'
import { type ISigner } from "./types.ts";

export interface ICapabilityInvocation {
  id: string
  capability: {
    id: string
  }
  action?: string
  proof: {
    verificationMethod: string
    proofPurpose: string
    proofValue: string
    created?: Date
    expires?: Date
    capabilityAction: string
    invocationTarget: string
  }
}

/**
 * invoke a capaility, resulting in an invocation object
 * @param capability - capability to invoke
 * @param key - key to use to sign invocation proof
 * @returns - signer invocation
 */
export async function invoke(capability: URL, key: ISigner) {
  const parentCapability = (capability instanceof URL) ? `urn:zcap:root:${encodeURIComponent(capability.toString())}` : undefined
  const unsigned = {
    '@context': ["https://w3id.org/zcap/v1"],
    invocationTarget: capability.toString()
  }
  const signed: typeof unsigned & Pick<ICapabilityInvocation, 'proof'> = await jsigs.sign(
    unsigned,
    {
      documentLoader: createDocumentLoader(async url => {
        console.debug('documentLoader loading', url)
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
