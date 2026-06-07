"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localLoader = void 0;
const credv2_1 = require("./credv2");
const CONTEXTS = {
    'https://www.w3.org/ns/credentials/v2': { '@context': credv2_1.vcv2 },
};
const localLoader = (url, _options) => {
    if (url in CONTEXTS) {
        return {
            contextUrl: '',
            // this is for a context via a link header
            document: CONTEXTS[url], // this is the actual document that was loaded
            documentUrl: url, // this is the actual context URL after redirects
        };
    }
    // uncomment if you want to load resources from remote sites
    // return nodeDocumentLoader(url);
    // comment out if your want to load resources from remote sites
    throw Error(`Only local loading currently enabled, trying to load ${url}\n`);
};
exports.localLoader = localLoader;
//# sourceMappingURL=localLoader.js.map