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
exports.getPublicKeyFromDidKey = getPublicKeyFromDidKey;
exports.getEthAddressFromIdentifier = getEthAddressFromIdentifier;
exports.stripHexPrefix = stripHexPrefix;
exports.adjustIndex = adjustIndex;
const ethers_1 = require("ethers");
const didManager_1 = require("./didManager");
const did_jwt_1 = require("did-jwt");
/**
 * Retrieves the public key from a DID formatted as a "did:key" URL.
 *
 * @param {string} issuer - The issuer DID string.
 * @returns {string} The public key extracted from the DID.
 */
function getPublicKeyFromDidKey(issuer) {
    if (!issuer.startsWith('did:key:')) {
        throw new Error('Only did:key is supported');
    }
    const { keyBytes } = (0, did_jwt_1.multibaseToBytes)(issuer.split('did:key:')[1]);
    const publicKey = Buffer.from(keyBytes).toString('hex');
    return publicKey;
}
/**
 * Retrieves the Ethereum address associated with a DID using the specified method.
 *
 * @param {DIDString} did - The decentralized identifier.
 * @param {VerificationOptions} options - Settings required for accessing different registries or providers.
 * @returns {Promise<string>} A promise that resolves to the Ethereum address associated with the DID.
 *
 * @throws {Error} If an invalid DID is provided or necessary options are missing, such as the provider or DID registry address.
 */
function getEthAddressFromIdentifier(did, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const [method, identifier] = (0, didManager_1.getMethodIdentifier)(did);
        switch (method) {
            case 'ethr': {
                if (identifier.startsWith('0x')) {
                    return identifier;
                }
                else {
                    const elements = identifier.split(':');
                    elements.shift();
                    if (!elements[0] || !elements[0].startsWith('0x')) {
                        throw new Error(`Invalid DID: ${did}`);
                    }
                    return elements[0];
                }
            }
            case 'key': {
                if (!options.provider) {
                    throw new Error('Provider is required when using key method');
                }
                if (!options.didRegistryAddress) {
                    throw new Error('DID registry address is required');
                }
                const didRegistry = new ethers_1.ethers.Contract(yield options.didRegistryAddress, 
                // {"constant":false,"inputs":[{"indexed":false,"internalType":"string","name":"","type":"string"}],"name":"issuers","outputs":[{"internalType":"address","name":"issuerAddress","type":"address"},{"internalType":"string","name":"issuerName","type":"string"}],"payable":false,"stateMutability":"view","type":"function"}
                ['function issuers(string did) view returns (address, string)'], options.provider);
                const [eth_address] = (yield didRegistry.issuers(did));
                return eth_address;
            }
            // get it from the registry
            default:
                throw new Error(`Unsupported DID method: ${method}`);
        }
    });
}
function stripHexPrefix(secretKey) {
    if (secretKey.startsWith('0x')) {
        secretKey = secretKey.slice(2);
    }
    return secretKey;
}
function adjustIndex(index) {
    return index + 1;
}
//# sourceMappingURL=utils.js.map