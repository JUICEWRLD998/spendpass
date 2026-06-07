import { DID, ProofConfig } from '@terminal3/vc_core';
import { VerificationOptions } from '@terminal3/vc_core';
import { DIDWithKey } from '@terminal3/vc_core';
import { Proof } from '@terminal3/vc_core';
import { SignedCredential } from '@terminal3/vc_core';
interface ProofOptions {
    did?: string;
    hmacKey?: Uint8Array;
    proofConfig?: ProofConfig;
}
/**
 * Represents a data structure for messages used in cryptographic signing.
 *
 * @property {string} schema - The schema or path that identifies the location or the type of the data in a larger data structure.
 * @property {string} value - The actual value of the data at the schema location, used in cryptographic operations.
 */
export interface Message {
    schema: string;
    value: string;
}
/**
 * Create a credential with the specified parameters.
 * - \@context
 * @param issuer The DID and keys of the issuer.
 * @param user The DID of the user.
 * @param credentials Additional credential data.
 * @param type Array of credential types.
 * @param validFrom Start date of the credential.
 * @param validUntil Expiration date of the credential.
 * @param options Verification options.
 * @param proofFunction A function that generates a proof for the credential.
 * @returns A promise that resolves to the signed credential.
 */
export declare function createBbsCredential(issuer: DIDWithKey, user: DID, credentials: Record<string, unknown>, type?: string[], validFrom?: Date, validUntil?: Date, options?: VerificationOptions, proofFunction?: (privateKey: string, publicKey: string, messages: Uint8Array[], mandatorySet: Set<string>, options: ProofOptions) => Promise<Proof>, w3cBbs?: boolean): Promise<SignedCredential>;
/**
 * Creates a BBS+ proof for a set of messages using the provided private key and public key.
 *
 * @param {string} privateKey - The private key used for signing the messages.
 * @param {string} publicKey - The corresponding public key associated with the private key.
 * @param {string} did - The decentralized identifier (DID) of the signer.
 * @param {string[]} messages - The array of messages to be included in the proof.
 * @param {Set<string>} mandatorySet - A set of mandatory pointers that must be included in the proof.
 * @returns {Promise<Proof>} A promise that resolves to the generated BBS+ proof.
 *
 * The function signs the messages using the BLS signature algorithm and constructs a proof object with the necessary metadata,
 * including the type, proof purpose, verification method, creation date, and mandatory pointers.
 */
export declare function makeBBSPlusProof(privateKey: string, publicKey: string, messages: Uint8Array[], mandatorySet: Set<string>, options: ProofOptions): Promise<Proof>;
export declare function makeBBSPlusW3cProof(privateKey: string, publicKey: string, messages: Uint8Array[], mandatorySet: Set<string>, options: ProofOptions): Promise<Proof>;
export declare function blsSignMessages(privateKey: string, publicKey: string, messages: Uint8Array[]): Promise<string>;
/**
 * Extracts and processes messages from the given data based on specified mandatory fields.
 * This is used for preparing messages for BBS+ signatures.
 *
 * @param {Object} data - The complete data structure from which messages are to be extracted.
 * @param {string[]} mandatory - An array of strings that specify the paths (schemas) that are considered mandatory for inlusion in VP.
 * All the messages at these paths will be included in a single hash and go into header of the IETF BBS+ signature function
 * @returns {{ messages: string[], mandatorySet: Set<string> }} - An object containing:
 *           - messages: an array of strings, where the first element is a hash of all mandatory messages combined, followed by other messages.
 *           - mandatorySet: a set of strings representing all the paths that were identified as mandatory and included in the hash.
 */
export declare function getMessages(data: unknown, mandatory: string[]): string[];
/**
 * Traverses a data object, extracting data as messages and grouping them into mandatory and non-mandatory categories based on specified paths.
 * This function also ensures that all specified mandatory fields are covered in the data provided.
 *
 * @param {string[]} mandatory - An array of strings that specify the paths (schemas) considered mandatory for cryptographic operations.
 * @param {Object} data - The complete data structure from which messages are to be extracted.
 * @returns {{
 *   mandatoryMessages: Message[];
 *   messages: Message[];
 *   mandatorySet: Set<string>;
 * }} - An object containing:
 *   - mandatoryMessages: an array of Message objects that are extracted from paths specified as mandatory.
 *   - messages: an array of Message objects extracted from other parts of the data.
 *   - mandatorySet: a set of strings representing the unique paths that were identified as mandatory.
 * @throws {Error} - Throws an error if any mandatory fields specified are not covered in the data object.
 */
export declare function getGroupedMessages(mandatory: string[], data: unknown): {
    mandatoryMessages: Message[];
    messages: Message[];
    mandatorySet: Set<string>;
};
/**
 * Removes duplicate entries from an array of strings based on prefix comparison, ensuring that each prefix is unique.
 * This is useful for condensing a list of paths where some paths may be prefixes of others.
 *
 * @param {string[]} paths - An array of strings, typically paths, that may contain duplicates or nested paths.
 * @returns {Set<string>} - A set containing unique paths, each representing a unique prefix.
 */
export declare function removeDuplicates(paths: string[]): Set<string>;
/**
 * Constructs a list of mandatory pointers for a verification process by combining a predefined list of always mandatory fields with optional additional fields specified in the options.
 *
 * @param {VerificationOptions | undefined} options - Optional parameters that may contain an array of additional mandatory pointers.
 * @returns {string[]} - An array of strings that includes all mandatory pointers needed for the verification process.
 */
export declare function getMandatoryPointers(options: VerificationOptions | undefined): string[];
export declare function encodeCbor(bbsSignature: string, bbsHeader: Uint8Array, publicKey: string, hmacKey: string, mandatoryPointers: string[]): Promise<Buffer>;
export declare function decodeCbor(cborThing: Buffer): {
    bbsSignature: string;
    bbsHeader: string;
    publicKey: string;
    hmacKey: string;
    mandatoryPointers: string[];
};
export {};
