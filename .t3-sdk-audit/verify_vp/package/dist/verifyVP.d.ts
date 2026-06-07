import { VerificationResult } from '@terminal3/vc_core';
import { VerificationOptions } from '@terminal3/vc_core';
import { VerifiablePresentation } from '@terminal3/vc_core';
export declare function verifyPresentation(vp: VerifiablePresentation, options?: VerificationOptions): Promise<VerificationResult>;
