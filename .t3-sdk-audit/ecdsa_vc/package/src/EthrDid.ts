import { DID, DIDWithKey } from '@terminal3/vc_core';
import { Resolver } from 'did-resolver';
import { Wallet, SigningKey, getAddress, keccak256 } from 'ethers';
import { getResolver } from 'ethr-did-resolver';

/**
 * A Decentralized Identifier (DID) with an Ethereum address as the identifier.
 * The DID is formatted as `did:ethr:${address}`.
 * Specification is available at https://github.com/decentralized-identity/ethr-did-resolver/blob/master/doc/did-method-spec.md
 * chainName is optional and all three of the following are valid and resolve to equivalent DID Documents:
 * did:ethr:mainnet:0xb9c5714089478a327f09197987f16f9e5d936e8a
 * did:ethr:0x1:0xb9c5714089478a327f09197987f16f9e5d936e8a
 * did:ethr:0xb9c5714089478a327f09197987f16f9e5d936e8a
 */
export class EthrDID extends DIDWithKey {
  wallet: Wallet;
  constructor(privateKeyHex: string, chainName?: string) {
    if (!privateKeyHex.startsWith('0x')) {
      privateKeyHex = '0x' + privateKeyHex;
    }
    if (!chainName) {
      chainName = '';
    }
    const signingKey = new SigningKey(privateKeyHex);
    const wallet = new Wallet(signingKey);
    const identifier = `${chainName}:${wallet.address}`;
    super('ethr', identifier, signingKey);
    this.wallet = wallet;
  }
}
/**
 *  An uncompressed public key is expected as input.
 *
 * This will always begin with the prefix ``0x04`` and be 132
 * characters long (the ``0x`` prefix and 130 hexadecimal nibbles).
 */
export function ethrDidFromPublicKey(publicKey: string): DID {
  // check if it is a public key
  if (publicKey.length !== 132 || !publicKey.startsWith('0x04')) {
    throw new Error(
      'Public key must be uncompressed. Expected 132 characters long with a prefix of 0x04',
    );
  }
  getAddress(keccak256('0x' + publicKey.substring(4)).substring(26));
  return new DID('ethr', publicKey);
}

export function ethrPublicKeyFromPrivateKey(secretKey: string): string {
  if (!secretKey.startsWith('0x')) {
    secretKey = '0x' + secretKey;
  }
  const signingKey = new SigningKey(secretKey);
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

export const didResolver = new Resolver(getResolver(providerConfig));

export async function checkAddressEthrDidSigDelegate(
  address: string,
  did: string,
): Promise<boolean> {
  const didResolved = await didResolver.resolve(did);

  let res = false;

  didResolved.didDocument?.verificationMethod?.forEach((method) => {
    if (
      method.id.toLowerCase().includes(address.toLowerCase() + '#delegate') ||
      method.id.toLowerCase().includes(address.toLowerCase() + '#controller')
    ) {
      res = true;
    }
  });
  return res;
}
