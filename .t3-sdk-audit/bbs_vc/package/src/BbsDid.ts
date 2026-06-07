import { bls12_381 } from '@noble/curves/bls12-381';
import {
  DIDWithKey,
  stripHexPrefix,
  AbstractSigningKey,
  DID,
  BLS_G1_GROUP_SIZE,
} from '@terminal3/vc_core';
import { bytesToMultibase } from 'did-jwt';

export class BbsDID extends DIDWithKey {
  constructor(privateKeyHex: string) {
    const blsSigningKey = new BlsSigningKey(privateKeyHex);
    const methodSpecificId = multibaseBls12381G2PubKey(blsSigningKey.publicKey);
    super('key', methodSpecificId, blsSigningKey);
  }
}
export function bbsDidFromPublicKey(publicKey: string): DID {
  const methodSpecificId: string = multibaseBls12381G2PubKey(publicKey);
  return new DID('key', methodSpecificId);
}

function multibaseBls12381G2PubKey(publicKey: string): string {
  const keyCodecs = {
    Bls12381G2: 'bls12_381-g2-pub',
  } as const;
  const keyType = 'Bls12381G2';
  return bytesToMultibase(
    Buffer.from(publicKey, 'hex'),
    'base58btc',
    keyCodecs[keyType],
  );
}

export function blsG2PublicKeyFromPrivateKey(secretKey: string): string {
  secretKey = stripHexPrefix(secretKey);
  const secretKeyBytes = Buffer.from(secretKey, 'hex');
  return Buffer.from(
    bls12_381.getPublicKeyForShortSignatures(secretKeyBytes),
  ).toString('hex');
}
export class BlsSigningKey implements AbstractSigningKey {
  secretKey: string; // hex string without 0x prefix
  pubKey: string;

  constructor(privateKeyHex: string) {
    privateKeyHex = stripHexPrefix(privateKeyHex);
    if (privateKeyHex > BLS_G1_GROUP_SIZE) {
      throw new Error(
        `Your key is too high. It should be less than '0x${BLS_G1_GROUP_SIZE}' which is the size of the G1 group of the curve Bls12-381`,
      );
    }
    this.secretKey = privateKeyHex;
    const publicKey = blsG2PublicKeyFromPrivateKey(privateKeyHex);
    if (publicKey.length !== 192) {
      throw new Error('Invalid public key length');
    }
    this.pubKey = publicKey;
  }

  get privateKey(): string {
    return this.secretKey;
  }

  get publicKey(): string {
    return this.pubKey;
  }
}
