import { ethers } from 'ethers';
import { DIDString, getMethodIdentifier } from './didManager';
import { VerificationOptions } from './types';
import { multibaseToBytes } from 'did-jwt';

/**
 * Retrieves the public key from a DID formatted as a "did:key" URL.
 *
 * @param {string} issuer - The issuer DID string.
 * @returns {string} The public key extracted from the DID.
 */
export function getPublicKeyFromDidKey(issuer: string): string {
  if (!issuer.startsWith('did:key:')) {
    throw new Error('Only did:key is supported');
  }
  const { keyBytes } = multibaseToBytes(issuer.split('did:key:')[1]);
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
export async function getEthAddressFromIdentifier(
  did: DIDString,
  options: VerificationOptions,
): Promise<string> {
  const [method, identifier] = getMethodIdentifier(did);
  switch (method) {
    case 'ethr': {
      if (identifier.startsWith('0x')) {
        return identifier;
      } else {
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
      const didRegistry = new ethers.Contract(
        await options.didRegistryAddress,
        // {"constant":false,"inputs":[{"indexed":false,"internalType":"string","name":"","type":"string"}],"name":"issuers","outputs":[{"internalType":"address","name":"issuerAddress","type":"address"},{"internalType":"string","name":"issuerName","type":"string"}],"payable":false,"stateMutability":"view","type":"function"}
        ['function issuers(string did) view returns (address, string)'],
        options.provider,
      );
      const [eth_address] = (await didRegistry.issuers(did)) as string[];
      return eth_address;
    }

    // get it from the registry
    default:
      throw new Error(`Unsupported DID method: ${method}`);
  }
}

export function stripHexPrefix(secretKey: string) {
  if (secretKey.startsWith('0x')) {
    secretKey = secretKey.slice(2);
  }
  return secretKey;
}

export function adjustIndex(index: number): number {
  return index + 1;
}
