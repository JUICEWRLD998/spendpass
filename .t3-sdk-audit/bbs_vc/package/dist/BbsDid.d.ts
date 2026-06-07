import { DIDWithKey, AbstractSigningKey, DID } from '@terminal3/vc_core';
export declare class BbsDID extends DIDWithKey {
    constructor(privateKeyHex: string);
}
export declare function bbsDidFromPublicKey(publicKey: string): DID;
export declare function blsG2PublicKeyFromPrivateKey(secretKey: string): string;
export declare class BlsSigningKey implements AbstractSigningKey {
    secretKey: string;
    pubKey: string;
    constructor(privateKeyHex: string);
    get privateKey(): string;
    get publicKey(): string;
}
