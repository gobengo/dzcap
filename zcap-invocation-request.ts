// @ts-expect-error no types
import { signCapabilityInvocation } from '@digitalbazaar/http-signature-zcap-invoke'

import {
  parseSignatureHeader
  // @ts-expect-error no types
} from '@digitalbazaar/http-signature-header';
import { type DIDKeyVerificationMethodId, isDidKeyVerificationMethodId } from './did.ts';
import { type IDocumentLoader, verifyCapabilityInvocation } from './invocation-http-signature.ts';
import type { ISigner, IZcapCapability } from './types.ts';

export { type IZcapCapability }

// date in year 3000
export const YEAR_3000_ISO8601 = '3000-01-01T00:01Z';
export const YEAR_3000 = new Date(Date.parse(YEAR_3000_ISO8601))

/**
 * create a DOM Request (usu. a http request) that will invoke a capability
 * @param url - url of request target
 * @param options - options
 * @param options.capability - capability to invoke
 * @param options.method - method the request will invoke
 * @param options.headers - headers to send with request
 * @param options.action - capability action
 * @param options.invocationSigner - signs invocation proof
 * @param options.body - request body
 * @returns request with signer invocation in headers
 */
export async function createRequestForCapabilityInvocation(url: URL, options: {
  capability?: IZcapCapability | string,
  method?: string,
  headers?: Record<string, string>,
  action?: string,
  invocationSigner: ISigner,
  body?: Blob | FormData,
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
  static async verified(request: Request, options: {
    documentLoader: IDocumentLoader
  }): Promise<VerifiedZcapInvocationRequest> {
    if (new URL(request.url).protocol !== 'https:') {
      throw new Error(`request url must be 'https:' to use ZCAPs`, {
        cause: {
          url: request.url,
        }
      })
    }
    await verifyCapabilityInvocation(
      request,
      {
        documentLoader: options.documentLoader,
        expectedTarget: request.url,
        expectedRootCapability: `urn:zcap:root:${encodeURIComponent(request.url)}`,
      }
    )
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
