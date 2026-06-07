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
exports.createEcdsaCredential = createEcdsaCredential;
exports.makeECDSAProof = makeECDSAProof;
const ethers_1 = require("ethers");
const vc_core_1 = require("@terminal3/vc_core");
const EthrDid_1 = require("./EthrDid");
/**
 * Create a credential with the specified parameters.
 * @param issuer The DID and keys of the issuer.
 * @param user The DID of the user.
 * @param credentials Additional credential data.
 * @param signatureType The type of signature to use.
 * @param type Array of credential types.
 * @param validFrom Start date of the credential.
 * @param validUntil Expiration date of the credential.
 * @param options Verification options.
 * @returns A promise that resolves to the signed credential.
 */
function createEcdsaCredential(issuer, user, credentials, type, validFrom, validUntil, options, proofFunction) {
    return __awaiter(this, void 0, void 0, function* () {
        const credentialPayload = yield (0, vc_core_1.prepareCredentialPayload)(type, issuer, user, credentials, validFrom, validUntil, options);
        // copy credential and remove sections that should not be included in the id
        const credential = Object.assign({}, credentialPayload);
        if (!proofFunction) {
            proofFunction = makeECDSAProof;
        }
        credential['proof'] = yield proofFunction(issuer.signingKey.privateKey, issuer.did, credentialPayload, options);
        return credential;
    });
}
/**
 * Creates an ECDSA proof for a given credential payload using the provided private key.
 *
 * @param {string} privateKey - The private key used for signing the credential payload.
 * @param {string} did - The decentralized identifier (DID) of the signer.
 * @param {CredentialPayload} data - The credential payload to be signed.
 * @returns {Promise<Proof>} A promise that resolves to the generated ECDSA proof.
 *
 * The function serializes the credential payload to JSON, hashes it using Solidity's packed Keccak256 hashing function,
 * and signs the hash using the ECDSA algorithm. It then constructs a proof object with the necessary metadata,
 * including the type, proof purpose, verification method, creation date, and the signature value.
 */
function makeECDSAProof(privateKey, did, data, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const json = JSON.stringify(data);
        const hash = (0, ethers_1.solidityPackedKeccak256)(['string'], [json]);
        const ethrDid = new EthrDid_1.EthrDID(privateKey);
        const signature = yield ethrDid.wallet.signMessage(hash);
        let verificationMethod;
        if (options === null || options === void 0 ? void 0 : options.ethrDidRegistry) {
            const signatureRole = (options === null || options === void 0 ? void 0 : options.signatureRole)
                ? '#' + (options === null || options === void 0 ? void 0 : options.signatureRole)
                : '#controller';
            verificationMethod = ethrDid.wallet.address + signatureRole;
            if (!(yield (0, EthrDid_1.checkAddressEthrDidSigDelegate)(ethrDid.wallet.address, did))) {
                throw new Error('Signer is not a delegate or controller of the DID');
            }
        }
        else {
            if (!did.includes(ethrDid.wallet.address)) {
                throw new Error('did and private key do not match');
            }
            verificationMethod = did + '#key-1';
        }
        const proof = {
            type: 'EcdsaSecp256k1Signature2019',
            proofPurpose: 'assertionMethod',
            verificationMethod,
            created: new Date().toISOString(),
            proofValue: signature,
        };
        return proof;
    });
}
//# sourceMappingURL=issueEcdsaVc.js.map