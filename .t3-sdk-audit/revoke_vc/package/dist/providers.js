"use strict";
// create JSON RPC provider based on the chain id
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProvider = getProvider;
const ethers_1 = require("ethers");
// https://chainlist.org/
// https://www.comparenodes.com/library/public-endpoints/
// using free providers is not recommended for production usage
// a reliable provider should be used such as Infura, Alchemy, or QuickNode
const free_providers = {
    '137': 'https://polygon.rpc.blxrbdn.com',
    '80002': 'https://rpc-amoy.polygon.technology',
    // ganache
    '1337': 'http://localhost:8545',
};
const infura_names = {
    '137': 'matic',
    '80002': 'matic-amoy',
};
function getProvider(chain_id, infuraApiKey) {
    if (!infuraApiKey) {
        return getFreeProvider(chain_id);
    }
    else {
        return getInfuraProvider(chain_id, infuraApiKey);
    }
}
function getFreeProvider(chain_id) {
    const provider_url = free_providers[chain_id];
    if (!provider_url) {
        throw new Error(`Chain id ${chain_id} is not supported`);
    }
    const provider = new ethers_1.ethers.JsonRpcProvider(provider_url);
    return provider;
}
function getInfuraProvider(chain_id, infura_api_key) {
    const network_name = infura_names[chain_id];
    const provider = new ethers_1.InfuraProvider(network_name, infura_api_key);
    return provider;
}
//# sourceMappingURL=providers.js.map