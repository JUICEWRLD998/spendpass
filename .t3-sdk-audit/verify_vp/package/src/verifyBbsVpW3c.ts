import { concatBytes } from '@noble/hashes/utils'; // bytesToHex lives here too
import jsonld, { JsonLdDocument, Options } from 'jsonld';
import { sha256 } from '@noble/hashes/sha256';
import { klona } from 'klona';
import cbor from 'cbor';
import { DocumentLoader, localLoader } from '@terminal3/bbs_vc';
import {
  getPublicKeyFromDidKey,
  PartialCredential,
  VerificationResult,
} from '@terminal3/vc_core';
import base64url from 'base64url';
import { stripBlankNodePrefixes } from '@terminal3/bbs_vc';
import { blsVerifyProof } from '@mattrglobal/bbs-signatures';

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
export async function verifyBbsVpW3c(vc: PartialCredential) {
  const document = klona(vc);
  const proofValue = vc.proof.proofValue;
  // proof w/o proofValue
  const { proofValue: _, ...proofConfig } = vc.proof;
  proofConfig['@context'] = document['@context'];
  const { proof, ...data } = document;
  const proofCanon = await jsonld.canonize(proofConfig, {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    documentLoader: localLoader as unknown as DocumentLoader,
  });
  const proofHash = sha256(proofCanon); // @noble/hash will convert string to bytes via UTF-8
  // console.log(`Proof hash: ${bytesToHex(proofHash)}`)
  // Parse Derived ProofValue
  const decodedProofValue = base64url.toBuffer(proofValue);
  if (
    decodedProofValue[0] !== 0xd9 ||
    decodedProofValue[1] !== 0x5d ||
    decodedProofValue[2] !== 0x03
  ) {
    throw new Error('Invalid proofValue header');
  }
  const {
    bbsProof,
    compressLabelMap: labelMapCompressed,
    adjMandatoryIndexes: mandatoryIndexes,
  } = await decodeCborProof(decodedProofValue.subarray(3));
  let labelMapCompressedCopy = klona(labelMapCompressed);
  // Here
  // cbor library workaround for issue https://github.com/hildjj/node-cbor/issues/186
  if (
    !(labelMapCompressedCopy instanceof Map) &&
    Object.keys(labelMapCompressedCopy).length === 0
  ) {
    labelMapCompressedCopy = new Map();
  }
  if (!(labelMapCompressedCopy instanceof Map)) {
    throw new Error('Bad label map in proofValue');
  }
  // Modified for **BBS** labeling, just an integer
  labelMapCompressedCopy.forEach(function (value, key) {
    if (!Number.isInteger(key) || !Number.isInteger(value)) {
      throw new Error('Bad key or value in compress label map in proofValue');
    }
  });
  if (!Array.isArray(mandatoryIndexes)) {
    throw new Error('mandatory indexes is not an array in proofValue');
  }
  mandatoryIndexes.forEach((value) => {
    if (!Number.isInteger(value)) {
      throw new Error('Value in mandatory indexes  is not an integer');
    }
  });
  const labelMap = new Map();
  labelMapCompressedCopy.forEach(function (v, k) {
    const key = 'c14n' + k;
    const value = 'b' + v;
    labelMap.set(key, value);
  });

  // Initialize labelMapFactoryFunction to the result of calling the "createLabelMapFunction" algorithm.
  const labelMapFactoryFunction = createLabelMapFunction(
    labelMap as Map<number, string>,
  );
  /* Initialize nquads to the result of calling the "labelReplacementCanonicalize" algorithm, passing
    document, labelMapFactoryFunction, and any custom JSON-LD API options. Note: This step transforms
    the document into an array of canonical N-Quads with pseudorandom blank node identifiers based on
    labelMap.
  */
  const nquads = await labelReplacementCanonicalizeJsonLd(
    data,
    labelMapFactoryFunction,
  );
  const mandatory: string[] = [];
  const nonMandatory: string[] = [];
  nquads.forEach(function (value, index) {
    if (mandatoryIndexes.includes(index)) {
      mandatory.push(value);
    } else {
      nonMandatory.push(value);
    }
  });
  const mandatoryHash = sha256(mandatory.join(''));
  /* Verify BBS Proof */
  const bbsHeader = concatBytes(proofHash, mandatoryHash);
  const te = new TextEncoder();
  const bbsMessages = [...nonMandatory.values()].map((txt) => te.encode(txt)); // must be byte arrays
  if (!data.issuer) {
    throw new Error('Issuer not found in VC');
  }
  const publicKeyUint8 = Uint8Array.from(
    Buffer.from(getPublicKeyFromDidKey(data.issuer), 'hex'),
  );
  const messagesUint8 = [bbsHeader, ...bbsMessages];
  const res = await blsVerifyProof({
    proof: bbsProof,
    publicKey: publicKeyUint8,
    messages: messagesUint8,
    nonce: Uint8Array.from(Buffer.from('nonce', 'utf8')),
  });
  if (!res.verified) {
    return {
      isValid: false,
      message: `BBS+ verification failed for VC with id ${vc.id}`,
    } as VerificationResult;
  }
  return { isValid: true, message: 'BBS+ verification successful' };
}

