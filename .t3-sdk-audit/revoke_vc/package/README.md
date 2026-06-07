# DID and Verifiable Credential SDK

This SDK enables the management of Decentralized Identifiers (DIDs) and Verifiable Credentials (VCs). It supports revoking credentials.

## Installation

To install the SDK, use yarn:

```bash
yarn install
```

## Usage

Below is an example on how to revoke a verifiable credential.

### Example: Issue and Verify a Verifiable Credential

```typescript
import { revokeVC } from '@terminal3/revoke_vc';
import { verifyBbsVC } from '@terminal3/bbs_vc';
import { VerificationOptions } from '@terminal3/vc_core';
import { JsonRpcProvider, ethers } from 'ethers';

const privateKey = '0x123123123123...'; // private key of the issuer;
const revocationRegistryAddress = '0x77Fb69B24e4C659CE03fB129c19Ad591374C349e';
// const mandatoryPointers = ["/credentialSubject/kyc"];
const didRegistryAddress = '0x312C15922c22B60f5557bAa1A85F2CdA4891C39a';
provider = new ethers.JsonRpcProvider(process.env.TEST_BLOCKCHAIN_URL);
options = {
  revocationRegistryAddress,
  provider,
  didRegistryAddress,
  // mandatoryPointers,
} as VerificationOptions;

// revoke the VC
await revokeVC(vc.id, vc.issuer, privateKey, options);

// wait for 10 seconds for the transaction to be mined onchain
await new Promise((r) => setTimeout(r, 10000));

// And check: expected failure as credential has been revoked
const verificationResult = await verifyBbsVC(credential);
console.log('Verification Result:', verificationResult);
```
