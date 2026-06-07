"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareCredentialPayload = prepareCredentialPayload;
const constants_1 = require("./constants");
const uuid_1 = require("uuid");
/**
 * Prepares the payload for a verifiable credential (VC) based on the provided parameters.
 *
 * @param {string[] | undefined} type - Additional types for the credential, excluding 'VerifiableCredential'.
 * @param {DIDWithKey} issuer - The DID of the issuer along with their public key.
 * @param {DID} user - The DID of the user who will be the subject of the credential.
 * @param {Record<string, unknown>} credentials - Additional attributes or claims to be included in the credential subject.
 * @param {Date} validFrom - The date from which the credential is valid. If undefined, it will default to the current date.
 * @param {Date} validUntil - The expiration date of the credential. If undefined, it will not set an expiration.
 * @param {VerificationOptions} [options] - Optional settings that influence additional properties like revocation.
 * @returns {Promise<CredentialPayload>} A promise that resolves to the structured credential payload ready for signing and issuance.
 *
 * The function filters out 'VerifiableCredential' from the type array to avoid duplication, then constructs the credential payload with mandatory and provided types.
 * It also conditionally includes credential status information if revocation-related options are provided.
 *
 * Every credential will have following mandatory fields based on w3c 2.0 specification
 * @context - mandatory
 * id - it is optional in w3c but mandatory in our implementation. We use random number
 * type - mandatory. It should include “VerifiableCredential” and, optionally, a more specific verifiable credential type. For example, "type": ["VerifiableCredential", "ExampleDegreeCredential"]. We will use BBS-plus-24-values-separated
 * issuer - DID of the issuer
 * validFrom - date and time in the format "2010-01-01T19:23:24Z"
 * validUntil - see above, may be empty
 * credentialStatus - we will include a URL to the revocation registry into the status
 * credentialSubject - a nested structure for schema, credentialSubject.id is mandatory which is the DID of the user
 */
function prepareCredentialPayload(type, issuer, user, credentials, validFrom, validUntil, options) {
    return __awaiter(this, void 0, void 0, function* () {
        type = type ? type.filter((t) => t !== 'VerifiableCredential') : [];
        // check if both validFrom and validUntil are provided that validFrom is before validUntil
        if (validFrom && validUntil && validFrom > validUntil) {
            throw new Error('validFrom date must not be after validUntil date');
        }
        const credentialPayload = {
            '@context': [constants_1.MANDATORY_CONTEXT_URI],
            type: ['VerifiableCredential', ...type],
            issuer: issuer.did,
            validFrom: validFrom === undefined
                ? new Date().toISOString()
                : validFrom.toISOString(),
            validUntil: validUntil === undefined ? '' : validUntil.toISOString(),
            credentialSubject: Object.assign({ id: user.did }, credentials),
        };
        const id = (0, uuid_1.v4)();
        credentialPayload.id = ('urn:uuid:' + id);
        if (options &&
            (options === null || options === void 0 ? void 0 : options.revocationRegistryAddress) &&
            (options === null || options === void 0 ? void 0 : options.provider) &&
            (options === null || options === void 0 ? void 0 : options.didRegistryAddress)) {
            credentialPayload.credentialStatus = {
                type: 'T3RevocationRegistry',
                chain_id: String((yield options.provider.getNetwork()).chainId),
                revocation_registry_contract_address: options.revocationRegistryAddress,
                did_registry_contract_address: options.didRegistryAddress,
            };
        }
        return credentialPayload;
    });
}
//# sourceMappingURL=prepareCredentialPayload.js.map