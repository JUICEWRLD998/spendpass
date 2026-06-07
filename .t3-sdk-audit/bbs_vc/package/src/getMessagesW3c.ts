import { concatBytes } from '@noble/hashes/utils'; // bytesToHex is in here too
import jsonld, { JsonLdDocument, Options } from 'jsonld';
import { sha256 } from '@noble/hashes/sha256';
import {
  canonicalizeAndGroup,
  createHmac,
  createShuffledIdLabelMapFunction,
  randomBytes,
} from './rdfCanonicalize';
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
export async function getMessagesW3c(
  document: CredentialPayload,
  mandatoryPointers: string[],
  issuer: DIDString,
  options: {
    proofConfig?: ProofConfig;
    hmacKey?: Uint8Array;
    documentLoader?: DocumentLoader;
  },
): Promise<{
  bbsHeader: Uint8Array;
  bbsMessages: Uint8Array[];
  proofConfig: ProofConfig;
  hmacKey: Uint8Array;
  mandatoryPointers: string[];
}> {
  // Set up proof configuration and canonize
  if (!issuer.startsWith('did:key:')) {
    throw new Error('Issuer must be a did:key DID');
  }
  let proofConfig = {} as ProofConfig;
  if (options.proofConfig !== undefined) {
    proofConfig = Object.assign({}, options.proofConfig);
  } else {
    // Create the proofConfig
    proofConfig.type = 'DataIntegrityProof';
    proofConfig.cryptosuite = 'bbs-2023';
    const nd = new Date();
    proofConfig.created = nd.toISOString();
    proofConfig.verificationMethod = issuer;
    proofConfig.proofPurpose = 'assertionMethod';
  }
  proofConfig['@context'] = document['@context'];
  if (!options.documentLoader) {
    throw new Error('Document loader is required');
  }
  const proofCanon = await canonProof(proofConfig, {
    documentLoader: options.documentLoader,
  });

  // Check for HMAC key and generate if not present
  let hmacKey;
  if (options.hmacKey !== undefined) {
    hmacKey = options.hmacKey;
  } else {
    hmacKey = randomBytes(32);
  }
  // **Transformation Step**
  const hmacFunc = createHmac(hmacKey);
  const labelMapFactoryFunction = createShuffledIdLabelMapFunction(hmacFunc);
  const groups = { mandatory: mandatoryPointers };
  const stuff = await canonicalizeAndGroup(
    document,
    labelMapFactoryFunction,
    groups,
    { documentLoader: options.documentLoader },
  );
  const mandatory = stuff.groups.mandatory.matching;
  const nonMandatory = stuff.groups.mandatory.nonMatching;
  // **Hashing Step**
  const proofHash = sha256(proofCanon); // @noble/hash will convert string to bytes via UTF-8
  // console.log(`Proof hash: ${bytesToHex(proofHash)}`)
  const mandatoryHash = sha256([...mandatory.values()].join(''));
  // console.log(`Mandatory hash: ${bytesToHex(mandatoryHash)}`)
  /* Create BBS signature */
  const bbsHeader = concatBytes(proofHash, mandatoryHash);
  const te = new TextEncoder();
  const bbsMessages = [...nonMandatory.values()].map((txt) => te.encode(txt)); // must be byte arrays
  return {
    bbsHeader,
    bbsMessages,
    proofConfig,
    hmacKey,
    mandatoryPointers,
  };
}

export async function canonProof(
  proofConfig: ProofConfig,
  options: {
    documentLoader: DocumentLoader;
  },
): Promise<string> {
  const proofCanon = await jsonld.normalize(
    proofConfig as JsonLdDocument,
    {
      documentLoader: options.documentLoader,
    } as Options.Normalize,
  );
  return proofCanon;
}
