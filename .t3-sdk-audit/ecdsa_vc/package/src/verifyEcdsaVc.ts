import {
  CredentialPayload,
  SignedCredential,
  VerificationOptions,
  VerificationResult,
} from '@terminal3/vc_core';
import { ethers } from 'ethers';
import { getWalletAddress } from './utils';
import { verifyVcNonSpecificPart } from '@terminal3/verify_vc_core';

import { checkAddressEthrDidSigDelegate } from './EthrDid';

/**
 * Verifies a verifiable credential using ECDSA signature.
 * @param
 *
 */
export async function verifyEcdsaVc(
  vc: SignedCredential,
  options?: VerificationOptions,
): Promise<VerificationResult> {
  const vericationResult = await verifyVcNonSpecificPart(vc, options);
  if (!vericationResult.isValid) {
    return vericationResult;
  }
  return verifyEcdsaVcSig(vc, options);
}

export async function verifyEcdsaVcSig(
  vc: SignedCredential,
  options?: VerificationOptions,
): Promise<VerificationResult> {
  const data = (({ proof: _proof, ...others }) => ({ ...others }))(
    vc,
  ) as CredentialPayload;
  const signature = vc.proof?.proofValue;
  const json = JSON.stringify(data);
  const hash = ethers.solidityPackedKeccak256(['string'], [json]);
  const address = getWalletAddress(data.issuer);

  const recoveredAddress = ethers.verifyMessage(hash, signature);
  if (!vc.proof.verificationMethod.includes(recoveredAddress)) {
    throw new Error(
      'Signature does not correspond to verificationMethod in the proof',
    );
  }

  // TODO add check for the public key
  if (options && options?.ethrDidRegistry) {
    // check that recoveredAddress is in the verify method for ethrDid
    if (!vc.issuer.startsWith('did:ethr:')) {
      throw new Error(
        'Only did:ethr is supported as issuer for ecdsa VC verification',
      );
    }
    if (!(await checkAddressEthrDidSigDelegate(recoveredAddress, vc.issuer))) {
      return {
        isValid: false,
        message:
          'Signature verification failed, signer is not delegate, nor controller of the DID',
      };
    } else {
      return {
        isValid: true,
        message:
          'Signature verification successful, signer is delegate or controller of the DID',
      };
    }
  }

  return {
    isValid: address === recoveredAddress,
    message:
      address === recoveredAddress
        ? 'Verification successful'
        : 'Signature mismatch',
  };
}
