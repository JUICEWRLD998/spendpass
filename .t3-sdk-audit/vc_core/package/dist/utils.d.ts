import { DIDString } from './didManager';
import { VerificationOptions } from './types';
/**
 * Retrieves the public key from a DID formatted as a "did:key" URL.
 *
 * @param {string} issuer - The issuer DID string.
 * @returns {string} The public key extracted from the DID.
 */
export declare function getPublicKeyFromDidKey(issuer: string): string;
/**
 * Retrieves the Ethereum address associated with a DID using the specified method.
 *
 * @param {DIDString} did - The decentralized identifier.
 * @param {VerificationOptions} options - Settings required for accessing different registries or providers.
 * @returns {Promise<string>} A promise that resolves to the Ethereum address associated with the DID.
 *
 * @throws {Error} If an invalid DID is provided or necessary options are missing, such as the provider or DID registry address.
 */
export declare function getEthAddressFromIdentifier(did: DIDString, options: VerificationOptions): Promise<string>;
export declare function stripHexPrefix(secretKey: string): string;
export declare function adjustIndex(index: number): number;
