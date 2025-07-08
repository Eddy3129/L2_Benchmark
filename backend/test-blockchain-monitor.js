require('dotenv/config');

// Test script to verify BlockchainMonitorService environment variables
console.log('=== BlockchainMonitorService Environment Variables Test ===');
console.log('ETHEREUM_MAINNET_RPC_URL:', process.env.ETHEREUM_MAINNET_RPC_URL);
console.log('ARBITRUM_MAINNET_RPC_URL:', process.env.ARBITRUM_MAINNET_RPC_URL);
console.log('BASE_MAINNET_RPC_URL:', process.env.BASE_MAINNET_RPC_URL);
console.log('OPTIMISM_RPC_URL:', process.env.OPTIMISM_RPC_URL);
console.log('ZKSYNC_ERA_RPC_URL:', process.env.ZKSYNC_ERA_RPC_URL);
console.log('');

// Simulate the network configs that BlockchainMonitorService would use
const networkConfigs = {
  'zksync-era': {
    l1RpcUrl: process.env.ETHEREUM_MAINNET_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
    l2RpcUrl: process.env.ZKSYNC_ERA_RPC_URL || 'https://zksync-mainnet.g.alchemy.com/v2/demo',
  },
  'arbitrum': {
    l1RpcUrl: process.env.ETHEREUM_MAINNET_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
    l2RpcUrl: process.env.ARBITRUM_MAINNET_RPC_URL || 'https://arb-mainnet.g.alchemy.com/v2/demo',
  }
};

console.log('=== Network Config URLs ===');
console.log('zkSync Era L1 RPC:', networkConfigs['zksync-era'].l1RpcUrl);
console.log('zkSync Era L2 RPC:', networkConfigs['zksync-era'].l2RpcUrl);
console.log('Arbitrum L1 RPC:', networkConfigs['arbitrum'].l1RpcUrl);
console.log('Arbitrum L2 RPC:', networkConfigs['arbitrum'].l2RpcUrl);
console.log('');

// Check if demo URLs are being used
const usingDemo = Object.values(networkConfigs).some(config => 
  config.l1RpcUrl.includes('/demo') || config.l2RpcUrl.includes('/demo')
);

console.log('Using demo URLs:', usingDemo ? 'YES (BAD)' : 'NO (GOOD)');
if (!usingDemo) {
  console.log('✅ All network configurations are using your Alchemy API keys!');
} else {
  console.log('❌ Some configurations are still using demo URLs');
}