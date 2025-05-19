
// @ts-expect-error no types
import {Ed25519Signature2020} from '@digitalbazaar/ed25519-signature-2020';
// @ts-expect-error no types
import jsigs from 'jsonld-signatures';
// @ts-expect-error no types
import { CapabilityDelegation } from '@digitalbazaar/zcap'
// @ts-expect-error no types
import * as zcap from '@digitalbazaar/zcap'
// @ts-expect-error no types
import suiteContext2020 from 'ed25519-signature-2020-context';
import { IZcapCapability } from './types.js';
import { ISigner } from './types.js';

export async function delegate(options: {
  signer: ISigner,
  capability: IZcapCapability,
  date?: Date,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  documentLoader?: (url: string) => Promise<any>
}) {
  const date = options.date || new Date
  // derive capability to sign from options.capability.
  // Whereas options.capability.parentCapability may itself be another capability object,
  // when we sign, we only want to sign over options.capability.parentCapability as a string.
  // (because our zcap libraries require it to be a string an error otherwise)
  const capabilityToSign = {
    ...options.capability,
    // parentCapability should be id string, not object
    parentCapability: (typeof options.capability.parentCapability === 'object')
      ? options.capability.parentCapability.id
      : options.capability.parentCapability,
  }
  const signed = await jsigs.sign(capabilityToSign, {
    documentLoader: options.documentLoader || zcap.extendDocumentLoader((url: string) => {
      switch (url) {
        case suiteContext2020.CONTEXT_URL:
          return { document: suiteContext2020.CONTEXT }
      }
    }),
    suite: new Ed25519Signature2020({
      signer: options.signer,
      date
    }),
    purpose: new CapabilityDelegation({
      parentCapability: options.capability.parentCapability,
    })
  })
  return signed
}
