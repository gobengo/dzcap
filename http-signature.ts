import {
  parseRequest,
  // @ts-expect-error no types
} from '@digitalbazaar/http-signature-header';
import { base64urlToBase64, bytesFromBase64 } from "./base64.js"
import { type DIDKeyVerificationMethodId } from "./did.js";
import { getVerifierForKeyId, type ISignatureVerifier } from "@did.coop/did-key-ed25519/verifier"

/**
 * @param headers - http headers
 * @returns simple js object for each header name/value pair. it will only have one header value per header name, i.e. this is lossy
 */
function headersToObject(headers: Headers) {
  const object = {}
  headers.forEach((headerValue, headerName) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (object as any)[headerName] = headerValue
  })
  return object
}

interface SignatureVerifier {
  verify(options: {
    data: Uint8Array,
    signature: Uint8Array,
  }): Promise<boolean>
}

export const getVerifierForDidKeyVerificationMethod = async (keyId: string): Promise<ISignatureVerifier> => {
  const { verifier } = await getVerifierForKeyId(keyId)
  return verifier
}

export class HttpSignatureAuthorization {
  static async verified(request: Request, options: {
    getVerifier?(keyId: string): Promise<SignatureVerifier>
  }={}) {
    const getVerifier = options.getVerifier ? options.getVerifier.bind(options) : getVerifierForDidKeyVerificationMethod
    const headersObject = headersToObject(request.headers)
    const parsed = parseRequest({
      url: request.url.toString(),
      method: request.method,
      headers: headersObject,
    }, {
      headers: ['(key-id)', '(created)', '(expires)', '(request-target)', 'host']
    })
    const keyId = parsed.params.keyId
    const headers = parsed.params.headers

    // now actually verify the signature
    const actualSignatureBytes = bytesFromBase64(base64urlToBase64(parsed.params.signature))
    {
      // compare expected sign(dataFromRequest) with actual signature
      const expectedSigningString = parsed.signingString
      const expectedSignedBytes = new TextEncoder().encode(expectedSigningString)
      const verifier = await getVerifier(keyId)
      // console.debug('HttpSignatureAuthorization#verified checking signature', {
      //   expectedSigningString,
      //   parsed,
      // })
      const verified = await verifier.verify({
        data: expectedSignedBytes,
        signature: actualSignatureBytes,
      })
      if (verified !== true) {
        throw new Error(`unable to verify http signature`)
      }
    }

    return new VerifiedHttpSignatureAuthorization({
      keyId,
      signedParameters: headers,
      signature: actualSignatureBytes,
      created: UnixTimestamp.from(parsed.params.created),
      expires: UnixTimestamp.from(parsed.params.expires),
    })
  }
}

/**
 * @param d - datetime to convert 
 * @returns unix timestamp (seconds since epoch)
 */
function dateToUnixTimestamp(d: Date) {
  return Math.floor(d.getTime() / 1000)
}

export class UnixTimestamp {
  secondsSinceEpoch: number
  static from(input: string|Date) {
    if (typeof input === "string") {
      const unixTimestamp = parseInt(input)
      return new UnixTimestamp(unixTimestamp)
    }
    return new UnixTimestamp(dateToUnixTimestamp(input))
  }
  constructor(seconds: number) {
    this.secondsSinceEpoch = seconds
  }
  toNumber() {
    return this.secondsSinceEpoch
  }
}

export class VerifiedHttpSignatureAuthorization extends HttpSignatureAuthorization {
  keyId: DIDKeyVerificationMethodId
  signedParameters: string[]
  signature: Uint8Array
  created: UnixTimestamp
  expires?: UnixTimestamp
  constructor(options: {
    keyId: DIDKeyVerificationMethodId
    signedParameters: string[]
    signature: Uint8Array
    created: UnixTimestamp
    expires?: UnixTimestamp
  }) {
    super()
    this.keyId = options.keyId
    this.signedParameters = options.signedParameters
    this.signature = options.signature
    this.created = options.created
    this.expires = options.expires
  }
}
