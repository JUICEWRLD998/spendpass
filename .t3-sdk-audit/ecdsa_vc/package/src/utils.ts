import { ethers } from 'ethers';
import { DIDString } from '@terminal3/vc_core';
export function getWalletAddress(did: DIDString): string {
  const did_elements = did.split(':');
  did_elements.shift();
  const method = did_elements.shift();
  switch (method) {
    case 'ethr': {
      let address = did_elements.shift();
      if (!address?.startsWith('0x')) {
        address = did_elements.shift();
      }

      if (!address) {
        throw new Error(`Invalid DID: ${did}`);
      }
      if (address.length !== 42) {
        // must be public key
        // 65 bytes with a leading \x04 byte and 33 bytes starting with either \x02 or \x03 .
        address = ethers.computeAddress(address);
        if (!address) {
          throw new Error(`Invalid DID: ${did}`);
        }
      }
      return address;
    }
    default:
      throw new Error(`Unsupported DID method: ${method}`);
  }
}
