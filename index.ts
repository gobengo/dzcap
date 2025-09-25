// date in year 3000
export const YEAR_3000_ISO8601 = '3000-01-01T00:01Z';
export const YEAR_3000 = new Date(Date.parse(YEAR_3000_ISO8601))

/**
 * @param v - value to test
 * @returns whether or not the provided urn satisfies syntax of a root zcap urn
 */
export function isRootZcapUrn(v: unknown): v is `urn:zcap:root:${string}` {
  if (typeof v !== 'string') return false
  return v.startsWith(`urn:zcap:root:`)
}

export type IRootZcapResolver = (urn: `urn:zcap:root:${string}`) => Promise<IResolvedRootZcap>

export interface IResolvedRootZcap {
  "@context": "https://w3id.org/zcap/v1"
  id: `urn:zcap:root:${string}`
  controller?: `did:${string}:${string}`
  invocationTarget: string
}

export { createRequestForCapabilityInvocation } from "./zcap-invocation-request.ts"
