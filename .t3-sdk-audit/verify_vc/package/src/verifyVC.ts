import {
  SignedCredential,
  VerificationOptions,
  VerificationResult,
} from '@terminal3/vc_core';
import { verifyBbsVc, verifyBbsVCW3c } from '@terminal3/bbs_vc';
import { verifyEcdsaVc } from '@terminal3/ecdsa_vc';

export async function verifyVc(
  vc: SignedCredential,
  options?: VerificationOptions,
): Promise<VerificationResult> {
  if (!vc.proof) {
    throw new Error('Proof not found in VC');
  }
  if (!vc.proof.type) {
    throw new Error('Proof type not found in VC');
  }
  switch (vc.proof.type) {
    case 'BbsPlusSignature2020': {
      return verifyBbsVc(vc, options);
    }
    case 'EcdsaSecp256k1Signature2019': {
      return verifyEcdsaVc(vc, options);
    }
    case 'DataIntegrityProof': {
      switch (vc.proof.cryptosuite) {
        case 'bbs-2023': {
          return verifyBbsVCW3c(vc);
        }
        default: {
          throw new Error('Unsupported cryptosuite: ' + vc.proof.cryptosuite);
        }
      }
    }
    default: {
      throw new Error('Unsupported proof type: ' + vc.proof.type);
    }
  }
}
