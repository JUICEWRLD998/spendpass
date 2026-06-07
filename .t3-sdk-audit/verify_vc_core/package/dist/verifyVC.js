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
exports.verifyVcNonSpecificPart = verifyVcNonSpecificPart;
exports.verifyVcFields = verifyVcFields;
const revoke_vc_1 = require("@terminal3/revoke_vc");
function verifyVcNonSpecificPart(vc, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const vericationResult = verifyVcFields(vc);
        if (!vericationResult.isValid) {
            return vericationResult;
        }
        if (options && options.revocationRegistryAddress) {
            if (!options.provider) {
                throw new Error('Provider is required when revocationRegistryAddress is provided');
            }
            if (yield (0, revoke_vc_1.isRevoked)(vc.id, vc.issuer, options)) {
                return { isValid: false, message: 'Credential has been revoked' };
            }
        }
        return { isValid: true, message: 'Common verification successful' };
    });
}
function verifyVcFields(vc) {
    var _a;
    if (!vc.proof) {
        return {
            isValid: false,
            message: `Proof not found for VC with vc ID ${vc.id}`,
        };
    }
    const signature = (_a = vc.proof) === null || _a === void 0 ? void 0 : _a.proofValue;
    if (!vc.issuer) {
        return {
            isValid: false,
            message: `Credential issuer is undefined for VC with vc ID ${vc.id}`,
        };
    }
    if (!signature) {
        return {
            isValid: false,
            message: `No signature found in proof for VC with vc ID ${vc.id}`,
        };
    }
    if (vc.validUntil && new Date(vc.validUntil) < new Date()) {
        return { isValid: false, message: `Credential ${vc.id} is expired` };
    }
    if (vc.validFrom && new Date(vc.validFrom) > new Date()) {
        return {
            isValid: false,
            message: `Credential ${vc.id} is not yet valid`,
        };
    }
    return { isValid: true, message: 'Verification successful' };
}
//# sourceMappingURL=verifyVC.js.map