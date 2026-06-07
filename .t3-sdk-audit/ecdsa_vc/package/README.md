# DID and Verifiable Credential SDK

This SDK enables the management of Decentralized Identifiers (DIDs) and Verifiable Credentials (VCs). It supports creating, verifying.

Supported signatures:

- ECDSA

## Installation

To install the SDK, use yarn:

```bash
yarn install
```

## Usage

Below is an example on how to issue, verify, and optionally revoke a verifiable credential using the BBS+ signature scheme.

### Example: Issue and Verify a Verifiable Credential

```javascript
import { EthrDID, createEcdsaCredential, verifyEcdsaVc} from "@terminal3/ecdsa_vc";

// Issuer's private key and setup
const issuerPrivateKey = "private_key_here";
const issuer = new EthrDID(privateKey);

// Holder's DID
const holderDid = "did:example:b34ca6cd37bbf23";

// Creating a credential with BBS+ signature
const claims = { kyc: "passed" };
const revocationRegistryAddress = "0x77Fb69B24e4C659CE03fB129c19Ad591374C349e";
const didRegistryAddress = "0x312C15922c22B60f5557bAa1A85F2CdA4891C39a";
const provider = new ethers.JsonRpcProvider(process.env.TEST_BLOCKCHAIN_URL);
const options = {
  revocationRegistryAddress,
  provider,
  didRegistryAddress,
} as VerificationOptions;
const credential = await createEcdsaCredential(issuer, holderDid, claims, ["KYCCredential"], undefined, undefined, options);
console.log("Credential Issued:", credential);

// Verifying the credential
const verificationResult = await verifyEcdsaVC(credential);
console.log("Verification Result:", verificationResult);
```
