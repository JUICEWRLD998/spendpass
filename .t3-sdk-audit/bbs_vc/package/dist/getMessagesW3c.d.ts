import { CredentialPayload, DIDString, ProofConfig } from '@terminal3/vc_core';
import { DocumentLoader } from './localLoader';
/**
 * sign a base document (credential) with `bbs-2023` procedures. This is done by an
 * issuer and permits the recipient, the holder, the freedom to selectively disclose
 * "statements" extracted from the document to a verifier within the constraints
 * of the mandatory disclosure requirements imposed by the issuer.
 *
 * @param {Object} document - The unsigned credential
 * @param {Object} keyPair - The issuers private/public key pair
 * @param {Uint8Array} keyPair.priv - Byte array for the BLS12-381 G1 private key without multikey prefixes
 * @param {Uint8Array} keyPair.pub - Byte array for the BLS12-381 G2 public key without multikey prefixes
 * @param {Array} mandatoryPointers - An array of mandatory pointers in JSON pointer format
 * @param {Object} options - A variety of options to control signing and processing
 * @param {Object} options.proofConfig - proof configuration options without `@context`
 *  field. Optional. This will be generated with current date information and
 *  did:key verification method otherwise.
 * @param {Uint8Array} options.hmacKey - A byte array for the HMAC key. Optional. A
 *   cryptographically secure random value will be generated if not specified.
 * @param {function} options.documentLoader - A JSON-LD document loader to be
 *   passed on to JSON-LD processing functions. Optional.
 */
export declare function getMessagesW3c(document: CredentialPayload, mandatoryPointers: string[], issuer: DIDString, options: {
    proofConfig?: ProofConfig;
    hmacKey?: Uint8Array;
    documentLoader?: DocumentLoader;
}): Promise<{
    bbsHeader: Uint8Array;
    bbsMessages: Uint8Array[];
    proofConfig: ProofConfig;
    hmacKey: Uint8Array;
    mandatoryPointers: string[];
}>;
export declare function canonProof(proofConfig: ProofConfig, options: {
    documentLoader: DocumentLoader;
}): Promise<string>;
