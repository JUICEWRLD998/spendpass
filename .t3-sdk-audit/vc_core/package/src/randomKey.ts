import { getRandomValues } from 'crypto';

// Generate a random key
export const BLS_G1_GROUP_SIZE =
  '73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001';

export const ECDSA_GROUP_SIZE =
  'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141';

/**
 * Generate a random key.
 * @param length The length of the key.
 * @returns The random key.
 */
function randomKey(length: number): string {
  const randomBytes = getRandomValues(new Uint8Array(length));
  return Buffer.from(randomBytes).toString('hex');
}

export function randomKey32Bytes(): string {
  return randomKey(32);
}
export function randomKeyBls(): string {
  // Check that it is less than '73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001'
  while (true) {
    const key = randomKey(32);
    if (key < BLS_G1_GROUP_SIZE) {
      return key;
    }
  }
}
export function randomKeyEcdsa(): string {
  // Check that it is less than '73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001'
  while (true) {
    const key = randomKey(32);
    if (key < ECDSA_GROUP_SIZE) {
      return key;
    }
  }
}
