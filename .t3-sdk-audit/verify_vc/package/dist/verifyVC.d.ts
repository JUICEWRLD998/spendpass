import { SignedCredential, VerificationOptions, VerificationResult } from '@terminal3/vc_core';
export declare function verifyVc(vc: SignedCredential, options?: VerificationOptions): Promise<VerificationResult>;
