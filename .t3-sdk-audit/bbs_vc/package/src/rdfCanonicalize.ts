import crypto from 'crypto';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { CredentialPayload } from '@terminal3/vc_core';
import jsonld, { ContextDefinition, JsonLdDocument } from 'jsonld';
import base64url from 'base64url';
import { Options } from 'jsonld';
import { klona } from 'klona';
import { v4 as uuidv4 } from 'uuid';
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

type ExpandedObject = Record<string, ExpandedItem[]> &
  Partial<ExpandedId> &
  Partial<ExpandedType>;

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
export async function canonicalizeAndGroup(
  document: CredentialPayload,
  labelMapFactoryFunction: (
    canonicalIdMap: Map<string, string>,
  ) => Map<string, string>,
  groupDefinitions: Record<string, string[]>,
  options: Options,
): Promise<CanonGroups> {
  const expanded = await jsonld.expand(
    document as JsonLdDocument,
    {
      // TODO: true
      safe: true,
      documentLoader: options.documentLoader,
    } as Options.Expand,
  );
  const skolemized = {} as Skolemized;
  skolemized.expanded = skolemizeExpandedJsonLd(expanded as Expanded, {
    bnPrefix: 'urn:bnid:',
  });
  if (!document['@context']) {
    throw new Error('Document must have a context');
  }
  skolemized.compact = await jsonld.compact(
    skolemized.expanded as JsonLdDocument,
    document['@context'] as unknown as ContextDefinition,
    {
      // TODO: true
      safe: true,
      documentLoader: options.documentLoader,
    } as Options.Compact,
  );
  /*
    Initialize deskolemizedNQuads to the result of the algorithm in Section 3.3.9 toDeskolemizedNQuads,
    passing skolemizedExpandedDocument and any custom options.
    */
  // Convert skolemized doc to RDF to produce skolemized N-Quads.
  const deskolemizedNQuads = await toDeskolemizedNQuads(
    skolemized.expanded as JsonLdDocument,
    options,
  );
  /*
    Initialize nquads and labelMap to their associated values in the result of the algorithm in
    Section 3.3.1 labelReplacementCanonicalizeNQuads, passing labelMapFactoryFunction, deskolemizedNQuads
    as nquads, and any custom options.
  
    Run the RDF Dataset Canonicalization Algorithm [RDF-CANON] on the joined nquads, passing any custom
    options, and as output, get the canonicalized dataset, which includes a canonical bnode
    identifier map, canonicalIdMap.
    */
  const canonicalIdMap = new Map();
  const canonicalNQuads = await jsonld.normalize(
    deskolemizedNQuads.join('') as JsonLdDocument,
    {
      algorithm: 'URDNA2015',
      format: 'application/n-quads',
      safe: true,
      inputFormat: 'application/n-quads',
      documentLoader: options.documentLoader,
      canonicalIdMap,
    } as Options.Normalize,
  );
  // --Start Debugging--
  // const documentCanon = canonicalNQuads.split('\n').slice(0, -1).map(q => q + '\n') // array
  // await writeFile('../examples/output/addBaseDocCanon.json', JSON.stringify(documentCanon, null, 2))
  // --End Debugging--
  // **Missing step from  specification**? No, issue with current JSON-LD library...
  // ensure labels in map do not include `_:` prefix
  const canonicalIdMapStripped = stripBlankNodePrefixes(
    canonicalIdMap as Map<string, string>,
  );
  // Pass canonicalIdMap to labelMapFactoryFunction to produce a new bnode identifier map, labelMap.
  const labelMap = labelMapFactoryFunction(
    canonicalIdMapStripped as Map<string, string>,
  );
  // Use the canonicalized dataset and labelMap to produce the canonical N-Quads representation as
  // an array of N-Quad strings, canonicalNQuads.
  /* Notes: The above canonicalNQuads use blank node ids like "_:c14n0", the canonicalIdMap maps from
      the skolemized ids to these canonical ids, e.g., "_:_88c1eab3-9bfe-49e8-b5c5-7417311ef33a_0" ->  "_:c14n0"
      The labelMap computed with HMAC maps from the skolemized ids to the HMAC ids, e.g.,
      "_88c1eab3-9bfe-49e8-b5c5-7417311ef33a_0" -> "_:u4YIOZn1MHES1Z4Ij2hWZG3R4dEYBqg5fHTyDEvYhC38"
      The test vectors show replacing "_:c14n0" with "_:u4YIOZn1MHES1Z4Ij2hWZG3R4dEYBqg5fHTyDEvYhC38
    */
  // Create map from "_:c14nX" to replacement labels
  const c14nMap = new Map();
  canonicalIdMap.forEach((c14Value: string, key: string) => {
    const skolId = key.slice(2); // remove the "_:"
    c14nMap.set(c14Value, labelMap.get(skolId));
  });
  // --Start Debugging--
  // console.log('canonAndGroup c14n map:')
  // await writeFile('../examples/output/c14nMap.json', JSON.stringify(c14nMap, replacerMap, 2))
  // --End Debugging--
  // Replace all "_:c14nX" labels with mapped stuff
  let nquads = canonicalNQuads;
  c14nMap.forEach((value, key) => {
    const searchStr = new RegExp(key + ' ', 'g');
    nquads = nquads.replace(searchStr, '_:' + value + ' ');
  });
  // break into array, sort, and add back the CR
  const nquads_arr = nquads
    .split('\n')
    .slice(0, -1)
    .sort()
    .map((s) => s + '\n');
  // --Start Debugging--
  // await writeFile('../examples/output/processedQuads.json', JSON.stringify(nquads, null, 2))
  // --End Debugging--
  // Initialize selections to a new map.
  const selections = new Map();
  /* For each key (name) and value (pointers) entry in groupDefinitions:
      Add an entry with a key of name and a value that is the result of the algorithm in Section 3.3.15
      selectCanonicalNQuads, passing pointers, labelMap, skolemizedCompactDocument as document,
      and any custom options.
    */
  // console.log(groupDefinitions)
  for (const name in groupDefinitions) {
    const pointers = groupDefinitions[name];
    const selectTemp = await selectCanonicalNQuads(
      pointers,
      skolemized.compact,
      labelMap,
      options,
    );
    selections.set(name, selectTemp);
  }
  const groups = {} as Groups;
  /* For each key (name) and value (selectionResult) entry in selections:
        Initialize matching to an empty map.
        Initialize nonMatching to an empty map.
        Initialize selectedNQuads to nquads from selectionResult.
        Initialize selectedDeskolemizedNQuads from deskolemizedNQuads from selectionResult.
        For each element (nq) and index (index) in nquads:
            Create a map entry, entry, with a key of index and a value of nq.
            If selectedNQuads includes nq then add entry to matching; otherwise, add entry to nonMatching.
        Set name in groups to an object containing matching, nonMatching, and selectedDeskolemizedNQuads as deskolemizedNQuads.
    */
  selections.forEach(
    (
      selectionResult: { nquads: string[]; deskolemizedNQuads: string[] },
      name: string,
    ) => {
      const matching = new Map();
      const nonMatching = new Map();
      const selectedNQuads = selectionResult.nquads;
      const selectedDeskolemizedNQuads = selectionResult.deskolemizedNQuads;
      nquads_arr.forEach((nq, index) => {
        if (selectedNQuads.includes(nq)) {
          matching.set(index, nq);
        } else {
          nonMatching.set(index, nq);
        }
        groups[name] = {
          matching: matching as Map<number, string>,
          nonMatching: nonMatching as Map<number, string>,
          deskolemizedNQuads: selectedDeskolemizedNQuads,
        };
      });
    },
  );
  // Temporary
  return {
    skolemized,
    deskolemizedNQuads,
    nquads: nquads_arr,
    labelMap,
    groups,
  };
}

