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
exports.getMessagesW3c = getMessagesW3c;
exports.canonProof = canonProof;
const utils_1 = require("@noble/hashes/utils"); // bytesToHex is in here too
const jsonld_1 = __importDefault(require("jsonld"));
const sha256_1 = require("@noble/hashes/sha256");
const rdfCanonicalize_1 = require("./rdfCanonicalize");
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
function getMessagesW3c(document, mandatoryPointers, issuer, options) {
    return __awaiter(this, void 0, void 0, function* () {
        // Set up proof configuration and canonize
        if (!issuer.startsWith('did:key:')) {
            throw new Error('Issuer must be a did:key DID');
        }
        let proofConfig = {};
        if (options.proofConfig !== undefined) {
            proofConfig = Object.assign({}, options.proofConfig);
        }
        else {
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
        const proofCanon = yield canonProof(proofConfig, {
            documentLoader: options.documentLoader,
        });
        // Check for HMAC key and generate if not present
        let hmacKey;
        if (options.hmacKey !== undefined) {
            hmacKey = options.hmacKey;
        }
        else {
            hmacKey = (0, rdfCanonicalize_1.randomBytes)(32);
        }
        // **Transformation Step**
        const hmacFunc = (0, rdfCanonicalize_1.createHmac)(hmacKey);
        const labelMapFactoryFunction = (0, rdfCanonicalize_1.createShuffledIdLabelMapFunction)(hmacFunc);
        const groups = { mandatory: mandatoryPointers };
        const stuff = yield (0, rdfCanonicalize_1.canonicalizeAndGroup)(document, labelMapFactoryFunction, groups, { documentLoader: options.documentLoader });
        const mandatory = stuff.groups.mandatory.matching;
        const nonMandatory = stuff.groups.mandatory.nonMatching;
        // **Hashing Step**
        const proofHash = (0, sha256_1.sha256)(proofCanon); // @noble/hash will convert string to bytes via UTF-8
        // console.log(`Proof hash: ${bytesToHex(proofHash)}`)
        const mandatoryHash = (0, sha256_1.sha256)([...mandatory.values()].join(''));
        // console.log(`Mandatory hash: ${bytesToHex(mandatoryHash)}`)
        /* Create BBS signature */
        const bbsHeader = (0, utils_1.concatBytes)(proofHash, mandatoryHash);
        const te = new TextEncoder();
        const bbsMessages = [...nonMandatory.values()].map((txt) => te.encode(txt)); // must be byte arrays
        return {
            bbsHeader,
            bbsMessages,
            proofConfig,
            hmacKey,
            mandatoryPointers,
        };
    });
}
function canonProof(proofConfig, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const proofCanon = yield jsonld_1.default.normalize(proofConfig, {
            documentLoader: options.documentLoader,
        });
        return proofCanon;
    });
}
//# sourceMappingURL=getMessagesW3c.js.map