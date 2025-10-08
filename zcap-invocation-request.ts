// @ts-expect-error no types
import { signCapabilityInvocation } from '@digitalbazaar/http-signature-zcap-invoke'

import {
  parseSignatureHeader
  // @ts-expect-error no types
} from '@digitalbazaar/http-signature-header';
import { type DIDKeyVerificationMethodId, isDidKeyVerificationMethodId } from './did.js';
import { type IDocumentLoader, verifyCapabilityInvocation } from './invocation-http-signature.js';
import type { ISigner, IZcapCapability } from './types.js';

export { type IZcapCapability }

// date in year 3000
export const YEAR_3000_ISO8601 = '3000-01-01T00:01Z';
export const YEAR_3000 = new Date(Date.parse(YEAR_3000_ISO8601))

/**
 * create a DOM Request (usu. a http request) that will invoke a capability
 * @param url - url of request target
 * @param options - options
 * @param [options.capability] - capability to invoke
 * @param [options.method] - method the request will invoke
 * @param [options.headers] - headers to send with request
 * @param [options.action] - capability action
 * @param options.invocationSigner - signs invocation proof
 * @param [options.invocationTarget] - explicit zcap invocation target.
 *   If not explicitly provided, it will be derived from request URL.
 * @param [options.body] - request body
 * @returns request with signer invocation in headers
 */
export async function createRequestForCapabilityInvocation(url: URL, options: {
  capability?: IZcapCapability | string,
  method?: string,
  headers?: Record<string, string>,
  action?: string,
  invocationSigner: ISigner,
  invocationTarget?: URL,
  body?: Blob,
}) {
  const method = options.method || 'GET'
  const capabilityAction = options.action ?? method
  // @todo - should support signing over request body too.
  // unfortunately  only supports this for json request bodies.
  // for now the request bodies will not be signed over.
  const signedInvocationHeaders: Record<string, string> = await signCapabilityInvocation({
    capability: options.capability,
    capabilityAction,
    headers: options.headers || {},
    invocationSigner: options.invocationSigner,
    method,
    url: url.toString(),
    body: options.body,
  })
  return {
    method,
    headers: signedInvocationHeaders,
    body: options.body,
  }
}

export class ZcapInvocationRequest {
  request: Request
  static async from(request: Request) {
    return new ZcapInvocationRequest(request)
  }
  /**
   * @param request - request
   * @param options - options
   * @param options.documentLoader - JSON-LD document loader
   * @param options.trustHeaderXForwardedProto - whether to trust x-forwarded-proto header
   * @returns verified request
   */
  static async verified(request: Request, options: {
    documentLoader: IDocumentLoader,
    trustHeaderXForwardedProto?: boolean,
  }): Promise<VerifiedZcapInvocationRequest> {
    const { trustHeaderXForwardedProto = false } = options
    await verifyCapabilityInvocation(
      request,
      {
        trustHeaderXForwardedProto,
        documentLoader: options.documentLoader,
      }
    );
    return new VerifiedZcapInvocationRequest(request)
  }
  protected constructor(request: Request) {
    this.request = request
  }
  get invoker(): DIDKeyVerificationMethodId {
    const authorization = this.request.headers.get('authorization')
    const parsedAuthorization = parseSignatureHeader(authorization)
    const keyId = parsedAuthorization.params.keyId
    if (!keyId) throw new Error(`unable to determine invoker keyId from authorization header`, {
      cause: {
        authorization,
      }
    })
    if (!isDidKeyVerificationMethodId(keyId)) {
      throw new Error(`unable to determine did:key verificationMethod id from keyId`)
    }
    return keyId
  }
}

class VerifiedZcapInvocationRequest extends ZcapInvocationRequest { }

/**
 * determine the expected invocationTarget for a request.
 * @param request - http request
 * @param options - options
 * @param options.trustHeaderXForwardedProto - whether to trust x-forwarded-proto header
 * @returns expected invocationTarget
 */
export function determineExpectedTarget(request: Request, options: {
  trustHeaderXForwardedProto: boolean,
}) {
  const url = new URL(request.url)
  if (options.trustHeaderXForwardedProto) {
    const protocolFromXForwardedProto = request.headers.get('X-Forwarded-Proto')
    if (protocolFromXForwardedProto) {
      if (!isValidUrlProtocol(protocolFromXForwardedProto)) {
        throw new Error(`${protocolFromXForwardedProto} is not a valid value for X-Forwarded-Proto header`)
      }
      return urlWithProtocol(url, protocolFromXForwardedProto)
    }
  }
  return url
}

/**
 * @param value - value to test
 * @returns whether or not value is a valid value for x-forwarded-proto
 */
function isValidUrlProtocol(value: unknown): value is `${string}:` {
  if (typeof value !== 'string') return false
  if (value.endsWith(':')) return false
  return true
}

/**
 * given a URL, return a new one with only the protocol changed
 * @param url - starting url template
 * @param protocol - protocol to use on new URL
 * @returns new URL with everything same as `url` except protocol
 */
function urlWithProtocol(url: URL | string, protocol: `${string}:`) {
  const url2 = new URL(url)
  url2.protocol = protocol
  return url2
}