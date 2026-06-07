"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlsSigningKey = exports.BbsDID = void 0;
exports.bbsDidFromPublicKey = bbsDidFromPublicKey;
exports.blsG2PublicKeyFromPrivateKey = blsG2PublicKeyFromPrivateKey;
const bls12_381_1 = require("@noble/curves/bls12-381");
const vc_core_1 = require("@terminal3/vc_core");
const did_jwt_1 = require("did-jwt");
class BbsDID extends vc_core_1.DIDWithKey {
    constructor(privateKeyHex) {
        const blsSigningKey = new BlsSigningKey(privateKeyHex);
        const methodSpecificId = multibaseBls12381G2PubKey(blsSigningKey.publicKey);
        super('key', methodSpecificId, blsSigningKey);
    }
}
exports.BbsDID = BbsDID;
function bbsDidFromPublicKey(publicKey) {
    const methodSpecificId = multibaseBls12381G2PubKey(publicKey);
    return new vc_core_1.DID('key', methodSpecificId);
}
function multibaseBls12381G2PubKey(publicKey) {
    const keyCodecs = {
        Bls12381G2: 'bls12_381-g2-pub',
    };
    const keyType = 'Bls12381G2';
    return (0, did_jwt_1.bytesToMultibase)(Buffer.from(publicKey, 'hex'), 'base58btc', keyCodecs[keyType]);
}
function blsG2PublicKeyFromPrivateKey(secretKey) {
    secretKey = (0, vc_core_1.stripHexPrefix)(secretKey);
    const secretKeyBytes = Buffer.from(secretKey, 'hex');
    return Buffer.from(bls12_381_1.bls12_381.getPublicKeyForShortSignatures(secretKeyBytes)).toString('hex');
}
class BlsSigningKey {
    constructor(privateKeyHex) {
        privateKeyHex = (0, vc_core_1.stripHexPrefix)(privateKeyHex);
        if (privateKeyHex > vc_core_1.BLS_G1_GROUP_SIZE) {
            throw new Error(`Your key is too high. It should be less than '0x${vc_core_1.BLS_G1_GROUP_SIZE}' which is the size of the G1 group of the curve Bls12-381`);
        }
        this.secretKey = privateKeyHex;
        const publicKey = blsG2PublicKeyFromPrivateKey(privateKeyHex);
        if (publicKey.length !== 192) {
            throw new Error('Invalid public key length');
        }
        this.pubKey = publicKey;
    }
    get privateKey() {
        return this.secretKey;
    }
    get publicKey() {
        return this.pubKey;
    }
}
exports.BlsSigningKey = BlsSigningKey;
//# sourceMappingURL=BbsDid.js.map