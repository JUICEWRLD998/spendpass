import { DID, ProofConfig } from '@terminal3/vc_core';
import { solidityPackedSha256 } from 'ethers';
import { VerificationOptions } from '@terminal3/vc_core';
import { blsSign } from '@mattrglobal/bbs-signatures';
import { DIDWithKey } from '@terminal3/vc_core';
import { prepareCredentialPayload } from '@terminal3/vc_core';
import { Proof } from '@terminal3/vc_core';
import { SignedCredential } from '@terminal3/vc_core';
import { getMessagesW3c } from './getMessagesW3c';
import { DocumentLoader, localLoader } from './localLoader';
import cbor from 'cbor';
import { concatBytes } from '@noble/hashes/utils';
import base64url from 'base64url';
import { BbsDID } from './BbsDid';

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

const alwaysMandatory = [
  '/@context',
  '/id',
  '/issuer',
  '/type',
  '/validFrom',
  '/validUntil',
];

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
export async function createBbsCredential(
  issuer: DIDWithKey,
  user: DID,
  credentials: Record<string, unknown>,
  type?: string[],
  validFrom?: Date,
  validUntil?: Date,
  options?: VerificationOptions,
  proofFunction?: (
    privateKey: string,
    publicKey: string,
    messages: Uint8Array[],
    mandatorySet: Set<string>,
    options: ProofOptions,
  ) => Promise<Proof>,
  w3cBbs?: boolean,
): Promise<SignedCredential> {
  // if w3Bbs param is not provided see if it provided in constants
  if (w3cBbs === undefined) {
    // by default w3cbbs is on
    w3cBbs = true;
  }
  const credentialPayload = await prepareCredentialPayload(
    type,
    issuer,
    user,
    credentials,
    validFrom,
    validUntil,
    options,
  );

  // copy credential and remove sections that should not be included in the id
  const credential = { ...credentialPayload } as SignedCredential;
  if (!(issuer instanceof BbsDID)) {
    throw new Error('Issuer must be a BbsDID to use BBS+ signature.');
  }
  const mandatoryPointers = getMandatoryPointers(options);
  if (!w3cBbs) {
    const messages = getMessages(credentialPayload, mandatoryPointers);
    const mandatorySet = removeDuplicates(mandatoryPointers);
    if (!proofFunction) {
      proofFunction = makeBBSPlusProof;
    }
    credential['proof'] = await proofFunction(
      issuer.signingKey.privateKey,
      issuer.signingKey.publicKey,
      messages.map((value) => Uint8Array.from(Buffer.from(value, 'utf-8'))),
      mandatorySet,
      { did: issuer.did },
    );
    return credential;
  } else {
    const {
      bbsHeader,
      bbsMessages,
      proofConfig,
      hmacKey,
      mandatoryPointers: mandatory,
    } = await getMessagesW3c(credentialPayload, mandatoryPointers, issuer.did, {
      documentLoader: localLoader as unknown as DocumentLoader,
    });
    const messages = [bbsHeader, ...bbsMessages];
    const mandatorySet = new Set(mandatory);
    if (!proofFunction) {
      proofFunction = makeBBSPlusW3cProof;
    }
    credential['proof'] = await proofFunction(
      issuer.signingKey.privateKey,
      issuer.signingKey.publicKey,
      messages,
      mandatorySet,
      {
        hmacKey,
        proofConfig,
      },
    );
    return credential;
  }
}

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
export async function makeBBSPlusProof(
  privateKey: string,
  publicKey: string,
  messages: Uint8Array[],
  mandatorySet: Set<string>,
  options: ProofOptions,
): Promise<Proof> {
  const signature = await blsSignMessages(privateKey, publicKey, messages);
  return {
    type: 'BbsPlusSignature2020',
    proofPurpose: 'assertionMethod',
    verificationMethod: options.did + '#key-1',
    created: new Date().toISOString(),
    mandatoryPointers: Array.from(mandatorySet),
    proofValue: signature,
  };
}
export async function makeBBSPlusW3cProof(
  privateKey: string,
  publicKey: string,
  messages: Uint8Array[],
  mandatorySet: Set<string>,
  options: ProofOptions,
): Promise<Proof> {
  const bbsSignature = await blsSignMessages(privateKey, publicKey, messages);
  const mandatoryPointers = Array.from(mandatorySet);
  if (options.hmacKey == undefined) {
    throw new Error('HMAC key is required');
  }
  // components are pure bytes

  const cborThing = await encodeCbor(
    bbsSignature,
    messages[0],
    publicKey,
    Buffer.from(options.hmacKey).toString('hex'),
    mandatoryPointers,
  );
  let proofValue = new Uint8Array([0xd9, 0x5d, 0x02]);
  proofValue = concatBytes(proofValue, cborThing);
  const baseProof = base64url.encode(Buffer.from(proofValue));
  if (!options.proofConfig) {
    throw Error('Proof config is required');
  }
  delete options.proofConfig['@context'];
  // copy proofConfig
  const proof = { ...options.proofConfig } as Proof;
  proof.proofValue = baseProof;
  return proof;
}

