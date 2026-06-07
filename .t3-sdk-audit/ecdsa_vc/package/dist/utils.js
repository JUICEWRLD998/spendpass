"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWalletAddress = getWalletAddress;
const ethers_1 = require("ethers");
function getWalletAddress(did) {
    const did_elements = did.split(':');
    did_elements.shift();
    const method = did_elements.shift();
    switch (method) {
        case 'ethr': {
            let address = did_elements.shift();
            if (!(address === null || address === void 0 ? void 0 : address.startsWith('0x'))) {
                address = did_elements.shift();
            }
            if (!address) {
                throw new Error(`Invalid DID: ${did}`);
            }
            if (address.length !== 42) {
                // must be public key
                // 65 bytes with a leading \x04 byte and 33 bytes starting with either \x02 or \x03 .
                address = ethers_1.ethers.computeAddress(address);
                if (!address) {
                    throw new Error(`Invalid DID: ${did}`);
                }
            }
            return address;
        }
        default:
            throw new Error(`Unsupported DID method: ${method}`);
    }
}
//# sourceMappingURL=utils.js.map