// change the default document loader
import { RemoteDocument } from 'jsonld/jsonld-spec.js';

export type DocumentLoader = (
  url: string,
  callback: (err: Error, remoteDoc: RemoteDocument) => void,
) => Promise<RemoteDocument>;

import { vcv2 } from './credv2';

const CONTEXTS = {
  'https://www.w3.org/ns/credentials/v2': { '@context': vcv2 },
};
export const localLoader = (url: string, _options: unknown) => {
  if (url in CONTEXTS) {
    return {
      contextUrl: '',

      // this is for a context via a link header
      document: CONTEXTS[url as keyof typeof CONTEXTS], // this is the actual document that was loaded

      documentUrl: url, // this is the actual context URL after redirects
    };
  }
  // uncomment if you want to load resources from remote sites
  // return nodeDocumentLoader(url);
  // comment out if your want to load resources from remote sites
  throw Error(`Only local loading currently enabled, trying to load ${url}\n`);
};
