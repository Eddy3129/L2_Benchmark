// Quick test script to verify environment variables are loaded
require('dotenv').config();

console.log('=== Environment Variables Test ===');
console.log('ETHEREUM_MAINNET_RPC_URL:', process.env.ETHEREUM_MAINNET_RPC_URL);
console.log('ARBITRUM_MAINNET_RPC_URL:', process.env.ARBITRUM_MAINNET_RPC_URL);
console.log('BASE_MAINNET_RPC_URL:', process.env.BASE_MAINNET_RPC_URL);
console.log('OPTIMISM_RPC_URL:', process.env.OPTIMISM_RPC_URL);
console.log('\n=== Network Config Test ===');

// Test the actual network config
const { NETWORK_CONFIGS } = require('./src/shared/network-config.ts');
console.log('Ethereum RPC URL from config:', NETWORK_CONFIGS.ethereum?.rpcUrl);
console.log('Arbitrum RPC URL from config:', NETWORK_CONFIGS.arbitrum?.rpcUrl);

if (NETWORK_CONFIGS.ethereum?.rpcUrl?.includes('demo')) {
  console.log('❌ ERROR: Still using demo URLs!');
  console.log('Environment variables are not being loaded properly.');
} else {
  console.log('✅ SUCCESS: Using your Alchemy API keys!');
}