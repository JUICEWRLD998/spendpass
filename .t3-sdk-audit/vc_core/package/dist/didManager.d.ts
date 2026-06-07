export type DIDString = `did:${string}:${string}`;
export declare function isDIDString(str: string): str is DIDString;
export declare function getMethodIdentifier(did: DIDString): [string, string];
export declare class DID {
    did: DIDString;
    constructor(method: string, identifier: string);
}
export interface AbstractSigningKey {
    get privateKey(): string;
    get publicKey(): string;
}
export declare class RawSigningKey implements AbstractSigningKey {
    privateKey: string;
    publicKey: string;
    constructor(privateKey: string, publicKey: string);
}
export declare class DIDWithKey extends DID {
    signingKey: AbstractSigningKey;
    constructor(method: string, identifier: string, signingKey: AbstractSigningKey);
}
