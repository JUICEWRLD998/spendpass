import { VerificationOptions } from '@terminal3/vc_core';
import { DIDString } from '@terminal3/vc_core';
/**
 * Revokes a verifiable credential (VC) on the blockchain using the issuer's identification and credentials.
 *
 * @param {string} vcId - The ID of the verifiable credential to be revoked.
 * @param {DIDString} issuer - The decentralized identifier (DID) of the issuer of the VC.
 * @param {string} privateKey - The private key of the issuer used to authenticate the revocation transaction.
 * @param {VerificationOptions} options - Configuration options including the blockchain provider and revocation registry address.
 * @returns {Promise<void>} A promise that resolves when the transaction is successfully committed to the blockchain.
 *
 * @throws {Error} If the required revocation registry address or provider are not provided in the options.
 * @throws {Error} If the Ethereum address derived from the DID does not match the address derived from the private key.
 */
export declare function revokeVC(vcId: string, issuer: DIDString, privateKey: string, options: VerificationOptions): Promise<void>;
/**
 * Checks if a verifiable credential has been revoked.
 * @param {string} vcId - id of the the VC to check
 * @param {DIDString} issuer - did of the issuer of the VC
 * @param {VerificationOptions} options - Settings required for accessing the revocation registry.
 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether the credential is revoked.
 * @throws {Error} If the revocation registry address or provider is not set in the options.
 */
export declare function isRevoked(vcId: string, issuer: DIDString, options: VerificationOptions): Promise<boolean>;
