import { SignedCredential, VerificationOptions, VerificationResult } from '@terminal3/vc_core';
/**
 * Verifies a verifiable credential using ECDSA signature.
 * @param
 *
 */
export declare function verifyEcdsaVc(vc: SignedCredential, options?: VerificationOptions): Promise<VerificationResult>;
export declare function verifyEcdsaVcSig(vc: SignedCredential, options?: VerificationOptions): Promise<VerificationResult>;
