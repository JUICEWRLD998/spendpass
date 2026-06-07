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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyBbsVc = verifyBbsVc;
exports.verifyBbsVCW3c = verifyBbsVCW3c;
const verify_vc_core_1 = require("@terminal3/verify_vc_core");
const issueBbsVc_1 = require("./issueBbsVc");
const bbs_signatures_1 = require("@mattrglobal/bbs-signatures");
const vc_core_1 = require("@terminal3/vc_core");
const base64url_1 = __importDefault(require("base64url"));
const localLoader_1 = require("./localLoader");
const getMessagesW3c_1 = require("./getMessagesW3c");
const utils_1 = require("@noble/hashes/utils");
const util_1 = __importDefault(require("util"));
/**
 * Verifies a verifiable credential using BBS+ signatures.
 *
 * @param {CredentialPayload} data - The payload of the verifiable credential.
 * @param {string} signature - The BBS+ signature in string format.
 * @param {string[]} mandatory - Array of mandatory message pointers used in the credential.
 * @param {VerificationOptions} [options] - Optional settings for the verification process.
 * @returns {Promise<VerificationResult>} A promise that resolves to the result of the verification, including validity and messages.
 *
 * @throws {Error} If the credential issuer is undefined or necessary options are missing, such as the provider.
 */
function verifyBbsVc(vc, options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        // Extract the BBS+ public key from the issuer
        const vericationResult = yield (0, verify_vc_core_1.verifyVcNonSpecificPart)(vc, options);
        if (!vericationResult.isValid) {
            return vericationResult;
        }
        const data = ((_a) => {
            var { proof } = _a, others = __rest(_a, ["proof"]);
            return (Object.assign({}, others));
        })(vc);
        const signature = (_a = vc.proof) === null || _a === void 0 ? void 0 : _a.proofValue;
        const issuer = data.issuer;
        if (!issuer)
            throw new Error('Credential issuer is undefined');
        // Reconstruct the array of messages as in the signing process
        switch (vc.proof.type) {
            case 'BbsPlusSignature2020': {
                const mandatory = (_b = vc.proof) === null || _b === void 0 ? void 0 : _b.mandatoryPointers;
                if (mandatory == undefined) {
                    throw new Error(`Mandatory pointers are required for BBS+ verification. proof: ${util_1.default.inspect(vc.proof)}`);
                }
                const publicKey = (0, vc_core_1.getPublicKeyFromDidKey)(issuer);
                const messages = (0, issueBbsVc_1.getMessages)(data, mandatory);
                const publicKeyUint8 = Uint8Array.from(Buffer.from(publicKey, 'hex'));
                const signatureUint8 = Uint8Array.from(Buffer.from(signature, 'hex'));
                const messagesUint8 = messages.map((message) => Uint8Array.from(Buffer.from(message, 'utf-8')));
                const isVerified = yield (0, bbs_signatures_1.blsVerify)({
                    publicKey: publicKeyUint8,
                    messages: messagesUint8,
                    signature: signatureUint8,
                });
                return {
                    isValid: isVerified.verified,
                    message: isVerified.verified
                        ? 'Verification successful'
                        : `BBS+ signature verification failed: ${isVerified.error}`,
                };
            }
            case 'DataIntegrityProof': {
                switch (vc.proof.cryptosuite) {
                    case 'bbs-2023': {
                        return verifyBbsVCW3c(vc);
                    }
                    default:
                        throw new Error(`vc.proof.cryptosuite ${vc.proof.cryptosuite} unsupported for vc.proof.type DataIntegrityProof`);
                }
            }
            default: {
                throw new Error(`Unsupported proof type: ${vc.proof.type}`);
            }
        }
    });
}
/**
 * verify a signed selective disclosure base document (credential) with `bbs-2023`
 * procedures. This is can be done by an holder on receipt of the credential.
 *
 * @param {Object} vc - The signed `bbs-2023` base credential
 
 */
