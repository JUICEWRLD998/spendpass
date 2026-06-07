import { CredentialPayload } from '@terminal3/vc_core';
import { JsonLdDocument } from 'jsonld';
import { Input } from '@noble/hashes/utils';
import { DocumentLoader } from './localLoader';
export interface Skolemized {
    compact: JsonLdDocument;
    expanded: Expanded;
}
export type Groups = Record<string, GroupMaps>;
export interface GroupMaps {
    matching: Map<number, string>;
    nonMatching: Map<number, string>;
    deskolemizedNQuads: string[];
}
export interface CanonGroups {
    skolemized: Skolemized;
    deskolemizedNQuads: string[];
    nquads: string[];
    labelMap: Map<string, string>;
    groups: Groups;
}
export interface Options {
    documentLoader?: DocumentLoader;
}
type JsonValue = string | number | boolean | null;
interface ExpandedValue {
    '@value': JsonValue;
}
interface ExpandedId {
    '@id': string;
}
interface ExpandedType {
    '@type': string[];
}
type ExpandedObject = Record<string, ExpandedItem[]> & Partial<ExpandedId> & Partial<ExpandedType>;
type ExpandedItem = ExpandedObject | ExpandedValue;
export type Expanded = ExpandedItem[];
/**
 * The following algorithm is used to output canonical N-Quad strings that match custom
 * selections of a compact JSON-LD document. It does this by canonicalizing a compact
 * JSON-LD document (replacing any blank node identifiers using a label map) and grouping
 * the resulting canonical N-Quad strings according to the selection associated with each
 * group. Each group will be defined using an assigned name and array of JSON pointers.
 * The JSON pointers will be used to select portions of the skolemized document, such
 * that the output can be converted to canonical N-Quads to perform group matching.
 * @param {Object} document - a compact JSON-LD document. The document is assumed to
 * use a JSON-LD context that aliases "@id" and "@type" to id and type, respectively,
 * and to use only one "@context" property at the top level of the document.
 * @param {Function} labelMapFactoryFunction - a function that maps blank node ids to a "urn:" scheme
 * @param {Object} groupDefinitions - a map of group names to corresponding arrays of JSON pointers
 * @param {Object} options
 * @param {function} options.documentLoader - A JSON-LD document loader to be
 *   passed on to JSON-LD processing functions. Optional.
 * @returns An object containing the created groups (groups), the skolemized compact
 * JSON-LD document (skolemizedCompactDocument), the skolemized expanded JSON-LD document
 * (skolemizedExpandedDocument), the deskolemized N-Quad strings (deskolemizedNQuads),
 * the blank node label map (labelMap), and the canonical N-Quad strings nquads.
 */
export declare function canonicalizeAndGroup(document: CredentialPayload, labelMapFactoryFunction: (canonicalIdMap: Map<string, string>) => Map<string, string>, groupDefinitions: Record<string, string[]>, options: Options): Promise<CanonGroups>;
export declare function stripBlankNodePrefixes(map: Map<string, string>): Map<any, any>;
/**
 * The following algorithm selects a portion of a compact JSON-LD document using an array
 * of JSON Pointers. The required inputs are an array of JSON Pointers (pointers) and a
 * compact JSON-LD document (document). The document is assumed to use a JSON-LD context
 * that aliases '@id' and '@type' to id and type, respectively, and to use only one '@context'
 * property at the top level of the document.
 * @param {Object} document
 * @param {Array} pointers
 * @returns A new JSON-LD document that represents a selection (selectionDocument) of the
 * original JSON-LD document is produced as output.
 */
export declare function selectJsonLd(document: JsonLdDocument, pointers: string[]): JsonLdDocument;
/**
 * Replaces all blank node identifiers in an expanded JSON-LD document with custom-scheme
 * URNs. Nodes without and id or blank node identifier will be assigned one.
 * @param {Array} expanded - an expanded JSON-LD array/object
 * @param {Object} options - options to control the blank node labels assigned
 * @param {Object} options.bnPrefix - a custom blank node prefix
 * @param {Object} options.randString - a UUID string or other comparably random string
 * @param {Object} options.count - blank node id counter
 */
export declare function skolemizeExpandedJsonLd(expanded: Expanded, options?: {
    bnPrefix?: string;
    randString?: string;
    count?: number;
}): Expanded;
export declare function relabelBlankNodes(nquads: string[], labelMap: Map<string, string>): string[];
/**
 * Helper function for selectionJsonLd.  Converts a JSON Pointer into an array
 * of paths in a JSON tree.
 * @param {String} pointer - a JSON pointer string per RFC6901
 * @returns {Array} paths
 */
export declare function jsonPointerToPaths(pointer: string): (string | number)[];
/**
 * The following algorithm creates a label map factory function that uses an HMAC to shuffle
 * blank node ids. The required input is an
 * HMAC (previously initialized with a secret key), HMAC. A function, labelMapFactoryFunction,
 * is produced as output.
 * @param {Function} hmacFunc - an initialized (with key) function to compute HMACs
 * @returns a labelMapFactoryFunction
 */
export declare function createShuffledIdLabelMapFunction(hmac: (input: Uint8Array) => Uint8Array): (canonicalIdMap: Map<string, string>) => Map<string, string>;
export declare function createHmac(key?: Uint8Array): (input: Input) => Uint8Array;
export declare function randomBytes(bytesLength?: number): Uint8Array;
export {};