// Helper function for use with implementations do not do strip `_:` prefixes
export function stripBlankNodePrefixes(map: Map<string, string>) {
  let checked = false;
  const stripped = new Map();
  for (const [key, value] of map) {
    if (!checked) {
      checked = true;
      if (!key.startsWith('_:')) {
        return map;
      }
    }
    stripped.set(key.slice(2), value.slice(2));
  }
  return stripped;
}

/**
 * The following algorithm selects a portion of a skolemized compact JSON-LD document
 * using an array of JSON Pointers, and outputs the resulting canonical N-Quads with any
 * blank node labels replaced using the given label map
 * @param {Array} pointers - an array of JSON Pointers
 * @param {Object} skolemizedCompactDocument - a skolemized compact JSON-LD document
 * @param {Map} labelMap - a blank node label map
 * @param {*} options
 * @param {function} options.documentLoader - A JSON-LD document loader to be
 *   passed on to JSON-LD processing functions. Optional.
 * @returns  An object containing the new JSON-LD document that represents a selection of
 * the original JSON-LD document (selectionDocument), an array of deskolemized N-Quad strings
 * (deskolemizedNQuads), and an array of canonical N-Quads with replacement blank node
 * labels (nquads).
 */
async function selectCanonicalNQuads(
  pointers: string[],
  skolemizedCompactDocument: object,
  labelMap: Map<string, string>,
  options: Options,
) {
  // Initialize selectionDocument to the result of the algorithm in Section 3.3.13 selectJsonLd,
  // passing pointers, and skolemizedCompactDocument as document.
  const selectionDocument = selectJsonLd(skolemizedCompactDocument, pointers);
  // Initialize deskolemizedNQuads to the result of the algorithm in Section 3.3.9 toDeskolemizedNQuads,
  // passing selectionDocument as skolemizedCompactDocument, and any custom options.
  const deskolemizedNQuads = await toDeskolemizedNQuads(
    selectionDocument,
    options,
  );
  // Initialize nquads to the result of the algorithm in Section 3.3.14 relabelBlankNodes,
  // passing labelMap, and deskolemizedNQuads as nquads.
  const nquads = relabelBlankNodes(deskolemizedNQuads, labelMap);
  // Return an object containing selectionDocument, deskolemizedNQuads, and nquads.
  return { selectionDocument, deskolemizedNQuads, nquads };
}
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
export function selectJsonLd(
  document: JsonLdDocument,

  pointers: string[],
): JsonLdDocument {
  if (pointers.length === 0) {
    // Nothing selected
    return {};
  }
  const arrays: JsonLdValue[][] = [];
  const selectionDocument = createInitialSelection(
    document as {
      id?: string;
      type?: string;
    },
  );
  selectionDocument['@context'] = klona(
    (document as { '@context': string[] })['@context'],
  );
  pointers.forEach((pointer) => {
    const paths = jsonPointerToPaths(pointer);
    // Use the algorithm selectPaths, passing document, paths, selectionDocument, and arrays.
    selectPaths(paths, document, selectionDocument, arrays);
  });
  // For each array in arrays: Make array dense by removing any undefined elements
  // between elements that are defined.
  for (const array of arrays) {
    let i = 0;
    while (i < array.length) {
      if (array[i] === undefined) {
        array.splice(i, 1); // Removes 1 element at position i
        continue; // Don't increment i yet, array length has changed
      }
      i++;
    }
  }
  return selectionDocument;
}

