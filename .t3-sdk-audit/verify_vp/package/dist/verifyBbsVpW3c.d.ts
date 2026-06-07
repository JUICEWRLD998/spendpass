import { PartialCredential, VerificationResult } from '@terminal3/vc_core';
/**
 * verify a signed selective disclosure derived document (credential) with ECDSA-SD
 * procedures. This is done by a verifier on receipt of the credential.
 *
 * @param {Object} document - The signed SD derived credential
 * @param {Uint8Array} pubKey - Byte array for the issuers P256 public key without multikey prefixes
 * @param {Object} options - A variety of options to control signing and processing
 * @param {function} options.documentLoader - A JSON-LD document loader to be
 *   passed on to JSON-LD processing functions. Optional.
 * @param {Object} gens - generators object from BBS prepareGenerators of
 * sufficient size to cover the number of statements (messages) in the document.
 * @param {Uint8Array} ph - BBS presentation header
 */
export declare function verifyBbsVpW3c(vc: PartialCredential): Promise<VerificationResult>;
/**
 * The following algorithm creates a label map factory function that uses an input label map
 * to replace canonical blank node identifiers with another value.
 * @param {Map} labelMap
 * @returns A function, labelMapFactoryFunction
 */
export declare function createLabelMapFunction(labelMap: Map<number, string>): (canonicalIdMap: Map<number, number>) => Map<any, any>;
/**
 * The following algorithm canonicalizes a JSON-LD document and replaces any blank node
 * identifiers in the canonicalized result using a label map factory function,
 * labelMapFactoryFunction.
 * @param {Object} document - a JSON-LD document
 * @param {Function} labelMapFactoryFunction - a label map factory function
 * @param {Object} options
 * @param {function} options.documentLoader - A JSON-LD document loader to be
 *   passed on to JSON-LD processing functions. Optional.
 * @returns An N-Quads representation of the canonicalNQuads as an array of N-Quad strings,
 * with the replaced blank node labels, and a map from the old blank node IDs to the new blank
 * node IDs, labelMap.
 */
export declare function labelReplacementCanonicalizeJsonLd(document: object, labelMapFactoryFunction: (canonicalIdMap: Map<number, number>) => Map<number, number>): Promise<string[]>;
export declare function encodeCborProof(bbsProof: string, compressLabelMap: Map<number, number>, adjMandatoryIndexes: number[], adjSelectiveIndexes: number[]): Promise<Buffer>;
export declare function decodeCborProof(cborProof: Buffer): Promise<{
    bbsProof: Uint8Array;
    compressLabelMap: Map<number, number>;
    adjMandatoryIndexes: number[];
    adjSelectiveIndexes: number[];
}>;
