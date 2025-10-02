# dzcap

## 1.3.0

### Minor Changes

- 5e60660: invoking requests with options.body blob of all kinds now properly signs over the digest of the body bytes. If body has a type, it will also sign over content-type header.

## 1.2.0

### Minor Changes

- change --allow to --allowedAction

## 1.1.0

### Minor Changes

- dzcap delegate now accepts cli flag --allow that adds to allowedAction in the output