/**
 * Replaces all blank node identifiers in an expanded JSON-LD document with custom-scheme
 * URNs. Nodes without and id or blank node identifier will be assigned one.
 * @param {Array} expanded - an expanded JSON-LD array/object
 * @param {Object} options - options to control the blank node labels assigned
 * @param {Object} options.bnPrefix - a custom blank node prefix
 * @param {Object} options.randString - a UUID string or other comparably random string
 * @param {Object} options.count - blank node id counter
 */
export function skolemizeExpandedJsonLd(
  expanded: Expanded,
  options: { bnPrefix?: string; randString?: string; count?: number } = {},
): Expanded {
  // Set up options
  if (options.bnPrefix === undefined) {
    options.bnPrefix = 'urn:bnid:';
  }
  if (options.randString === undefined) {
    options.randString = uuidv4();
  }
  if (options.count === undefined) {
    options.count = 0;
  }
  const skolemizedExpandedDocument: Expanded = [];
  expanded.forEach((element) => {
    // If either element is not an object or it contains the key @value, append a copy of element
    // to skolemizedExpandedDocument and continue to the next element.
    // if (element === null) {
    //   throw new Error('element must not be null');
    // }
    if (
      typeof element !== 'object' ||
      (element as ExpandedValue)['@value'] !== undefined
    ) {
      skolemizedExpandedDocument.push(klona(element));
    } else {
      // Otherwise, initialize skolemizedNode to an object, and for each property and
      // value in element:
      //   If value is an array, set the value of property in skolemizedNode to the
      //   result of calling this algorithm recursively passing value for expanded and
      //   keeping the other parameters the same.
      //   Otherwise, set the value of property in skolemizedNode to the first element
      //   in the array result of calling this algorithm recursively passing an array with
      //   value as its only element for expanded and keeping the other parameters the same.
      const skolemizedNode = {} as ExpandedObject;
      for (const prop in element) {
        const value = (element as ExpandedObject)[prop];
        if (Array.isArray(value)) {
          skolemizedNode[prop] = skolemizeExpandedJsonLd(value, options);
        } else {
          skolemizedNode[prop] = skolemizeExpandedJsonLd(
            [value],
            options,
          )[0] as unknown as ExpandedItem[];
        }
      }
      // If skolemizedNode has no @id property, set the value of the @id property in skolemizedNode
      // to the concatenation of bnPrefix, "_", random, "_" and the value of count, incrementing
      // the value of count afterwards.
      if (skolemizedNode['@id'] === undefined) {
        skolemizedNode['@id'] =
          options.bnPrefix + '_' + options.randString + '_' + options.count;
        if (options.count === undefined) {
          throw new Error('count must be defined');
        }
        options.count++;
      } else if (skolemizedNode['@id'].startsWith('_:')) {
        // Otherwise, if the value of the @id property in skolemizedNode starts with "_:",
        // preserve the existing blank node identifier when skolemizing by setting the value
        // of the @id property in skolemizedNode to the concatenation of bnPrefix,
        // and the existing value of the @id property.
        skolemizedNode['@id'] = options.bnPrefix + '_' + skolemizedNode['@id'];
      }
      // Append skolemizedNode to skolemizedExpandedDocument.
      skolemizedExpandedDocument.push(skolemizedNode);
    }
  });
  return skolemizedExpandedDocument;
}

