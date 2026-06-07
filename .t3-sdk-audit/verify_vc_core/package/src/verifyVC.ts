import { isRevoked } from '@terminal3/revoke_vc';
import {
  SignedCredential,
  VerificationOptions,
  VerificationResult,
} from '@terminal3/vc_core';

export async function verifyVcNonSpecificPart(
  vc: SignedCredential,
  options?: VerificationOptions,
): Promise<VerificationResult> {
  const vericationResult = verifyVcFields(vc);
  if (!vericationResult.isValid) {
    return vericationResult;
  }

  if (options && options.revocationRegistryAddress) {
    if (!options.provider) {
      throw new Error(
        'Provider is required when revocationRegistryAddress is provided',
      );
    }
    if (await isRevoked(vc.id, vc.issuer, options)) {
      return { isValid: false, message: 'Credential has been revoked' };
    }
  }
  return { isValid: true, message: 'Common verification successful' };
}
export function verifyVcFields(vc: SignedCredential): VerificationResult {
  if (!vc.proof) {
    return {
      isValid: false,
      message: `Proof not found for VC with vc ID ${vc.id}`,
    };
  }
  const signature = vc.proof?.proofValue;

  if (!vc.issuer) {
    return {
      isValid: false,
      message: `Credential issuer is undefined for VC with vc ID ${vc.id}`,
    };
  }
  if (!signature) {
    return {
      isValid: false,
      message: `No signature found in proof for VC with vc ID ${vc.id}`,
    };
  }
  if (vc.validUntil && new Date(vc.validUntil) < new Date()) {
    return { isValid: false, message: `Credential ${vc.id} is expired` };
  }
  if (vc.validFrom && new Date(vc.validFrom) > new Date()) {
    return {
      isValid: false,
      message: `Credential ${vc.id} is not yet valid`,
    };
  }
  return { isValid: true, message: 'Verification successful' };
}
