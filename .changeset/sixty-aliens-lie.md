---
"dzcap": minor
---

invoking requests with options.body blob of all kinds now properly signs over the digest of the body bytes. If body has a type, it will also sign over content-type header.
