# DID and Verifiable Credential SDK

This SDK enables the management of Decentralized Identifiers (DIDs) and Verifiable Credentials (VCs).

## Installation

To install the SDK, use yarn:

```bash
yarn install
```

## Functions

The SDK provides the following functions:

- `prepareCredentialPayload`: Prepares the payload for a verifiable credential (VC) based on the provided parameters.
- `randomKey32Bytes`: Generates a random 32-byte key.
- `getPublicKeyFromDidKey`: Retrieves the public key from a DID formatted as a "did:key" URL.
- `getAddressFromIdentifier`: Retrieves the Ethereum address associated with a DID using the specified method. This function requires the DID of the issuer to be registered in the DID registry for did:key method.

## Usage

Below is an example on how to prepare Credential payload.

### Example: Issue and Verify a Verifiable Credential

```typescript
import { prepareCredentialPayload } from '@terminal3/vc_core';
const issuer = new DID(
  'key',
  'zUC7DKqU1K98wCzNx6H3xHGoFoSYrxYZ4WmUj8UKq4HUAcA651HVrM7Qr7kgSNbnVcBSgQZQZtTMLDm2obKq2ByZDqjKowSqQzaNHgDGEox7vWRRyioRuLd1KRuhqBr4o7LkqH7',
);
const user = new DID('ethr', '0x1234567890123456789012345678901234567890');
const cred_subject = {
  kyc: 'passed',
  date_of_birth: '1990-01-01',
};
prepareCredentialPayload(
  undefined,
  issuer,
  user,
  cred_subject,
  new Date('2022-01-01'),
  new Date('2021-01-01'),
);
```
