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
exports.verifyEcdsaVc = verifyEcdsaVc;
exports.verifyEcdsaVcSig = verifyEcdsaVcSig;
const ethers_1 = require("ethers");
const utils_1 = require("./utils");
const verify_vc_core_1 = require("@terminal3/verify_vc_core");
const EthrDid_1 = require("./EthrDid");
/**
 * Verifies a verifiable credential using ECDSA signature.
 * @param
 *
 */
function verifyEcdsaVc(vc, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const vericationResult = yield (0, verify_vc_core_1.verifyVcNonSpecificPart)(vc, options);
        if (!vericationResult.isValid) {
            return vericationResult;
        }
        return verifyEcdsaVcSig(vc, options);
    });
}
function verifyEcdsaVcSig(vc, options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const data = ((_a) => {
            var { proof: _proof } = _a, others = __rest(_a, ["proof"]);
            return (Object.assign({}, others));
        })(vc);
        const signature = (_a = vc.proof) === null || _a === void 0 ? void 0 : _a.proofValue;
        const json = JSON.stringify(data);
        const hash = ethers_1.ethers.solidityPackedKeccak256(['string'], [json]);
        const address = (0, utils_1.getWalletAddress)(data.issuer);
        const recoveredAddress = ethers_1.ethers.verifyMessage(hash, signature);
        if (!vc.proof.verificationMethod.includes(recoveredAddress)) {
            throw new Error('Signature does not correspond to verificationMethod in the proof');
        }
        // TODO add check for the public key
        if (options && (options === null || options === void 0 ? void 0 : options.ethrDidRegistry)) {
            // check that recoveredAddress is in the verify method for ethrDid
            if (!vc.issuer.startsWith('did:ethr:')) {
                throw new Error('Only did:ethr is supported as issuer for ecdsa VC verification');
            }
            if (!(yield (0, EthrDid_1.checkAddressEthrDidSigDelegate)(recoveredAddress, vc.issuer))) {
                return {
                    isValid: false,
                    message: 'Signature verification failed, signer is not delegate, nor controller of the DID',
                };
            }
            else {
                return {
                    isValid: true,
                    message: 'Signature verification successful, signer is delegate or controller of the DID',
                };
            }
        }
        return {
            isValid: address === recoveredAddress,
            message: address === recoveredAddress
                ? 'Verification successful'
                : 'Signature mismatch',
        };
    });
}
//# sourceMappingURL=verifyEcdsaVc.js.map