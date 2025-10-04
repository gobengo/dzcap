# dzcap

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
