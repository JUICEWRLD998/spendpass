"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIDWithKey = exports.RawSigningKey = exports.DID = void 0;
exports.isDIDString = isDIDString;
exports.getMethodIdentifier = getMethodIdentifier;
function isDIDString(str) {
    return str.startsWith('did:');
}
function getMethodIdentifier(did) {
    const did_elements = did.split(':');
    did_elements.shift();
    const method = did_elements.shift();
    if (!method) {
        throw new Error(`Invalid DID: ${did}`);
    }
    const identifier = did_elements.join(':');
    return [method, identifier];
}
class DID {
    constructor(method, identifier) {
        this.did = `did:${method}:${identifier}`;
    }
}
exports.DID = DID;
class RawSigningKey {
    constructor(privateKey, publicKey) {
        this.privateKey = privateKey;
        this.publicKey = publicKey;
    }
}
exports.RawSigningKey = RawSigningKey;
class DIDWithKey extends DID {
    constructor(method, identifier, signingKey) {
        super(method, identifier);
        this.signingKey = signingKey;
    }
}
exports.DIDWithKey = DIDWithKey;
//# sourceMappingURL=didManager.js.map