// helper function
async function toDeskolemizedNQuads(
  skolemized: jsonld.JsonLdDocument,
  options: {
    documentLoader?: DocumentLoader;
  },
) {
  // Convert skolemized doc to RDF to produce skolemized N-Quads.
  const rdfOptions = {
    // TODO: true
    safe: true,
    ...options,
    format: 'application/n-quads',
  };
  let rdf: object | string; // silly declaration because RdfOrString type is not exported in the jsonld lib
  if (Object.keys(skolemized).length === 0) {
    rdf = '';
  } else {
    rdf = await jsonld.toRDF(skolemized, rdfOptions as Options.ToRdf);
  }
  // Split N-Quads into arrays for deskolemization.
  if (!(typeof rdf === 'string')) {
    throw new Error('Expected RDF to be a string');
  }
  const skolemizedNQuadArray = rdf
    .split('\n')
    .slice(0, -1)
    .map((nq) => nq + '\n');
  // deskolemize
  const deskolemizedNQuads = [];
  for (const nq of skolemizedNQuadArray) {
    if (!nq.includes('<urn:bnid:')) {
      deskolemizedNQuads.push(nq);
    } else {
      deskolemizedNQuads.push(nq.replace(/(<urn:bnid:([^>]+)>)/g, '_:$2'));
    }
  }
  return deskolemizedNQuads;
}

