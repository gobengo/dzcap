import { type ICapabilityInvocation } from "./invocation.ts"
import { type IZcapCapability } from "./zcap-invocation-request.ts";

// @ts-expect-error no types
import { parseRequest, parseSignatureHeader } from '@digitalbazaar/http-signature-header';
// @ts-expect-error no types
import { verifyCapabilityInvocation as dbVerifyCapabilityInvocation } from '@digitalbazaar/http-signature-zcap-verify'
// @ts-expect-error no types
import { Ed25519Signature2020 } from '@digitalbazaar/ed25519-signature-2020';
import { getVerifierForKeyId } from "@did.coop/did-key-ed25519/verifier"

export class MissingRequiredHeaderError extends Error {
  constructor(
    headerName: 'authorization' | 'capability-invocation',
    message: string = `missing required header ${headerName}`,
    options?: ErrorOptions,
  ) {
    super(message, options)
  }
}

interface IHttpRequestCapabilityInvocation extends ICapabilityInvocation {
  headerValue: string
}

/**
 * parse invocation from a DOM Request to invocation object
 * @param request - request to parse invocation from
 * @returns invocation from request
 */
export async function createCapabilityInvocationFromRequest(request: Pick<Request, 'headers'>) {
  const authorizationHeader = request.headers.get('authorization')
  if (!authorizationHeader) {
    return new MissingRequiredHeaderError('authorization')
  }
  const capabilityInvocationHeader = request.headers.get('capability-invocation')
  if (!capabilityInvocationHeader) {
    return new MissingRequiredHeaderError('capability-invocation')
  }
  const id = crypto.randomUUID()
  const parsedAuthorizationHeader = parseSignatureHeader(authorizationHeader)
  const parsedInvocationHeader = parseSignatureHeader(capabilityInvocationHeader)
  const expires = typeof parsedAuthorizationHeader.params.expires === 'string'
    ? new Date(parseInt(parsedAuthorizationHeader.params.expires) * 1000)
    : undefined
  const created = typeof parsedAuthorizationHeader.params.created === 'string'
    ? new Date(parseInt(parsedAuthorizationHeader.params.created) * 1000)
    : undefined
  const signatureInput = parsedAuthorizationHeader.params.headers
  if (typeof signatureInput !== 'string') throw new Error(`failed to parse authorization header signatureInput`)
  const invocation = {
    headerValue: authorizationHeader,
    id,
    capability: {
      id: parsedInvocationHeader.params.id,
    },
    action: parsedInvocationHeader.params.action,
    proof: {
      type: 'InvocationProofHttpSignature',
      verificationMethod: parsedAuthorizationHeader.params.keyId,
      proofValue: parsedAuthorizationHeader.params.signature,
      created,
      expires,
      signatureInput,
      proofPurpose: 'capabilityInvocation'
    }
  }
  return invocation
}

export type IDocumentLoader = (url: string) => Promise<{
  document: unknown
}>

/**
 * verify that an invocation has a valid proof and satisfies particular constraints
 * @param request - request to extract invocation from
 * @param options - options
 * @param options.documentLoader - jsonld url resolver
 * @param options.expectedHost - request hostname that the request MUST have
 * @param options.expectedTarget - request target that the request MUST target
 * @param options.expectedRootCapability - request invocation capability MUST match this
 * @param options.expectedAction - request invocation capability MUST invoke this action
 */
export async function verifyCapabilityInvocation(request: Request, options: {
  documentLoader: IDocumentLoader
  expectedHost?: string
  expectedTarget: string
  expectedRootCapability: string | IZcapCapability[]
  expectedAction?: string
}) {
  const invocation = await createCapabilityInvocationFromRequest(request)
  if (invocation instanceof Error) throw invocation
  if (new URL(request.url).protocol !== 'https:') {
    // console.debug(`request url does not use https: protocol. zcaps are only allowed on https urls. verifyCapabilityInvocation will expect the capability to be invoked on the https: url.`, { "request.url": request.url })
  }
  // zcaps are only allowed over http uris so
  const zcapInvocationTarget = urlWithProtocol(request.url, 'https:')
  const expectedHost = options.expectedHost ? options.expectedHost : request.headers.get('host')
  const verificationResult = await dbVerifyCapabilityInvocation({
    url: zcapInvocationTarget.toString(),
    method: request.method,
    suite: new Ed25519Signature2020(),
    headers: Object.fromEntries([...request.headers as unknown as { [Symbol.iterator]: () => IterableIterator<[string, string]> }]),
    async getVerifier(o: { keyId: string }) {
      const keyId = o.keyId
      if (!keyId) {
        throw new Error(`unable to determine verifier for unspecified keyId`, { cause: o })
      }
      return getVerifierForKeyId(keyId)
    },
    expectedHost,
    ...options,
    expectedAction: options.expectedAction || request.method,
  })
  if (verificationResult.error) {
    throw verificationResult.error
  }
  if (verificationResult.verified !== true) {
    throw new Error('unable to verify capability invocation', {
      cause: { verificationResult }
    })
  }
}

/**
 * @param url  - has old protocol
 * @param protocol - protocol of the new url
 * @returns new url with modified protocol
 */
function urlWithProtocol(url: string | URL, protocol: `${string}:`): URL {
  const url2 = new URL(url)
  url2.protocol = protocol
  return url2
}