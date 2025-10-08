---
"dzcap": minor
---

verifyCapabilityInvocation takes options.trustHeaderXForwardedProto. When true, and the request has a x-forwarded-proto header, the effective invocationTarget will use the URI scheme from x-forwarded-proto header. This improves the ability to use this function to verify capability invocations whose request url protocol is http, but only because the request is from an intermediary reverse proxy that is terminating HTTPS, so there is also an `x-forwarded-proto: https` header added by the reverse proxy.