// Helper function for relabeling
export function relabelBlankNodes(
  nquads: string[],
  labelMap: Map<string, string>,
) {
  // m and s1 are not used so correct
  const replacer = (_m: string, _s1: string, label: string) =>
    '_:' + labelMap.get(label);

  return nquads.map((e) => e.replace(/(_:([^\s]+))/g, replacer));
}

/**
 * Helper function for selectJsonLd
 * @param {Object} source - a JSON-LD object
 */
function createInitialSelection(source: { id?: string; type?: string }): {
  '@context'?: string[];
  id?: string;
  type?: string;
} {
  const selection = {} as {
    '@context'?: string[];
    id?: string;
    type?: string;
  };

  if (source.id && !source.id.startsWith('_:')) {
    selection.id = source.id;
  }
  if (source.type !== undefined) {
    selection.type = source.type;
  }
  return selection;
}

/**
 * Helper function for selectionJsonLd.  Converts a JSON Pointer into an array
 * of paths in a JSON tree.
 * @param {String} pointer - a JSON pointer string per RFC6901
 * @returns {Array} paths
 */
export function jsonPointerToPaths(pointer: string): (string | number)[] {
  // Exported for testing
  const validEscapes = ['~0', '~1'];
  const paths: (string | number)[] = [];
  const splitPath = pointer.split('/').slice(1);
  splitPath.forEach((path) => {
    if (!path.includes('~')) {
      const num = parseInt(path); // check for integer
      if (isNaN(num)) {
        paths.push(path);
      } else {
        paths.push(num);
      }
    } else {
      // valid escape check
      const escapes = path.match(/~./g); // should produce array with '~0' and '~1' only otherwise error
      if (escapes === null) {
        throw new Error(`Invalid JSON Pointer escape sequence: ${path}`);
      }
      escapes.forEach((seq) => {
        if (!validEscapes.includes(seq)) {
          throw new Error(`Invalid JSON Pointer escape sequence: ${seq}`);
        }
      });
      let unescaped = path;
      if (unescaped.includes('~0')) {
        // '~0' unescapes to '~'
        unescaped = unescaped.replace(/~0/g, '~');
      }
      if (unescaped.includes('~1')) {
        // '~1' unescapes to '/'
        unescaped = unescaped.replace(/~1/g, '/');
      }
      paths.push(unescaped);
    }
  });
  return paths;
}

/**
 * Represents a value in a JSON-LD document.
 */
type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdDocument
  | JsonLdValue[];

/**
 * Selects a portion of a compact JSON-LD document using paths parsed from a parsed JSON
 * Pointer. This is a helper function used within the algorithm selectJsonLd.
 * @param {string[]} paths - array of paths parsed from a JSON pointer
 * @param {JsonLdDocument} document - a compact JSON-LD document
 * @param {JsonLdDocument} selectionDocument - a selection document to be populated
 * @param {JsonLdValue[][]} arrays - an array of arrays for tracking selected arrays
 */
