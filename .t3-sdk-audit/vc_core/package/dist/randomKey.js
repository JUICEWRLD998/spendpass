"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ECDSA_GROUP_SIZE = exports.BLS_G1_GROUP_SIZE = void 0;
exports.randomKey32Bytes = randomKey32Bytes;
exports.randomKeyBls = randomKeyBls;
exports.randomKeyEcdsa = randomKeyEcdsa;
const crypto_1 = require("crypto");
// Generate a random key
exports.BLS_G1_GROUP_SIZE = '73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001';
exports.ECDSA_GROUP_SIZE = 'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141';
/**
 * Generate a random key.
 * @param length The length of the key.
 * @returns The random key.
 */
function randomKey(length) {
    const randomBytes = (0, crypto_1.getRandomValues)(new Uint8Array(length));
    return Buffer.from(randomBytes).toString('hex');
}
function randomKey32Bytes() {
    return randomKey(32);
}
function randomKeyBls() {
    // Check that it is less than '73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001'
    while (true) {
        const key = randomKey(32);
        if (key < exports.BLS_G1_GROUP_SIZE) {
            return key;
        }
    }
}
function randomKeyEcdsa() {
    // Check that it is less than '73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001'
    while (true) {
        const key = randomKey(32);
        if (key < exports.ECDSA_GROUP_SIZE) {
            return key;
        }
    }
}
//# sourceMappingURL=randomKey.js.map