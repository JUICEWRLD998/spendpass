import { blsVerifyProof } from '@mattrglobal/bbs-signatures';
import { getMessages } from '@terminal3/bbs_vc';
import { SignedCredential, VerificationResult } from '@terminal3/vc_core';
import { verifyEcdsaVcSig } from '@terminal3/ecdsa_vc';
import {
  getPublicKeyFromDidKey,
  VerificationOptions,
} from '@terminal3/vc_core';
import { VerifiablePresentation } from '@terminal3/vc_core';
import { verifyVcNonSpecificPart } from '@terminal3/verify_vc_core';
import { verifyBbsVpW3c } from './verifyBbsVpW3c';
export async function verifyPresentation(
  vp: VerifiablePresentation,
  options?: VerificationOptions,
): Promise<VerificationResult> {
  const results = await Promise.all(
    vp.credentials.map(async (vc) => {
      const vericationResult = await verifyVcNonSpecificPart(
        vc as SignedCredential,
        options,
      );
      if (!vericationResult.isValid) {
        return vericationResult;
      }
      const proof = vc.proof;
      if (!proof) {
        throw new Error('Proof not found in VC');
      }
      if (!vc.proof.type) {
        throw new Error('Proof type not found in VC');
      }
      switch (vc.proof.type) {
        case 'BbsPlusSignature2020Proof': {
          const proofUint8 = Uint8Array.from(
            Buffer.from(proof.proofValue, 'hex'),
          );
          if (!vc.issuer) {
            throw new Error('Issuer not found in VC');
          }
          const publicKey = getPublicKeyFromDidKey(vc.issuer);
          const publicKeyUint8 = Uint8Array.from(Buffer.from(publicKey, 'hex'));
          const mandatoryPointers = proof.mandatoryPointers;
          if (!mandatoryPointers) {
            throw new Error('Mandatory pointers not found in proof');
          }

          const { proof: _proof, ...vcPayload } = vc;
          const messages = getMessages(vcPayload, mandatoryPointers);
          const messagesUint8 = messages.map((message) =>
            Uint8Array.from(Buffer.from(message, 'utf8')),
          );
          const res = await blsVerifyProof({
            proof: proofUint8,
            publicKey: publicKeyUint8,
            messages: messagesUint8,
            nonce: Uint8Array.from(Buffer.from('nonce', 'utf8')),
          });
          if (!res.verified) {
            return {
              isValid: false,
              message: `BBS+ verification failed for VC with id ${vc.id}`,
            } as VerificationResult;
          }
          return { isValid: true, message: 'BBS+ verification successful' };
        }
        case 'DataIntegrityProof': {
          switch (vc.proof.cryptosuite) {
            case 'bbs-2023': {
              return verifyBbsVpW3c(vc);
            }
            default: {
              throw new Error(
                `Unsupported cryptosuite ${vc.proof.cryptosuite} in VC with id ${vc.id}`,
              );
            }
          }
        }
        case 'EcdsaSecp256k1Signature2019': {
          const res = await verifyEcdsaVcSig(vc as SignedCredential);
          if (!res.isValid) {
            return {
              isValid: false,
              message: `ECDSA verification failed for VC with id ${vc.id}`,
            } as VerificationResult;
          }
          return { isValid: true, message: 'ECDSA verification successful' };
        }
        default: {
          throw new Error(
            `Unsupported proof type ${vc.proof.type} in VC with id ${vc.id}`,
          );
        }
      }
    }),
  );
  for (const result of results) {
    if (!result.isValid) {
      return result;
    }
  }

  return { isValid: true, message: 'vp verified successfully' };
}