/**
 * The following algorithm creates a label map factory function that uses an input label map
 * to replace canonical blank node identifiers with another value.
 * @param {Map} labelMap
 * @returns A function, labelMapFactoryFunction
 */
export function createLabelMapFunction(labelMap: Map<number, string>) {
  return function labelMapFactoryFunction(canonicalIdMap: Map<number, number>) {
    const bnodeIdMap = new Map();
    /* For each map entry, entry, in canonicalIdMap:
        Use the canonical identifier from the value in entry as a key in labelMap to get the new label, newLabel.
        Add a new entry, newEntry, to bnodeIdMap using the key from entry and newLabel as the value.
      */
    canonicalIdMap.forEach((value, key) => {
      const newLabel = labelMap.get(value);
      bnodeIdMap.set(key, newLabel);
    });
    return bnodeIdMap;
  };
}

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
export async function labelReplacementCanonicalizeJsonLd(
  document: object,
  labelMapFactoryFunction: (
    canonicalIdMap: Map<number, number>,
  ) => Map<number, number>,
): Promise<string[]> {
  /*
      Deserialize the JSON-LD document to RDF, rdf, using the Deserialize JSON-LD to RDF algorithm, passing
      any custom options (such as a document loader).
      Serialize rdf to an array of N-Quad strings, nquads.
      Return the result of calling the algorithm in Section 3.3.1 labelReplacementCanonicalizeNQuads,
      passing nquads, labelMapFactoryFunction, and any custom options.
    */
  const canonicalIdMap = new Map();
  const canonicalNQuads = await jsonld.normalize(
    document as JsonLdDocument,
    {
      algorithm: 'URDNA2015',
      format: 'application/n-quads',
      safe: true,
      documentLoader: localLoader,
      canonicalIdMap,
    } as unknown as Options.Normalize,
  );
  const canonicalIdMapStripped = stripBlankNodePrefixes(
    canonicalIdMap as Map<string, string>,
  );
  // Pass canonicalIdMap to labelMapFactoryFunction to produce a new bnode identifier map, labelMap.
  const labelMap = labelMapFactoryFunction(
    canonicalIdMapStripped as Map<number, number>,
  );
  // Use the canonicalized dataset and labelMap to produce the canonical N-Quads representation as
  // an array of N-Quad strings, canonicalNQuads.
  // Create map from "_:c14nX" to replacement labels
  const c14nMap = new Map();
  canonicalIdMap.forEach((c14Value: string, key: string) => {
    const skolId = key.slice(2); // remove the "_:"
    c14nMap.set(c14Value, labelMap.get(Number(skolId)));
  });
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
  return nquads_arr;
}

export async function encodeCborProof(
  bbsProof: string,
  compressLabelMap: Map<number, number>,
  adjMandatoryIndexes: number[],
  adjSelectiveIndexes: number[],
): Promise<Buffer> {
  const bbsProofBytes = Buffer.from(bbsProof, 'hex');
  const components = [
    bbsProofBytes,
    compressLabelMap,
    adjMandatoryIndexes,
    adjSelectiveIndexes,
  ];
  const cborThing = await cbor.encodeAsync(components);
  return cborThing;
}

export async function decodeCborProof(cborProof: Buffer): Promise<{
  bbsProof: Uint8Array;
  compressLabelMap: Map<number, number>;
  adjMandatoryIndexes: number[];
  adjSelectiveIndexes: number[];
}> {
  const decoded = (await cbor.decode(cborProof)) as [
    Buffer,
    Map<number, number>,
    number[],
    number[],
  ];
  const bbsProof = Uint8Array.from(decoded[0]);
  const compressLabelMap = decoded[1];
  const adjMandatoryIndexes = decoded[2];
  const adjSelectiveIndexes = decoded[3];
  return {
    bbsProof,
    compressLabelMap,
    adjMandatoryIndexes,
    adjSelectiveIndexes,
  };
}
