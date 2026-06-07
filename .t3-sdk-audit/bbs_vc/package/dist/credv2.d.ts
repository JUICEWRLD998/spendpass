export declare const vcv2: {
    '@context': {
        '@protected': boolean;
        '@vocab': string;
        id: string;
        type: string;
        kid: {
            '@id': string;
            '@type': string;
        };
        iss: {
            '@id': string;
            '@type': string;
        };
        sub: {
            '@id': string;
            '@type': string;
        };
        jku: {
            '@id': string;
            '@type': string;
        };
        x5u: {
            '@id': string;
            '@type': string;
        };
        aud: {
            '@id': string;
            '@type': string;
        };
        exp: {
            '@id': string;
            '@type': string;
        };
        nbf: {
            '@id': string;
            '@type': string;
        };
        iat: {
            '@id': string;
            '@type': string;
        };
        cnf: {
            '@id': string;
            '@context': {
                '@protected': boolean;
                kid: {
                    '@id': string;
                    '@type': string;
                };
                jwk: {
                    '@id': string;
                    '@type': string;
                };
            };
        };
        _sd_alg: {
            '@id': string;
        };
        _sd: {
            '@id': string;
        };
        '...': {
            '@id': string;
        };
        VerifiableCredential: {
            '@id': string;
            '@context': {
                '@protected': boolean;
                id: string;
                type: string;
                credentialSchema: {
                    '@id': string;
                    '@type': string;
                };
                credentialStatus: {
                    '@id': string;
                    '@type': string;
                };
                credentialSubject: {
                    '@id': string;
                    '@type': string;
                };
                description: {
                    '@id': string;
                    '@context': {
                        value: string;
                        lang: string;
                        dir: string;
                    };
                };
                evidence: {
                    '@id': string;
                    '@type': string;
                };
                validFrom: {
                    '@id': string;
                    '@type': string;
                };
                validUntil: {
                    '@id': string;
                    '@type': string;
                };
                issuer: {
                    '@id': string;
                    '@type': string;
                    '@context': {
                        '@protected': boolean;
                        id: string;
                        type: string;
                        description: {
                            '@id': string;
                            '@context': {
                                value: string;
                                lang: string;
                                dir: string;
                            };
                        };
                        name: {
                            '@id': string;
                            '@context': {
                                value: string;
                                lang: string;
                                dir: string;
                            };
                        };
                    };
                };
                name: {
                    '@id': string;
                    '@context': {
                        value: string;
                        lang: string;
                        dir: string;
                    };
                };
                proof: {
                    '@id': string;
                    '@type': string;
                    '@container': string;
                };
                refreshService: {
                    '@id': string;
                    '@type': string;
                };
                termsOfUse: {
                    '@id': string;
                    '@type': string;
                };
                confidenceMethod: {
                    '@id': string;
                    '@type': string;
                };
            };
        };
        VerifiablePresentation: {
            '@id': string;
            '@context': {
                '@protected': boolean;
                id: string;
                type: string;
                holder: {
                    '@id': string;
                    '@type': string;
                };
                proof: {
                    '@id': string;
                    '@type': string;
                    '@container': string;
                };
                verifiableCredential: {
                    '@id': string;
                    '@type': string;
                    '@container': string;
                    '@context': null;
                };
                termsOfUse: {
                    '@id': string;
                    '@type': string;
                };
            };
        };
        JsonSchemaCredential: string;
        JsonSchema: {
            '@id': string;
            '@context': {
                '@protected': boolean;
                id: string;
                type: string;
                jsonSchema: {
                    '@id': string;
                    '@type': string;
                };
            };
        };
        StatusList2021Credential: {
            '@id': string;
            '@context': {
                '@protected': boolean;
                id: string;
                type: string;
                description: string;
                name: string;
            };
        };
        StatusList2021: {
            '@id': string;
            '@context': {
                '@protected': boolean;
                id: string;
                type: string;
                statusPurpose: string;
                encodedList: string;
            };
        };
        StatusList2021Entry: {
            '@id': string;
            '@context': {
                '@protected': boolean;
                id: string;
                type: string;
                statusPurpose: string;
                statusListIndex: string;
                statusListCredential: {
                    '@id': string;
                    '@type': string;
                };
            };
        };
        DataIntegrityProof: {
            '@id': string;
            '@context': {
                '@protected': boolean;
                id: string;
                type: string;
                challenge: string;
                created: {
                    '@id': string;
                    '@type': string;
                };
                domain: string;
                expires: {
                    '@id': string;
                    '@type': string;
                };
                nonce: string;
                previousProof: {
                    '@id': string;
                    '@type': string;
                };
                proofPurpose: {
                    '@id': string;
                    '@type': string;
                    '@context': {
                        '@protected': boolean;
                        id: string;
                        type: string;
                        assertionMethod: {
                            '@id': string;
                            '@type': string;
                            '@container': string;
                        };
                        authentication: {
                            '@id': string;
                            '@type': string;
                            '@container': string;
                        };
                        capabilityInvocation: {
                            '@id': string;
                            '@type': string;
                            '@container': string;
                        };
                        capabilityDelegation: {
                            '@id': string;
                            '@type': string;
                            '@container': string;
                        };
                        keyAgreement: {
                            '@id': string;
                            '@type': string;
                            '@container': string;
                        };
                    };
                };
                cryptosuite: {
                    '@id': string;
                    '@type': string;
                };
                proofValue: {
                    '@id': string;
                    '@type': string;
                };
                verificationMethod: {
                    '@id': string;
                    '@type': string;
                };
            };
        };
    };
};
