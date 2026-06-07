import { IDataStoreSaveVerifiableCredentialArgs, VerifiableCredential } from '@veramo/core';
import { SignedCredential } from '@terminal3/vc_core';
export declare function vc_w3c2_to_veramo(vc: SignedCredential): IDataStoreSaveVerifiableCredentialArgs;
export declare function vc_veramo_to_w3c2(vc: VerifiableCredential): SignedCredential;
