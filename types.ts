import type * as did from "./did.js"

// Decentralized Identifier (aka DID)
export type DID = did.DID

// abstraction of Digital Signature Algorithm implementation
export interface ISigner {
  id?: string
  sign(signable: { data: Uint8Array }): Promise<Uint8Array>
}

// verifying zcaps requires resolving root zcap URNs.
// this is what resolvers of root zcap URNs should resolve.
export type RootZcapResolver = (urn: `urn:zcap:root:${string}`) => Promise<{
  controller?: DID,
  "@context": "https://w3id.org/zcap/v1",
  id: string,
  invocationTarget: string,
}>

export interface IZcapCapability {
  controller: string
  id: string
  invocationTarget?: string
  allowedAction?: string[]
  parentCapability?: string | IZcapCapability
  "@context": ["https://w3id.org/zcap/v1", ...(string|object)[]],
  // should be iso8601
  expires: string
}
