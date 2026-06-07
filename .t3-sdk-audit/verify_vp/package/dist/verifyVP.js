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
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPresentation = verifyPresentation;
const bbs_signatures_1 = require("@mattrglobal/bbs-signatures");
const bbs_vc_1 = require("@terminal3/bbs_vc");
const ecdsa_vc_1 = require("@terminal3/ecdsa_vc");
const vc_core_1 = require("@terminal3/vc_core");
const verify_vc_core_1 = require("@terminal3/verify_vc_core");
const verifyBbsVpW3c_1 = require("./verifyBbsVpW3c");
function verifyPresentation(vp, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const results = yield Promise.all(vp.credentials.map((vc) => __awaiter(this, void 0, void 0, function* () {
            const vericationResult = yield (0, verify_vc_core_1.verifyVcNonSpecificPart)(vc, options);
            if (!vericationResult.isValid) {
                return vericationResult;
            }
            const proof = vc.proof;
            if (!proof) {
                throw new Error('Proof not found in VC');
            }
            if (!vc.proof.type) {
                throw new Error('Proof type not found in VC');
            }
            switch (vc.proof.type) {
                case 'BbsPlusSignature2020Proof': {
                    const proofUint8 = Uint8Array.from(Buffer.from(proof.proofValue, 'hex'));
                    if (!vc.issuer) {
                        throw new Error('Issuer not found in VC');
                    }
                    const publicKey = (0, vc_core_1.getPublicKeyFromDidKey)(vc.issuer);
                    const publicKeyUint8 = Uint8Array.from(Buffer.from(publicKey, 'hex'));
                    const mandatoryPointers = proof.mandatoryPointers;
                    if (!mandatoryPointers) {
                        throw new Error('Mandatory pointers not found in proof');
                    }
                    const { proof: _proof } = vc, vcPayload = __rest(vc, ["proof"]);
                    const messages = (0, bbs_vc_1.getMessages)(vcPayload, mandatoryPointers);
                    const messagesUint8 = messages.map((message) => Uint8Array.from(Buffer.from(message, 'utf8')));
                    const res = yield (0, bbs_signatures_1.blsVerifyProof)({
                        proof: proofUint8,
                        publicKey: publicKeyUint8,
                        messages: messagesUint8,
                        nonce: Uint8Array.from(Buffer.from('nonce', 'utf8')),
                    });
                    if (!res.verified) {
                        return {
                            isValid: false,
                            message: `BBS+ verification failed for VC with id ${vc.id}`,
                        };
                    }
                    return { isValid: true, message: 'BBS+ verification successful' };
                }
                case 'DataIntegrityProof': {
                    switch (vc.proof.cryptosuite) {
                        case 'bbs-2023': {
                            return (0, verifyBbsVpW3c_1.verifyBbsVpW3c)(vc);
                        }
                        default: {
                            throw new Error(`Unsupported cryptosuite ${vc.proof.cryptosuite} in VC with id ${vc.id}`);
                        }
                    }
                }
                case 'EcdsaSecp256k1Signature2019': {
                    const res = yield (0, ecdsa_vc_1.verifyEcdsaVcSig)(vc);
                    if (!res.isValid) {
                        return {
                            isValid: false,
                            message: `ECDSA verification failed for VC with id ${vc.id}`,
                        };
                    }
                    return { isValid: true, message: 'ECDSA verification successful' };
                }
                default: {
                    throw new Error(`Unsupported proof type ${vc.proof.type} in VC with id ${vc.id}`);
                }
            }
        })));
        for (const result of results) {
            if (!result.isValid) {
                return result;
            }
        }
        return { isValid: true, message: 'vp verified successfully' };
    });
}
//# sourceMappingURL=verifyVP.js.map