function selectPaths(
  paths: (string | number)[],
  document: JsonLdDocument,
  selectionDocument: JsonLdDocument,
  arrays: JsonLdValue[][],
): void {
  // 1. Initialize parentValue to document.
  let parentValue: JsonLdDocument = document;
  // 2. Initialize value to parentValue.
  let value: JsonLdValue = parentValue;
  // 3. Initialize selectedParent to selectionDocument.
  let selectedParent: JsonLdDocument = selectionDocument;
  // 4. Initialize selectedValue to selectedParent.
  let selectedValue: JsonLdValue = selectedParent;

  // 5. For each path in paths:
  for (const path of paths) {
    // 1. Set selectedParent to selectedValue.
    selectedParent = selectedValue as JsonLdDocument;
    // 2. Set parentValue to value.
    parentValue = value as JsonLdDocument;
    // 3. Set value to parentValue[path]. If value is now undefined, throw an error indicating
    //    that the JSON pointer does not match the given document.
    value = (parentValue as Record<string, string>)[path];
    if (value === undefined) {
      throw new Error('JSON pointer does not match the given document');
    }
    // 4. Set selectedValue to selectedParent[path].
    selectedValue = (selectedParent as Record<string, string>)[path];
    // 5. If selectedValue is now undefined:
    if (selectedValue === undefined) {
      // 1. If value is an array, set selectedValue to an empty array and append
      //    selectedValue to arrays.
      if (Array.isArray(value)) {
        selectedValue = [];
        arrays.push(selectedValue);
      } else {
        // 2. Otherwise, set selectedValue to an initial selection passing value as
        // source to the algorithm in createInitialSelection.
        selectedValue = createInitialSelection(
          value as { id?: string; type?: string },
        );
      }
      // 3. Set selectedParent[path] to selectedValue.
      (selectedParent as Record<string, JsonLdValue>)[path] = selectedValue;
    }
  }

  // 6. Note: With path traversal complete at the target value, the selected value will now be computed.
  // 7. If value is a literal, set selectedValue to value.
  if (typeof value !== 'object' || value === null) {
    // literal
    selectedValue = value;
  } else {
    // 8. If value is an array, Set selectedValue to a copy of value.
    if (Array.isArray(value)) {
      selectedValue = klona(value);
    } else {
      // 9. In all other cases, set selectedValue to an object that merges a shallow copy
      //  of selectedValue with a deep copy of value, e.g., {...selectedValue, …deepCopy(value)}.
      selectedValue = { ...(selectedValue as JsonLdDocument), ...klona(value) };
    }
  }

  // 10. Get the last path, lastPath, from paths.
  const lastPath = paths.at(-1);
  if (lastPath === undefined) {
    throw new Error('lastPath is undefined');
  }

  // 11. Set selectedParent[lastPath] to selectedValue.
  (selectedParent as Record<string, JsonLdValue>)[lastPath] = selectedValue;
}

/**
 * The following algorithm creates a label map factory function that uses an HMAC to shuffle
 * blank node ids. The required input is an
 * HMAC (previously initialized with a secret key), HMAC. A function, labelMapFactoryFunction,
 * is produced as output.
 * @param {Function} hmacFunc - an initialized (with key) function to compute HMACs
 * @returns a labelMapFactoryFunction
 */
export function createShuffledIdLabelMapFunction(
  hmac: (input: Uint8Array) => Uint8Array,
): (canonicalIdMap: Map<string, string>) => Map<string, string> {
  return function labelMapFactoryFunction(
    canonicalIdMap: Map<string, string>,
  ): Map<string, string> {
    const te = new TextEncoder();
    const bnodeIdMap = new Map<string, string>();

    for (const [input, c14nLabel] of canonicalIdMap) {
      const utf8Bytes = te.encode(c14nLabel);
      // console.log(`c14nLabel: ${c14nLabel}`)
      const hashed = hmac(utf8Bytes);
      // multibase prefix of `u` is important to make bnode ID syntax-legal
      // see: https://www.w3.org/TR/n-quads/#BNodes
      bnodeIdMap.set(input, `u${base64url.encode(Buffer.from(hashed))}`);
    }

    const hmacIds = [...bnodeIdMap.values()].sort();
    const bnodeKeys = [...bnodeIdMap.keys()];

    bnodeKeys.forEach((bkey) => {
      const currentValue = bnodeIdMap.get(bkey);
      if (currentValue !== undefined) {
        bnodeIdMap.set(bkey, 'b' + hmacIds.indexOf(currentValue).toString());
      }
    });

    return bnodeIdMap;
  };
}

export function createHmac(key?: Uint8Array): (input: Input) => Uint8Array {
  if (key === undefined) {
    key = randomBytes(32);
  }
  return function hmacFunc(input: Input) {
    return hmac(sha256, key, input);
  };
}

export function randomBytes(bytesLength = 32) {
  return new Uint8Array(crypto.randomBytes(bytesLength).buffer);
}
