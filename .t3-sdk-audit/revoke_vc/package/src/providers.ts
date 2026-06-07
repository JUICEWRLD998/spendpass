// create JSON RPC provider based on the chain id

import { ethers, InfuraProvider } from 'ethers';

// https://chainlist.org/
// https://www.comparenodes.com/library/public-endpoints/
// using free providers is not recommended for production usage
// a reliable provider should be used such as Infura, Alchemy, or QuickNode
const free_providers: Record<string, string> = {
  '137': 'https://polygon.rpc.blxrbdn.com',
  '80002': 'https://rpc-amoy.polygon.technology',
  // ganache
  '1337': 'http://localhost:8545',
};

const infura_names: Record<string, string> = {
  '137': 'matic',
  '80002': 'matic-amoy',
};

export function getProvider(
  chain_id: string,
  infuraApiKey?: string,
): ethers.JsonRpcApiProvider {
  if (!infuraApiKey) {
    return getFreeProvider(chain_id);
  } else {
    return getInfuraProvider(chain_id, infuraApiKey);
  }
}

function getFreeProvider(chain_id: string): ethers.JsonRpcApiProvider {
  const provider_url = free_providers[chain_id];
  if (!provider_url) {
    throw new Error(`Chain id ${chain_id} is not supported`);
  }
  const provider = new ethers.JsonRpcProvider(provider_url);
  return provider;
}

function getInfuraProvider(
  chain_id: string,
  infura_api_key: string,
): ethers.JsonRpcApiProvider {
  const network_name = infura_names[chain_id];
  const provider = new InfuraProvider(network_name, infura_api_key);
  return provider;
}
