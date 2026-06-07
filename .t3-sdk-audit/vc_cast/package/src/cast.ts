import {
  IDataStoreSaveVerifiableCredentialArgs,
  VerifiableCredential,
} from '@veramo/core';
import { SignedCredential } from '@terminal3/vc_core';

export function vc_w3c2_to_veramo(
  vc: SignedCredential,
): IDataStoreSaveVerifiableCredentialArgs {
  // w3c2 type
  // type Proof = {
  //     type: string;
  //     proofPurpose: string;
  //     verificationMethod: string;
  //     created: string;
  //     proofValue: string;
  // };
  // export type CredentialPayload = {
  //     "@context": string[];
  //     id: string;
  //     issuer: DIDString;
  //     credentialSubject: CredentialSubject;
  //     type: string[];
  //     validFrom?: string;
  //     validUntil?: string;
  //     credentialStatus?: Object;
  // };
  // export type SignedCredential = CredentialPayload & {
  //     proof: Proof;
  // };
  //
  // veramo type
  // export interface IDataStoreSaveVerifiableCredentialArgs {
  //   /**
  //    * Required. VerifiableCredential
  //    */
  //   verifiableCredential: VerifiableCredential
  // }
  // export type VerifiableCredential = UnsignedCredential & { proof: ProofType }
  // export interface UnsignedCredential {
  //   issuer: IssuerType
  //   credentialSubject: CredentialSubject
  //   type?: string[] | string
  //   '@context': ContextType
  //   issuanceDate: string
  //   expirationDate?: string
  //   credentialStatus?: CredentialStatusReference
  //   id?: string
  //   [x: string]: any
  // }
  // export interface ProofType {
  //   type?: string
  //   [x: string]: any
  // }

  const credential = {} as Record<string, unknown>;

  for (const key in vc) {
    switch (key) {
      case 'validUntil': {
        credential['expirationDate'] = vc.validUntil;
        break;
      }
      case 'validFrom': {
        credential['issuanceDate'] = vc.validFrom;
        break;
      }
      default:
        credential[key] = vc[key as keyof SignedCredential];
        break;
    }
  }

  return {
    verifiableCredential: credential,
  } as IDataStoreSaveVerifiableCredentialArgs;
}

export function vc_veramo_to_w3c2(vc: VerifiableCredential): SignedCredential {
  if (vc.credentialSubject.id === undefined) {
    throw new Error('credentialSubject.id is required');
  }
  const credential = {} as Record<string, unknown>;

  for (const key in vc) {
    switch (key) {
      case 'expirationDate': {
        credential['validUntil'] = vc.expirationDate;
        break;
      }
      case 'issuanceDate': {
        credential['validFrom'] = vc.issuanceDate;
        break;
      }
      default:
        credential[key] = vc[key as keyof VerifiableCredential];
        break;
    }
  }

  return credential as unknown as SignedCredential;
}
