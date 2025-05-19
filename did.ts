export type DID<Method extends string = string> = `did:${Method}:${string}`

/**
 * did:key DIDs resolve to a did document with only a single verificationMethod.
 * this is the type of the id of that verification method.
 * It's usually like `did:key:{publicKeyMultibase}#{publicKeyMultibase}` (where both `{publicKeyMultibase}` are identical).
 */
export type DIDKeyVerificationMethodId = `${DID<'key'>}#${string}`

export function isDidKey(s: unknown): s is `did:key:${string}` {
  return Boolean(typeof s === 'string' && s.match(/^did:key:([^:#]+)$/))
}
export function isDidWeb(s: unknown): s is `did:web:${string}` {
  return Boolean(typeof s === 'string' && s.match(/^did:web:([^:#]+)/))
}

export function isDidKeyVerificationMethodId(s: unknown): s is `did:key:${string}#${string}` {
  return Boolean(typeof s === 'string' && s.match(/did:key:([^:#]+)#([^:#]+)$/))
}

export function getDidForDidUri<Method extends string=string>(didUri: `did:${Method}:${string}`): DID<Method> {
  const u = new URL(didUri)
  u.pathname = ''
  u.hash = ''
  u.search = ''
  return u.toString() as DID<Method>
}
