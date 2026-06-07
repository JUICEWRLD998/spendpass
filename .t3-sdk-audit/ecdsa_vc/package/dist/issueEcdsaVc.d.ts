import { DIDWithKey } from '@terminal3/vc_core';
import { DID } from '@terminal3/vc_core';
import { VerificationOptions } from '@terminal3/vc_core';
import { SignedCredential } from '@terminal3/vc_core';
import { Proof } from '@terminal3/vc_core';
import { CredentialPayload } from '@terminal3/vc_core';
/**
 * Create a credential with the specified parameters.
 * @param issuer The DID and keys of the issuer.
 * @param user The DID of the user.
 * @param credentials Additional credential data.
 * @param signatureType The type of signature to use.
 * @param type Array of credential types.
 * @param validFrom Start date of the credential.
 * @param validUntil Expiration date of the credential.
 * @param options Verification options.
 * @returns A promise that resolves to the signed credential.
 */
export declare function createEcdsaCredential(issuer: DIDWithKey, user: DID, credentials: Record<string, unknown>, type?: string[], validFrom?: Date, validUntil?: Date, options?: VerificationOptions, proofFunction?: (privateKey: string, did: string, vc: CredentialPayload, options?: VerificationOptions) => Promise<Proof>): Promise<SignedCredential>;
/**
 * Creates an ECDSA proof for a given credential payload using the provided private key.
 *
 * @param {string} privateKey - The private key used for signing the credential payload.
 * @param {string} did - The decentralized identifier (DID) of the signer.
 * @param {CredentialPayload} data - The credential payload to be signed.
 * @returns {Promise<Proof>} A promise that resolves to the generated ECDSA proof.
 *
 * The function serializes the credential payload to JSON, hashes it using Solidity's packed Keccak256 hashing function,
 * and signs the hash using the ECDSA algorithm. It then constructs a proof object with the necessary metadata,
 * including the type, proof purpose, verification method, creation date, and the signature value.
 */
export declare function makeECDSAProof(privateKey: string, did: string, data: CredentialPayload, options?: VerificationOptions): Promise<Proof>;
