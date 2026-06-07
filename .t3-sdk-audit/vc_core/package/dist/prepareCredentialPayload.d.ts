import { DID } from './didManager';
import { VerificationOptions } from './types';
import { CredentialPayload } from './types';
/**
 * Prepares the payload for a verifiable credential (VC) based on the provided parameters.
 *
 * @param {string[] | undefined} type - Additional types for the credential, excluding 'VerifiableCredential'.
 * @param {DIDWithKey} issuer - The DID of the issuer along with their public key.
 * @param {DID} user - The DID of the user who will be the subject of the credential.
 * @param {Record<string, unknown>} credentials - Additional attributes or claims to be included in the credential subject.
 * @param {Date} validFrom - The date from which the credential is valid. If undefined, it will default to the current date.
 * @param {Date} validUntil - The expiration date of the credential. If undefined, it will not set an expiration.
 * @param {VerificationOptions} [options] - Optional settings that influence additional properties like revocation.
 * @returns {Promise<CredentialPayload>} A promise that resolves to the structured credential payload ready for signing and issuance.
 *
 * The function filters out 'VerifiableCredential' from the type array to avoid duplication, then constructs the credential payload with mandatory and provided types.
 * It also conditionally includes credential status information if revocation-related options are provided.
 *
 * Every credential will have following mandatory fields based on w3c 2.0 specification
 * @context - mandatory
 * id - it is optional in w3c but mandatory in our implementation. We use random number
 * type - mandatory. It should include “VerifiableCredential” and, optionally, a more specific verifiable credential type. For example, "type": ["VerifiableCredential", "ExampleDegreeCredential"]. We will use BBS-plus-24-values-separated
 * issuer - DID of the issuer
 * validFrom - date and time in the format "2010-01-01T19:23:24Z"
 * validUntil - see above, may be empty
 * credentialStatus - we will include a URL to the revocation registry into the status
 * credentialSubject - a nested structure for schema, credentialSubject.id is mandatory which is the DID of the user
 */
export declare function prepareCredentialPayload(type: string[] | undefined, issuer: DID, user: DID, credentials: Record<string, unknown>, validFrom?: Date, validUntil?: Date, options?: VerificationOptions): Promise<CredentialPayload>;
