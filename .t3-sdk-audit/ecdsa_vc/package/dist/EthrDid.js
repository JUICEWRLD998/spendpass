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
exports.didResolver = exports.EthrDID = void 0;
exports.ethrDidFromPublicKey = ethrDidFromPublicKey;
exports.ethrPublicKeyFromPrivateKey = ethrPublicKeyFromPrivateKey;
exports.checkAddressEthrDidSigDelegate = checkAddressEthrDidSigDelegate;
const vc_core_1 = require("@terminal3/vc_core");
const did_resolver_1 = require("did-resolver");
const ethers_1 = require("ethers");
const ethr_did_resolver_1 = require("ethr-did-resolver");
/**
 * A Decentralized Identifier (DID) with an Ethereum address as the identifier.
 * The DID is formatted as `did:ethr:${address}`.
 * Specification is available at https://github.com/decentralized-identity/ethr-did-resolver/blob/master/doc/did-method-spec.md
 * chainName is optional and all three of the following are valid and resolve to equivalent DID Documents:
 * did:ethr:mainnet:0xb9c5714089478a327f09197987f16f9e5d936e8a
 * did:ethr:0x1:0xb9c5714089478a327f09197987f16f9e5d936e8a
 * did:ethr:0xb9c5714089478a327f09197987f16f9e5d936e8a
 */
class EthrDID extends vc_core_1.DIDWithKey {
    constructor(privateKeyHex, chainName) {
        if (!privateKeyHex.startsWith('0x')) {
            privateKeyHex = '0x' + privateKeyHex;
        }
        if (!chainName) {
            chainName = '';
        }
        const signingKey = new ethers_1.SigningKey(privateKeyHex);
        const wallet = new ethers_1.Wallet(signingKey);
        const identifier = `${chainName}:${wallet.address}`;
        super('ethr', identifier, signingKey);
        this.wallet = wallet;
    }
}
exports.EthrDID = EthrDID;
/**
 *  An uncompressed public key is expected as input.
 *
 * This will always begin with the prefix ``0x04`` and be 132
 * characters long (the ``0x`` prefix and 130 hexadecimal nibbles).
 */
function ethrDidFromPublicKey(publicKey) {
    // check if it is a public key
    if (publicKey.length !== 132 || !publicKey.startsWith('0x04')) {
        throw new Error('Public key must be uncompressed. Expected 132 characters long with a prefix of 0x04');
    }
    (0, ethers_1.getAddress)((0, ethers_1.keccak256)('0x' + publicKey.substring(4)).substring(26));
    return new vc_core_1.DID('ethr', publicKey);
}
function ethrPublicKeyFromPrivateKey(secretKey) {
    if (!secretKey.startsWith('0x')) {
        secretKey = '0x' + secretKey;
    }
    const signingKey = new ethers_1.SigningKey(secretKey);
    return signingKey.publicKey;
}
const providerConfig = {
    networks: [
        {
            chainId: 421614,
            name: 'arbitrumSepolia',
            rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
            registry: '0x03d5003bf0e79C5F5223588F347ebA39AfbC3818',
        },
        // TODO: add more networks
    ],
};
exports.didResolver = new did_resolver_1.Resolver((0, ethr_did_resolver_1.getResolver)(providerConfig));
function checkAddressEthrDidSigDelegate(address, did) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const didResolved = yield exports.didResolver.resolve(did);
        let res = false;
        (_b = (_a = didResolved.didDocument) === null || _a === void 0 ? void 0 : _a.verificationMethod) === null || _b === void 0 ? void 0 : _b.forEach((method) => {
            if (method.id.toLowerCase().includes(address.toLowerCase() + '#delegate') ||
                method.id.toLowerCase().includes(address.toLowerCase() + '#controller')) {
                res = true;
            }
        });
        return res;
    });
}
//# sourceMappingURL=EthrDid.js.map