export async function blsSignMessages(
  privateKey: string,
  publicKey: string,
  messages: Uint8Array[],
) {
  const keyPair = {
    publicKey: Uint8Array.from(Buffer.from(publicKey, 'hex')),
    secretKey: Uint8Array.from(Buffer.from(privateKey, 'hex')),
  };
  const signature = Buffer.from(
    await blsSign({
      keyPair,
      messages,
    }),
  ).toString('hex');
  return signature;
}

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
export function getMessages(data: unknown, mandatory: string[]): string[] {
  const {
    mandatoryMessages,
    messages,
  }: {
    mandatoryMessages: Message[];
    messages: Message[];
  } = getGroupedMessages(mandatory, data);

  const flattenedMandatoryMessages = mandatoryMessages.flatMap((message) => [
    message.schema,
    message.value,
  ]);

  // Hash the mandatory messages
  const hashedMandatoryMessages = solidityPackedSha256(
    new Array(flattenedMandatoryMessages.length).fill('string'),
    flattenedMandatoryMessages,
  );

  // Combine hashed mandatory and other messages
  const flattenedMessages = messages.flatMap((message) => [
    message.schema,
    message.value,
  ]);
  return [hashedMandatoryMessages, ...flattenedMessages];
}

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
export function getGroupedMessages(
  mandatory: string[],
  data: unknown,
): {
  mandatoryMessages: Message[];
  messages: Message[];
  mandatorySet: Set<string>;
} {
  const messages: Message[] = [];
  const mandatoryMessages: Message[] = [];
  const mandatorySet = removeDuplicates(mandatory);

  // Start traversal from the root of the data object
  const notCovered = traverse(
    data,
    '',
    mandatorySet,
    messages,
    mandatoryMessages,
  );

  if (notCovered.size > 0) {
    throw new Error(
      `Mandatory fields not covered: ${Array.from(notCovered).join(
        ', ',
      )}. Necessary fields: ${Array.from(mandatorySet).join(', ')}. messages: ${JSON.stringify(messages.map((message) => message.value))} mandatoryMessages: ${JSON.stringify(mandatoryMessages.map((message) => message.value))}`,
    );
  }
  return { mandatoryMessages, messages, mandatorySet };
}

/**
 * Traverses a data object recursively, categorizing entries as either mandatory or non-mandatory based on their paths.
 * This function also sorts the collected messages by their schema paths.
 *
 * @param {any} obj - The data object to be traversed.
 * @param {string} path - The current path within the data object, used for nested objects.
 * @param {Set<string>} mandatorySet - A set of paths that are considered mandatory.
 * @param {Message[]} messages - An array to collect non-mandatory messages.
 * @param {Message[]} mandatoryMessages - An array to collect mandatory messages.
 * @returns {Set<string>} - A set of paths that were declared as mandatory but not found in the data object.
 */
function traverse(
  obj: unknown,
  path: string,
  mandatorySet: Set<string>,
  messages: Message[],
  mandatoryMessages: Message[],
): Set<string> {
  const notCovered = new Set<string>(mandatorySet);
  traverse_recursive(
    obj,
    path,
    mandatorySet,
    notCovered,
    messages,
    mandatoryMessages,
  );
  // sort by schema
  messages.sort((a, b) => a.schema.localeCompare(b.schema));
  mandatoryMessages.sort((a, b) => a.schema.localeCompare(b.schema));
  return notCovered;
}

/**
 * Helper function for `traverse` that performs the actual recursive traversal of the data object.
 * Based on the current path, it determines if a data item is mandatory and collects the data accordingly.
 *
 * @param {unknown} obj - The current segment of the data object being traversed.
 * @param {string} path - The accumulated path to the current data item.
 * @param {Set<string>} mandatorySet - A set of paths that are considered mandatory.
 * @param {Set<string>} notCovered - A set to track paths that are mandatory but haven't been covered in the data.
 * @param {Message[]} messages - An array to store non-mandatory messages.
 * @param {Message[]} mandatoryMessages - An array to store mandatory messages.
 */
