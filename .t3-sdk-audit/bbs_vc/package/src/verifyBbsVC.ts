import { verifyVcNonSpecificPart } from '@terminal3/verify_vc_core';
import { decodeCbor, getGroupedMessages, getMessages } from './issueBbsVc';
import { SignedCredential, VerificationResult } from '@terminal3/vc_core';
import { CredentialPayload } from '@terminal3/vc_core';
import { blsVerify } from '@mattrglobal/bbs-signatures';
import { VerificationOptions } from '@terminal3/vc_core';
import { getPublicKeyFromDidKey } from '@terminal3/vc_core';
import base64url from 'base64url';
import { DocumentLoader, localLoader } from './localLoader';
import { getMessagesW3c } from './getMessagesW3c';
import { bytesToHex } from '@noble/hashes/utils';
import util from 'util';

/**
 * Verifies a verifiable credential using BBS+ signatures.
 *
 * @param {CredentialPayload} data - The payload of the verifiable credential.
 * @param {string} signature - The BBS+ signature in string format.
 * @param {string[]} mandatory - Array of mandatory message pointers used in the credential.
 * @param {VerificationOptions} [options] - Optional settings for the verification process.
 * @returns {Promise<VerificationResult>} A promise that resolves to the result of the verification, including validity and messages.
 *
 * @throws {Error} If the credential issuer is undefined or necessary options are missing, such as the provider.
 */
export async function verifyBbsVc(
  vc: SignedCredential,
  options?: VerificationOptions,
): Promise<VerificationResult> {
  // Extract the BBS+ public key from the issuer
  const vericationResult = await verifyVcNonSpecificPart(vc, options);
  if (!vericationResult.isValid) {
    return vericationResult;
  }
  const data = (({ proof, ...others }) => ({ ...others }))(
    vc,
  ) as CredentialPayload;
  const signature = vc.proof?.proofValue;
  const issuer = data.issuer;

  if (!issuer) throw new Error('Credential issuer is undefined');

  // Reconstruct the array of messages as in the signing process
  switch (vc.proof.type) {
    case 'BbsPlusSignature2020': {
      const mandatory = vc.proof?.mandatoryPointers;
      if (mandatory == undefined) {
        throw new Error(
          `Mandatory pointers are required for BBS+ verification. proof: ${util.inspect(vc.proof)}`,
        );
      }
      const publicKey = getPublicKeyFromDidKey(issuer);
      const messages = getMessages(data, mandatory);
      const publicKeyUint8 = Uint8Array.from(Buffer.from(publicKey, 'hex'));
      const signatureUint8 = Uint8Array.from(Buffer.from(signature, 'hex'));
      const messagesUint8 = messages.map((message) =>
        Uint8Array.from(Buffer.from(message, 'utf-8')),
      );

      const isVerified = await blsVerify({
        publicKey: publicKeyUint8,
        messages: messagesUint8,
        signature: signatureUint8,
      });
      return {
        isValid: isVerified.verified,
        message: isVerified.verified
          ? 'Verification successful'
          : `BBS+ signature verification failed: ${isVerified.error}`,
      };
    }
    case 'DataIntegrityProof': {
      switch (vc.proof.cryptosuite) {
        case 'bbs-2023': {
          return verifyBbsVCW3c(vc);
        }
        default:
          throw new Error(
            `vc.proof.cryptosuite ${vc.proof.cryptosuite} unsupported for vc.proof.type DataIntegrityProof`,
          );
      }
    }

    default: {
      throw new Error(`Unsupported proof type: ${vc.proof.type}`);
    }
  }
}

/**
 * verify a signed selective disclosure base document (credential) with `bbs-2023`
 * procedures. This is can be done by an holder on receipt of the credential.
 *
 * @param {Object} vc - The signed `bbs-2023` base credential
 
 */
export async function verifyBbsVCW3c(
  vc: SignedCredential,
): Promise<VerificationResult> {
  // parseBaseProofValue:
  const data = (({ proof, ...others }) => ({ ...others }))(
    vc,
  ) as CredentialPayload;
  const proofValue = vc.proof.proofValue; // base64url encoded
  const proofValueBytes = base64url.toBuffer(proofValue);
  // console.log(proofValueBytes.length);
  // check header bytes are: 0xd9, 0x5d, and 0x02
  if (
    proofValueBytes[0] !== 0xd9 ||
    proofValueBytes[1] !== 0x5d ||
    proofValueBytes[2] !== 0x02
  ) {
    throw new Error('Invalid proofValue header');
  }
  const {
    bbsSignature,
    bbsHeader: bbsHeaderBase,
    publicKey: publicKeyBase,
    hmacKey,
    mandatoryPointers,
  } = decodeCbor(proofValueBytes.subarray(3));
  // console.log('mandatoryPointers:', mandatoryPointers);
  getGroupedMessages(mandatoryPointers, data);
  const issuer = data.issuer;

  // canonize proof configuration and hash it
  const proofConfig = (({ proofValue, ...others }) => ({ ...others }))(
    vc.proof,
  );
  proofConfig['@context'] = data['@context'];
  // console.log(`proofHash: ${bytesToHex(proofHash)}`)

  // **Verify BBS signature**
  const {
    bbsHeader,
    bbsMessages,
    hmacKey: hmacKey1,
    mandatoryPointers: mandatory1,
  } = await getMessagesW3c(data, mandatoryPointers, issuer, {
    proofConfig: proofConfig,
    hmacKey: Buffer.from(hmacKey, 'hex'),
    documentLoader: localLoader as unknown as DocumentLoader,
  });

  if (hmacKey !== Buffer.from(hmacKey1).toString('hex')) {
    throw new Error('hmacKey and hmacKey1 DO NOT match!');
  }
  if (mandatoryPointers !== mandatory1) {
    console.log('mandatoryPointers:', mandatoryPointers);
    console.log('mandatory1:', mandatory1);
    throw new Error('mandatoryPointers and mandatory1 DO NOT match!');
  }
  // TODO bytestohex should be done standard way
  if (bytesToHex(bbsHeader) !== bbsHeaderBase) {
    // console.log('computed bbsHeader and bbsHeader from base DO NOT match!')
    console.log('computed bbsHeader:', bytesToHex(bbsHeader));
    console.log('bbsHeader from base:', bbsHeaderBase);
    return {
      isValid: false,
      message: 'Computed bbsHeader and bbsHeader from base DO NOT match!',
    };
  }
  const publicKey = getPublicKeyFromDidKey(issuer);
  if (publicKey != publicKeyBase) {
    console.log('publicKey:', publicKey);
    console.log('publicKeyBase:', publicKeyBase);
    throw new Error('publicKeyUint8 and publicKeyBase DO NOT match!');
  }
  const messages = [bbsHeader, ...bbsMessages];
  const signature = bbsSignature;

  return await verifyBbsSignature(publicKey, messages, signature);
}

async function verifyBbsSignature(
  publicKey: string,
  messages: Uint8Array[],
  signature: string,
): Promise<VerificationResult> {
  const publicKeyUint8 = Uint8Array.from(Buffer.from(publicKey, 'hex'));
  const signatureUint8 = Uint8Array.from(Buffer.from(signature, 'hex'));
  const isVerified = await blsVerify({
    publicKey: publicKeyUint8,
    messages,
    signature: signatureUint8,
  });
  return {
    isValid: isVerified.verified,
    message: isVerified.verified
      ? 'Verification successful'
      : `BBS+ signature verification failed: ${isVerified.error}`,
  } as VerificationResult;
}
