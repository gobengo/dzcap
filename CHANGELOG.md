# dzcap

## 1.5.1

### Patch Changes

- Use @digitalbazaar/http-signature-zcap-invoke and @digitalbazaar/http-signature-zcap-verify from digitalbazaar, not a custom fork, now that there are new releases including the same commits

## 1.5.0

### Minor Changes

- 0509a4d: verifyCapabilityInvocation takes options.trustHeaderXForwardedProto. When true, and the request has a x-forwarded-proto header, the effective invocationTarget will use the URI scheme from x-forwarded-proto header. This improves the ability to use this function to verify capability invocations whose request url protocol is http, but only because the request is from an intermediary reverse proxy that is terminating HTTPS, so there is also an `x-forwarded-proto: https` header added by the reverse proxy.
- 0509a4d: ZcapInvocationRequest#verified accepts options.trustHeaderXForwardedProto

## 1.4.0

### Minor Changes

- 9815841: zcap verification used to accept only https URIs as invocationTarget. Now it should allow pretty much any URI.

## 1.3.1

### Patch Changes

- Fix borked 1.3.0 due to unbuilt ts. Don't use 1.3.0. Use 1.3.1 and up. Sorry.

## 1.3.0

### Minor Changes

- 5e60660: invoking requests with options.body blob of all kinds now properly signs over the digest of the body bytes. If body has a type, it will also sign over content-type header.

## 1.2.0

### Minor Changes

- change --allow to --allowedAction

## 1.1.0

### Minor Changes

- dzcap delegate now accepts cli flag --allow that adds to allowedAction in the output
