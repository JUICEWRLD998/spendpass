export type DIDString = `did:${string}:${string}`;

export function isDIDString(str: string): str is DIDString {
  return str.startsWith('did:');
}

export function getMethodIdentifier(did: DIDString): [string, string] {
  const did_elements = did.split(':');
  did_elements.shift();
  const method = did_elements.shift();
  if (!method) {
    throw new Error(`Invalid DID: ${did}`);
  }
  const identifier = did_elements.join(':');
  return [method, identifier];
}

export class DID {
  did: DIDString;

  constructor(method: string, identifier: string) {
    this.did = `did:${method}:${identifier}`;
  }
}

export interface AbstractSigningKey {
  get privateKey(): string;
  get publicKey(): string;
}
export class RawSigningKey implements AbstractSigningKey {
  privateKey: string;
  publicKey: string;

  constructor(privateKey: string, publicKey: string) {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }
}

export class DIDWithKey extends DID {
  signingKey: AbstractSigningKey;

  constructor(
    method: string,
    identifier: string,
    signingKey: AbstractSigningKey,
  ) {
    super(method, identifier);
    this.signingKey = signingKey;
  }
}
