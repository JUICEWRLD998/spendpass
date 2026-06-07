import { ethers } from 'ethers';
import { VerificationOptions } from '@terminal3/vc_core';
import { getEthAddressFromIdentifier } from '@terminal3/vc_core';
import { DIDString } from '@terminal3/vc_core';

/**
 * Revokes a verifiable credential (VC) on the blockchain using the issuer's identification and credentials.
 *
 * @param {string} vcId - The ID of the verifiable credential to be revoked.
 * @param {DIDString} issuer - The decentralized identifier (DID) of the issuer of the VC.
 * @param {string} privateKey - The private key of the issuer used to authenticate the revocation transaction.
 * @param {VerificationOptions} options - Configuration options including the blockchain provider and revocation registry address.
 * @returns {Promise<void>} A promise that resolves when the transaction is successfully committed to the blockchain.
 *
 * @throws {Error} If the required revocation registry address or provider are not provided in the options.
 * @throws {Error} If the Ethereum address derived from the DID does not match the address derived from the private key.
 */
export async function revokeVC(
  vcId: string,
  issuer: DIDString,
  privateKey: string,
  options: VerificationOptions,
): Promise<void> {
  if (!options.revocationRegistryAddress) {
    throw new Error('Revocation registry address is required');
  }
  if (!options.provider) {
    throw new Error('Provider is required');
  }
  const signer = new ethers.Wallet(privateKey, options.provider);
  const eth_address = await getEthAddressFromIdentifier(issuer, options);
  if (eth_address !== signer.address) {
    throw new Error(
      'Eth address from the DID registry does not match the signer',
    );
  }
  const contract = new ethers.Contract(
    await options.revocationRegistryAddress,
    ['function revoke(string vcHash) public'],
    signer,
  );
  await contract.revoke(vcId);
}

/**
 * Checks if a verifiable credential has been revoked.
 * @param {string} vcId - id of the the VC to check
 * @param {DIDString} issuer - did of the issuer of the VC
 * @param {VerificationOptions} options - Settings required for accessing the revocation registry.
 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether the credential is revoked.
 * @throws {Error} If the revocation registry address or provider is not set in the options.
 */
export async function isRevoked(
  vcId: string,
  issuer: DIDString,
  options: VerificationOptions,
): Promise<boolean> {
  if (!options.revocationRegistryAddress) {
    throw new Error('Revocation registry address is required');
  }
  if (!options.provider) {
    throw new Error('Provider is required');
  }
  const eth_address = await getEthAddressFromIdentifier(issuer, options);

  // make a call to the revocation registry through ethers with chain id and address
  const revocationRegistry = new ethers.Contract(
    await options.revocationRegistryAddress,
    ['function revoked(address issuer, string id) view returns (bool)'],
    options.provider,
  );

  // check if the credential is revoked
  const isRevoked = (await revocationRegistry.revoked(
    eth_address,
    vcId,
  )) as boolean;
  if (isRevoked) {
    return true;
  }

  return false;
}
