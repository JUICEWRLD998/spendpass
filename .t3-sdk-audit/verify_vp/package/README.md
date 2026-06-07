# DID and Verifiable Credential SDK

This SDK enables the management of Decentralized Identifiers (DIDs) and Verifiable Credentials (VCs). It supports verifying Verifiable Presentations.

## Installation

To install the SDK, use yarn:

```bash
yarn install
```

## Usage

Below is an example on how to verify a Verifiable Presentation.

### Example: Issue and Verify a Verifiable Credential

```typescript
import { verifyPresentation } from '@terminal3/verify_vp';
const res = await verifyPresentation(vp);

console.log('Verification Result:', res);
```
