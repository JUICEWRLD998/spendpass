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
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyVc = verifyVc;
const bbs_vc_1 = require("@terminal3/bbs_vc");
const ecdsa_vc_1 = require("@terminal3/ecdsa_vc");
function verifyVc(vc, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!vc.proof) {
            throw new Error('Proof not found in VC');
        }
        if (!vc.proof.type) {
            throw new Error('Proof type not found in VC');
        }
        switch (vc.proof.type) {
            case 'BbsPlusSignature2020': {
                return (0, bbs_vc_1.verifyBbsVc)(vc, options);
            }
            case 'EcdsaSecp256k1Signature2019': {
                return (0, ecdsa_vc_1.verifyEcdsaVc)(vc, options);
            }
            case 'DataIntegrityProof': {
                switch (vc.proof.cryptosuite) {
                    case 'bbs-2023': {
                        return (0, bbs_vc_1.verifyBbsVCW3c)(vc);
                    }
                    default: {
                        throw new Error('Unsupported cryptosuite: ' + vc.proof.cryptosuite);
                    }
                }
            }
            default: {
                throw new Error('Unsupported proof type: ' + vc.proof.type);
            }
        }
    });
}
//# sourceMappingURL=verifyVC.js.map