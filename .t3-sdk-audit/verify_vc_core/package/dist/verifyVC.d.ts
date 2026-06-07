import { SignedCredential, VerificationOptions, VerificationResult } from '@terminal3/vc_core';
export declare function verifyVcNonSpecificPart(vc: SignedCredential, options?: VerificationOptions): Promise<VerificationResult>;
export declare function verifyVcFields(vc: SignedCredential): VerificationResult;
