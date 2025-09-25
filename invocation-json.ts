// @ts-expect-error no types
import jsigs from "jsonld-signatures"
// @ts-expect-error no types
import { Ed25519Signature2020 } from '@digitalbazaar/ed25519-signature-2020';
// @ts-expect-error no types
import { CapabilityInvocation } from '@digitalbazaar/zcap'
import { type IDocumentLoader } from "./invocation-http-signature.ts";

/**
 * class that represents the verification of a zcap invocation as expressed in JSON-LD Signatures
 * (not invocations as http signatures).
 */
export class InvocationJsonVerification {
  // whether the invocation was successfully verified
  verified: boolean
  verificationMethod?: {
    id: string
  }
  verificationError?: Error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async from (invocation: any, options: {
    allowTargetAttenuation: boolean,
    expectedAction: string,
    expectedRootCapability: string,
    expectedTarget: string[],
    documentLoader: IDocumentLoader,
  }) {
    // verify invocation
    let verified = false
    let verificationMethod: { id: string } | undefined = undefined
    let verificationError: Error
    {
      const {
        allowTargetAttenuation,
        expectedAction,
        expectedRootCapability,
        expectedTarget,
        documentLoader,
      } = options
      const verifyResult = await jsigs.verify(invocation, {
        documentLoader,
        suite: new Ed25519Signature2020(),
        purpose: [
          new CapabilityInvocation({
            allowTargetAttenuation,
            expectedAction,
            expectedRootCapability,
            expectedTarget,
          })
        ]
      })
      verified = Boolean(verifyResult.verified)
      verificationMethod = verifyResult.verificationMethod
      verificationError = verifyResult.error
      // there is also good stuff in verifyResult.results[0].purposeResult
    }
    // create verification
    return new InvocationJsonVerification({
      verified,
      verificationMethod,
      verificationError,
    })
  }
  protected constructor(options: {
    verified: boolean
    verificationMethod?: {
      id: string
    },
    verificationError?: Error
  }) {
    this.verified = options.verified
    this.verificationMethod = options.verificationMethod
    this.verificationError = options.verificationError
  }
}