function traverse_recursive(
  obj: unknown,
  path: string,
  mandatorySet: Set<string>,
  notCovered: Set<string>,
  messages: Message[],
  mandatoryMessages: Message[],
) {
  if (Array.isArray(obj)) {
    obj.forEach((item, index) =>
      traverse_recursive(
        item,
        `${path}/@${index}`,
        mandatorySet,
        notCovered,
        messages,
        mandatoryMessages,
      ),
    );
  } else if (obj !== null && typeof obj === 'object') {
    Object.entries(obj).forEach(([key, value]) => {
      traverse_recursive(
        value,
        `${path}/${key}`,
        mandatorySet,
        notCovered,
        messages,
        mandatoryMessages,
      );
    });
  } else {
    const valueStr = obj === undefined && obj === null ? '' : String(obj);
    if (isInSetLike(path, mandatorySet, notCovered)) {
      mandatoryMessages.push({ schema: path, value: valueStr });
    } else {
      messages.push({ schema: path, value: valueStr });
    }
  }
}

/**
 * Checks if a given path starts with any of the paths in a given set and updates the set to reflect paths that have been covered.
 * This function is utilized to determine if a data item should be categorized as mandatory based on its path.
 *
 * @param {string} path - The path to check against the set of mandatory paths.
 * @param {Set<string>} setLike - A set of paths considered mandatory.
 * @param {Set<string>} not_covered - A set to track paths that are mandatory but haven't been covered.
 * @returns {boolean} - True if the path matches any path in the set (indicating it's a mandatory path), false otherwise.
 */
function isInSetLike(
  path: string,
  setLike: Set<string>,
  not_covered: Set<string>,
): boolean {
  for (const item of setLike) {
    if (path.startsWith(item)) {
      not_covered.delete(item);
      return true;
    }
  }
  return false;
}

/**
 * Removes duplicate entries from an array of strings based on prefix comparison, ensuring that each prefix is unique.
 * This is useful for condensing a list of paths where some paths may be prefixes of others.
 *
 * @param {string[]} paths - An array of strings, typically paths, that may contain duplicates or nested paths.
 * @returns {Set<string>} - A set containing unique paths, each representing a unique prefix.
 */
export function removeDuplicates(paths: string[]): Set<string> {
  // Sort the array; longer strings will come after if they have the same prefix
  paths.sort();

  const result = new Set<string>();
  let currentPrefix = null;

  // Iterate over the sorted list
  for (const item of paths) {
    // Check if the current item starts with the last seen prefix
    if (!currentPrefix || !item.startsWith(currentPrefix)) {
      // If it doesn't, add it to the result and update the current prefix
      result.add(item);
      currentPrefix = item; // Update prefix to the current item
    }
  }

  return result;
}

/**
 * Constructs a list of mandatory pointers for a verification process by combining a predefined list of always mandatory fields with optional additional fields specified in the options.
 *
 * @param {VerificationOptions | undefined} options - Optional parameters that may contain an array of additional mandatory pointers.
 * @returns {string[]} - An array of strings that includes all mandatory pointers needed for the verification process.
 */
export function getMandatoryPointers(
  options: VerificationOptions | undefined,
): string[] {
  const mandatory = options?.mandatoryPointers || [];
  // add always mandatory fields to mandatory
  return [...alwaysMandatory, ...mandatory];
}

export async function encodeCbor(
  bbsSignature: string,
  bbsHeader: Uint8Array,
  publicKey: string,
  hmacKey: string,
  mandatoryPointers: string[],
): Promise<Buffer> {
  const mandatoryPointersBytes = mandatoryPointers.map((pointer) =>
    Buffer.from(pointer),
  );
  const components = [
    Buffer.from(bbsSignature, 'hex'),
    Buffer.from(bbsHeader),
    Buffer.from(publicKey, 'hex'),
    Buffer.from(hmacKey, 'hex'),
    mandatoryPointersBytes,
  ];

  const cborThing = await cbor.encodeAsync(components);
  return cborThing;
}

export function decodeCbor(cborThing: Buffer): {
  bbsSignature: string;
  bbsHeader: string;
  publicKey: string;
  hmacKey: string;
  mandatoryPointers: string[];
} {
  const [bbsSignature, bbsHeader, publicKey, hmacKey, mandatoryPointers] =
    cbor.decode(cborThing) as [string, string, string, string, Buffer[]];
  return {
    bbsSignature: Buffer.from(bbsSignature).toString('hex'),
    bbsHeader: Buffer.from(bbsHeader).toString('hex'),
    publicKey: Buffer.from(publicKey).toString('hex'),
    hmacKey: Buffer.from(hmacKey).toString('hex'),
    mandatoryPointers: mandatoryPointers.map((pointer: Buffer) =>
      pointer.toString(),
    ),
  };
}
