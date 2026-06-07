"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBbsCredential = createBbsCredential;
exports.makeBBSPlusProof = makeBBSPlusProof;
exports.makeBBSPlusW3cProof = makeBBSPlusW3cProof;
exports.blsSignMessages = blsSignMessages;
exports.getMessages = getMessages;
exports.getGroupedMessages = getGroupedMessages;
exports.removeDuplicates = removeDuplicates;
exports.getMandatoryPointers = getMandatoryPointers;
exports.encodeCbor = encodeCbor;
exports.decodeCbor = decodeCbor;
const ethers_1 = require("ethers");
const bbs_signatures_1 = require("@mattrglobal/bbs-signatures");
const vc_core_1 = require("@terminal3/vc_core");
const getMessagesW3c_1 = require("./getMessagesW3c");
const localLoader_1 = require("./localLoader");
const cbor_1 = __importDefault(require("cbor"));
const utils_1 = require("@noble/hashes/utils");
const base64url_1 = __importDefault(require("base64url"));
const BbsDid_1 = require("./BbsDid");
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
function createBbsCredential(issuer, user, credentials, type, validFrom, validUntil, options, proofFunction, w3cBbs) {
    return __awaiter(this, void 0, void 0, function* () {
        // if w3Bbs param is not provided see if it provided in constants
        if (w3cBbs === undefined) {
            // by default w3cbbs is on
            w3cBbs = true;
        }
        const credentialPayload = yield (0, vc_core_1.prepareCredentialPayload)(type, issuer, user, credentials, validFrom, validUntil, options);
        // copy credential and remove sections that should not be included in the id
        const credential = Object.assign({}, credentialPayload);
        if (!(issuer instanceof BbsDid_1.BbsDID)) {
            throw new Error('Issuer must be a BbsDID to use BBS+ signature.');
        }
        const mandatoryPointers = getMandatoryPointers(options);
        if (!w3cBbs) {
            const messages = getMessages(credentialPayload, mandatoryPointers);
            const mandatorySet = removeDuplicates(mandatoryPointers);
            if (!proofFunction) {
                proofFunction = makeBBSPlusProof;
            }
            credential['proof'] = yield proofFunction(issuer.signingKey.privateKey, issuer.signingKey.publicKey, messages.map((value) => Uint8Array.from(Buffer.from(value, 'utf-8'))), mandatorySet, { did: issuer.did });
            return credential;
        }
        else {
            const { bbsHeader, bbsMessages, proofConfig, hmacKey, mandatoryPointers: mandatory, } = yield (0, getMessagesW3c_1.getMessagesW3c)(credentialPayload, mandatoryPointers, issuer.did, {
                documentLoader: localLoader_1.localLoader,
            });
            const messages = [bbsHeader, ...bbsMessages];
            const mandatorySet = new Set(mandatory);
            if (!proofFunction) {
                proofFunction = makeBBSPlusW3cProof;
            }
            credential['proof'] = yield proofFunction(issuer.signingKey.privateKey, issuer.signingKey.publicKey, messages, mandatorySet, {
                hmacKey,
                proofConfig,
            });
            return credential;
        }
    });
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
function makeBBSPlusProof(privateKey, publicKey, messages, mandatorySet, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const signature = yield blsSignMessages(privateKey, publicKey, messages);
        return {
            type: 'BbsPlusSignature2020',
            proofPurpose: 'assertionMethod',
            verificationMethod: options.did + '#key-1',
            created: new Date().toISOString(),
            mandatoryPointers: Array.from(mandatorySet),
            proofValue: signature,
        };
    });
}
function makeBBSPlusW3cProof(privateKey, publicKey, messages, mandatorySet, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const bbsSignature = yield blsSignMessages(privateKey, publicKey, messages);
        const mandatoryPointers = Array.from(mandatorySet);
        if (options.hmacKey == undefined) {
            throw new Error('HMAC key is required');
        }
        // components are pure bytes
        const cborThing = yield encodeCbor(bbsSignature, messages[0], publicKey, Buffer.from(options.hmacKey).toString('hex'), mandatoryPointers);
        let proofValue = new Uint8Array([0xd9, 0x5d, 0x02]);
        proofValue = (0, utils_1.concatBytes)(proofValue, cborThing);
        const baseProof = base64url_1.default.encode(Buffer.from(proofValue));
        if (!options.proofConfig) {
            throw Error('Proof config is required');
        }
        delete options.proofConfig['@context'];
        // copy proofConfig
        const proof = Object.assign({}, options.proofConfig);
        proof.proofValue = baseProof;
        return proof;
    });
}
function blsSignMessages(privateKey, publicKey, messages) {
    return __awaiter(this, void 0, void 0, function* () {
        const keyPair = {
            publicKey: Uint8Array.from(Buffer.from(publicKey, 'hex')),
            secretKey: Uint8Array.from(Buffer.from(privateKey, 'hex')),
        };
        const signature = Buffer.from(yield (0, bbs_signatures_1.blsSign)({
            keyPair,
            messages,
        })).toString('hex');
        return signature;
    });
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
function getMessages(data, mandatory) {
    const { mandatoryMessages, messages, } = getGroupedMessages(mandatory, data);
    const flattenedMandatoryMessages = mandatoryMessages.flatMap((message) => [
        message.schema,
        message.value,
    ]);
    // Hash the mandatory messages
    const hashedMandatoryMessages = (0, ethers_1.solidityPackedSha256)(new Array(flattenedMandatoryMessages.length).fill('string'), flattenedMandatoryMessages);
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
function getGroupedMessages(mandatory, data) {
    const messages = [];
    const mandatoryMessages = [];
    const mandatorySet = removeDuplicates(mandatory);
    // Start traversal from the root of the data object
    const notCovered = traverse(data, '', mandatorySet, messages, mandatoryMessages);
    if (notCovered.size > 0) {
        throw new Error(`Mandatory fields not covered: ${Array.from(notCovered).join(', ')}. Necessary fields: ${Array.from(mandatorySet).join(', ')}. messages: ${JSON.stringify(messages.map((message) => message.value))} mandatoryMessages: ${JSON.stringify(mandatoryMessages.map((message) => message.value))}`);
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
function traverse(obj, path, mandatorySet, messages, mandatoryMessages) {
    const notCovered = new Set(mandatorySet);
    traverse_recursive(obj, path, mandatorySet, notCovered, messages, mandatoryMessages);
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
function traverse_recursive(obj, path, mandatorySet, notCovered, messages, mandatoryMessages) {
    if (Array.isArray(obj)) {
        obj.forEach((item, index) => traverse_recursive(item, `${path}/@${index}`, mandatorySet, notCovered, messages, mandatoryMessages));
    }
    else if (obj !== null && typeof obj === 'object') {
        Object.entries(obj).forEach(([key, value]) => {
            traverse_recursive(value, `${path}/${key}`, mandatorySet, notCovered, messages, mandatoryMessages);
        });
    }
    else {
        const valueStr = obj === undefined && obj === null ? '' : String(obj);
        if (isInSetLike(path, mandatorySet, notCovered)) {
            mandatoryMessages.push({ schema: path, value: valueStr });
        }
        else {
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
function isInSetLike(path, setLike, not_covered) {
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
function removeDuplicates(paths) {
    // Sort the array; longer strings will come after if they have the same prefix
    paths.sort();
    const result = new Set();
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
function getMandatoryPointers(options) {
    const mandatory = (options === null || options === void 0 ? void 0 : options.mandatoryPointers) || [];
    // add always mandatory fields to mandatory
    return [...alwaysMandatory, ...mandatory];
}
function encodeCbor(bbsSignature, bbsHeader, publicKey, hmacKey, mandatoryPointers) {
    return __awaiter(this, void 0, void 0, function* () {
        const mandatoryPointersBytes = mandatoryPointers.map((pointer) => Buffer.from(pointer));
        const components = [
            Buffer.from(bbsSignature, 'hex'),
            Buffer.from(bbsHeader),
            Buffer.from(publicKey, 'hex'),
            Buffer.from(hmacKey, 'hex'),
            mandatoryPointersBytes,
        ];
        const cborThing = yield cbor_1.default.encodeAsync(components);
        return cborThing;
    });
}
function decodeCbor(cborThing) {
    const [bbsSignature, bbsHeader, publicKey, hmacKey, mandatoryPointers] = cbor_1.default.decode(cborThing);
    return {
        bbsSignature: Buffer.from(bbsSignature).toString('hex'),
        bbsHeader: Buffer.from(bbsHeader).toString('hex'),
        publicKey: Buffer.from(publicKey).toString('hex'),
        hmacKey: Buffer.from(hmacKey).toString('hex'),
        mandatoryPointers: mandatoryPointers.map((pointer) => pointer.toString()),
    };
}
//# sourceMappingURL=issueBbsVc.js.map