import { SignedCredential, VerificationResult } from '@terminal3/vc_core';
import { VerificationOptions } from '@terminal3/vc_core';
/**
 * Verifies a verifiable credential using BBS+ signatures.
 *
 * @param {CredentialPayload} data - The payload of the verifiable credential.
 * @param {string} signature - The BBS+ signature in string format.
 * @param {string[]} mandatory - Array of mandatory message pointers used in the credential.
 * @param {VerificationOptions} [options] - Optional settings for the verification process.
 * @returns {Promise<VerificationResult>} A promise that resolves to the result of the verification, including validity and messages.
 *
 * @throws {Error} If the credential issuer is undefined or necessary options are missing, such as the provider.
 */
export declare function verifyBbsVc(vc: SignedCredential, options?: VerificationOptions): Promise<VerificationResult>;
/**
 * verify a signed selective disclosure base document (credential) with `bbs-2023`
 * procedures. This is can be done by an holder on receipt of the credential.
 *
 * @param {Object} vc - The signed `bbs-2023` base credential
 
 */
export declare function verifyBbsVCW3c(vc: SignedCredential): Promise<VerificationResult>;
