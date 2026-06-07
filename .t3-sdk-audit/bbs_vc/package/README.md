# DID and Verifiable Credential SDK

This SDK enables the management of Decentralized Identifiers (DIDs) and Verifiable Credentials (VCs). It supports creating, verifying.

Supported signatures:

- BBS+

## Installation

To install the SDK, use yarn:

```bash
yarn install
```

## Functions

The SDK exposes following functions:

- `bbsDidFromPublicKey`: Creates a DID from a BBS+ public key.
- `blsG2PublicKeyFromPrivateKey`: Retrieves the BBS+ public key from a BBS+ private key.
- `createBbsCredential`: Creates a BBS+ credential with the specified parameters.
- `makeBBSPlusProof`: Creates a BBS+ proof for a set of messages using the provided private key and public key. The function signs the messages using the BLS signature algorithm and constructs a proof object with the necessary metadata, including the type, proof purpose, verification method, creation date, and mandatory pointers.
- `makeBBSPlusW3cProof`: Creates a BBS+ proof for a set of messages using the provided private key and public key. It exactly follows the [W3C specification for VCs with BBS+ signatures](https://www.w3.org/TR/vc-di-bbs/). Which means RDF Canonicalization is used to create the messages, the mandatory messages and the proof config are hashed and included in the header of the BBS+ signature. The proof value contains additional cbor encoded metadata, like mandatory pointers...
- `blsSignMessages`: Signs the provided messages using the [BBS signature algorithm](https://datatracker.ietf.org/doc/draft-irtf-cfrg-bbs-signatures/) and returns the signature. There is currently a difference with the IETF BBS signature standard: the header message is included as message 0 in the signature.
- `getMessages`: Extracts and processes messages from the given data based on specified mandatory fields. This is used for preparing messages for BBS+ signatures.
- `getGroupedMessages`: Traverses a data object, extracting data as messages and grouping them into mandatory and non-mandatory categories based on specified paths. This function also ensures that all specified mandatory fields are covered in the data provided.

## Usage

Below is an example on how to issue, verify, and optionally revoke a verifiable credential using the BBS+ signature scheme.

### Example: Issue and Verify a Verifiable Credential

```typescript
import { BbsDID, createBbsCredential, verifyBbsVc } from '@terminal3/bbc_vc';

// Issuer's private key and setup
const issuerPrivateKey = 'private_key_here';
const issuer = new BbsDID(privateKey);

// Holder's DID
const holderDid = 'did:example:b34ca6cd37bbf23';

// Creating a credential with BBS+ signature
const claims = { kyc: 'passed' };
const revocationRegistryAddress = '0x77Fb69B24e4C659CE03fB129c19Ad591374C349e';
const didRegistryAddress = '0x312C15922c22B60f5557bAa1A85F2CdA4891C39a';
const provider = new ethers.JsonRpcProvider(process.env.TEST_BLOCKCHAIN_URL);
const options = {
  revocationRegistryAddress,
  provider,
  didRegistryAddress,
} as VerificationOptions;
const credential = await createBbsCredential(
  bbsIssuer,
  userDid,
  cred_subject,
  ['KycCredential'], // type
  undefined, // valid from
  undefined, // valid until
  options,
);
console.log('Credential Issued:', credential);

// Verifying the credential
const verificationResult = await verifyBbsVC(credential);
console.log('Verification Result:', verificationResult);
```
