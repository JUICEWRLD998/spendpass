import { ethers } from 'ethers';
import { DIDString } from './didManager';

export interface ProofConfig {
  type: string;
  proofPurpose: string;
  verificationMethod: string;
  created: string;
  mandatoryPointers?: string[];
  cryptosuite?: string;
  '@context'?: string[];
}
// Proof = ProofConfig + ProofValue
export type Proof = ProofConfig & { proofValue: string };

export type SignedCredential = CredentialPayload & { proof: Proof };

export interface CredentialSubject {
  id: DIDString;
}
export type VpProof = Proof & {
  revealedPointers?: string[];
  revealedIndices?: number[];
};
export type PartialCredential = Partial<CredentialPayload> & { proof: VpProof };

export interface VerifiablePresentation {
  holder: string;
  credentials: PartialCredential[];
}
export type Uri = `${string}:${string}`;
export interface CredentialPayload {
  '@context': string[];
  id: Uri;
  issuer: DIDString;
  credentialSubject: CredentialSubject;
  type: string[];
  validFrom?: string;
  validUntil?: string;
  credentialStatus?: unknown;
}

export interface VerificationOptions {
  revocationRegistryAddress?: ethers.AddressLike;
  provider?: ethers.Provider;
  didRegistryAddress?: ethers.AddressLike;
  mandatoryPointers?: string[];
  ethrDidRegistry?: boolean;
  signatureRole?: string;
  debug?: boolean;
}

export interface VerificationResult {
  isValid: boolean;
  message: string;
}
