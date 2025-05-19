// @ts-expect-error no types
import * as zcap from '@digitalbazaar/zcap'
// @ts-expect-error no types
import suiteContext2020 from 'ed25519-signature-2020-context';
import { IDocumentLoader } from './invocation-http-signature.js';
import { getDidDocumentFromDidKey } from './did-key.js'
import { getDidForDidUri } from './did.js';

function isDidKey(s: unknown): s is `did:key:${string}` {
  return Boolean(typeof s === 'string' && s.match(/^did:key:([^:#]+)$/))
}

function isDidKeyVerificationMethodId(s: unknown): s is `did:key:${string}#${string}` {
  return Boolean(typeof s === 'string' && s.match(/did:key:([^:#]+)#([^:#]+)$/))
}

export function createDocumentLoader(baseLoader?: IDocumentLoader) {
  const loader = zcap.extendDocumentLoader(async (url: string) => {
    switch (url) {
      case suiteContext2020.CONTEXT_URL:
        return { document: suiteContext2020.CONTEXT }
    }
    // if url is a did:key, we can resolve the did in place
    if (isDidKey(url)) {
      const didDocumentForDidKey = await getDidDocumentFromDidKey(url)
      if ( ! didDocumentForDidKey) {
        throw new Error(`getDidDocumentFromDidKey unexpectedly returned falsy`, {
          cause: didDocumentForDidKey
        })
      }
      return {
        document: didDocumentForDidKey,
        documentUrl: url,
      }
    }
    // if url is a did:key verificationMethod id, we can resolve the did in place
    if (isDidKeyVerificationMethodId(url)) {
      const did = getDidForDidUri<'key'>(url)
      const didDocument = await getDidDocumentFromDidKey(did)
      if ( ! didDocument) {
        throw new Error(`getDidDocumentFromDidKey unexpectedly returned falsy`, {
          cause: didDocument
        })
      }
      const verificationmethod = didDocument.verificationMethod[0]
      return {
        document: verificationmethod,
        documentUrl: url,
      }
    }
    if (baseLoader) {
      const loaded = await baseLoader(url)
      if (loaded) {
        return loaded
      }
    }

    throw new Error('unable to load document '+url)
  })
  return loader
}