function verifyBbsVCW3c(vc) {
    return __awaiter(this, void 0, void 0, function* () {
        // parseBaseProofValue:
        const data = ((_a) => {
            var { proof } = _a, others = __rest(_a, ["proof"]);
            return (Object.assign({}, others));
        })(vc);
        const proofValue = vc.proof.proofValue; // base64url encoded
        const proofValueBytes = base64url_1.default.toBuffer(proofValue);
        // console.log(proofValueBytes.length);
        // check header bytes are: 0xd9, 0x5d, and 0x02
        if (proofValueBytes[0] !== 0xd9 ||
            proofValueBytes[1] !== 0x5d ||
            proofValueBytes[2] !== 0x02) {
            throw new Error('Invalid proofValue header');
        }
        const { bbsSignature, bbsHeader: bbsHeaderBase, publicKey: publicKeyBase, hmacKey, mandatoryPointers, } = (0, issueBbsVc_1.decodeCbor)(proofValueBytes.subarray(3));
        // console.log('mandatoryPointers:', mandatoryPointers);
        (0, issueBbsVc_1.getGroupedMessages)(mandatoryPointers, data);
        const issuer = data.issuer;
        // canonize proof configuration and hash it
        const proofConfig = ((_a) => {
            var { proofValue } = _a, others = __rest(_a, ["proofValue"]);
            return (Object.assign({}, others));
        })(vc.proof);
        proofConfig['@context'] = data['@context'];
        // console.log(`proofHash: ${bytesToHex(proofHash)}`)
        // **Verify BBS signature**
        const { bbsHeader, bbsMessages, hmacKey: hmacKey1, mandatoryPointers: mandatory1, } = yield (0, getMessagesW3c_1.getMessagesW3c)(data, mandatoryPointers, issuer, {
            proofConfig: proofConfig,
            hmacKey: Buffer.from(hmacKey, 'hex'),
            documentLoader: localLoader_1.localLoader,
        });
        if (hmacKey !== Buffer.from(hmacKey1).toString('hex')) {
            throw new Error('hmacKey and hmacKey1 DO NOT match!');
        }
        if (mandatoryPointers !== mandatory1) {
            console.log('mandatoryPointers:', mandatoryPointers);
            console.log('mandatory1:', mandatory1);
            throw new Error('mandatoryPointers and mandatory1 DO NOT match!');
        }
        // TODO bytestohex should be done standard way
        if ((0, utils_1.bytesToHex)(bbsHeader) !== bbsHeaderBase) {
            // console.log('computed bbsHeader and bbsHeader from base DO NOT match!')
            console.log('computed bbsHeader:', (0, utils_1.bytesToHex)(bbsHeader));
            console.log('bbsHeader from base:', bbsHeaderBase);
            return {
                isValid: false,
                message: 'Computed bbsHeader and bbsHeader from base DO NOT match!',
            };
        }
        const publicKey = (0, vc_core_1.getPublicKeyFromDidKey)(issuer);
        if (publicKey != publicKeyBase) {
            console.log('publicKey:', publicKey);
            console.log('publicKeyBase:', publicKeyBase);
            throw new Error('publicKeyUint8 and publicKeyBase DO NOT match!');
        }
        const messages = [bbsHeader, ...bbsMessages];
        const signature = bbsSignature;
        return yield verifyBbsSignature(publicKey, messages, signature);
    });
}
function verifyBbsSignature(publicKey, messages, signature) {
    return __awaiter(this, void 0, void 0, function* () {
        const publicKeyUint8 = Uint8Array.from(Buffer.from(publicKey, 'hex'));
        const signatureUint8 = Uint8Array.from(Buffer.from(signature, 'hex'));
        const isVerified = yield (0, bbs_signatures_1.blsVerify)({
            publicKey: publicKeyUint8,
            messages,
            signature: signatureUint8,
        });
        return {
            isValid: isVerified.verified,
            message: isVerified.verified
                ? 'Verification successful'
                : `BBS+ signature verification failed: ${isVerified.error}`,
        };
    });
}
//# sourceMappingURL=verifyBbsVC.js.map