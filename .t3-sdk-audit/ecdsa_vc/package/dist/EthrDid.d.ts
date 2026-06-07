import { DID, DIDWithKey } from '@terminal3/vc_core';
import { Resolver } from 'did-resolver';
import { Wallet } from 'ethers';
/**
 * A Decentralized Identifier (DID) with an Ethereum address as the identifier.
 * The DID is formatted as `did:ethr:${address}`.
 * Specification is available at https://github.com/decentralized-identity/ethr-did-resolver/blob/master/doc/did-method-spec.md
 * chainName is optional and all three of the following are valid and resolve to equivalent DID Documents:
 * did:ethr:mainnet:0xb9c5714089478a327f09197987f16f9e5d936e8a
 * did:ethr:0x1:0xb9c5714089478a327f09197987f16f9e5d936e8a
 * did:ethr:0xb9c5714089478a327f09197987f16f9e5d936e8a
 */
export declare class EthrDID extends DIDWithKey {
    wallet: Wallet;
    constructor(privateKeyHex: string, chainName?: string);
}
/**
 *  An uncompressed public key is expected as input.
 *
 * This will always begin with the prefix ``0x04`` and be 132
 * characters long (the ``0x`` prefix and 130 hexadecimal nibbles).
 */
export declare function ethrDidFromPublicKey(publicKey: string): DID;
export declare function ethrPublicKeyFromPrivateKey(secretKey: string): string;
export declare const didResolver: Resolver;
export declare function checkAddressEthrDidSigDelegate(address: string, did: string): Promise<boolean>;
