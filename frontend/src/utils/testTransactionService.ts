// Test script for TransactionService
// This can be used to validate the transaction fetching functionality

import TransactionService from './transactionService';
import { TESTNET_NETWORKS } from '@/config/networks';

/**
 * Test the TransactionService with real transaction data
 * Use this to validate the implementation
 */
export async function testTransactionService() {
  console.log('🧪 Testing TransactionService...');
  
  // Test transaction from the user's terminal output
  const testTransactions = [
    {
      hash: '0x2fab2dfa31d3e2edc308efc65c6c7284bfd9dbf56741229b07cf356d63dffcaf',
      networkId: 'optimismSepolia',
      expectedFee: '0.000000021080994684' // From user's terminal
    },
    {
      hash: '0xddb19d7014f8b6b0073e515f990df9ff1329432e56a5ea5f82c7187b3c862ac0',
      networkId: 'arbitrumSepolia',
      expectedFee: 'unknown' // Should fetch from API
    }
  ];

  for (const testTx of testTransactions) {
    console.log(`\n📋 Testing transaction: ${testTx.hash}`);
    console.log(`🌐 Network: ${testTx.networkId}`);
    console.log(`💰 Expected fee: ${testTx.expectedFee} ETH`);
    
    try {
      const result = await TransactionService.getTransactionDetails(
        testTx.hash,
        testTx.networkId
      );
      
      if (result) {
        console.log('✅ Transaction details fetched successfully:');
        console.log(`   📊 Status: ${result.status}`);
        console.log(`   ⛽ Gas Used: ${result.gasUsed}`);
        console.log(`   💸 Gas Price: ${result.gasPrice} wei`);
        console.log(`   💰 Transaction Fee: ${result.transactionFee} ETH`);
        console.log(`   🏷️  Block: ${result.blockNumber}`);
        console.log(`   ⏰ Timestamp: ${result.timestamp}`);
        
        // Validate fee if expected
        if (testTx.expectedFee !== 'unknown') {
          const fetchedFee = parseFloat(result.transactionFee);
          const expectedFee = parseFloat(testTx.expectedFee);
          const difference = Math.abs(fetchedFee - expectedFee);
          const tolerance = expectedFee * 0.01; // 1% tolerance
          
          if (difference <= tolerance) {
            console.log('✅ Fee validation: PASSED (within 1% tolerance)');
          } else {
            console.log(`❌ Fee validation: FAILED`);
            console.log(`   Expected: ${expectedFee} ETH`);
            console.log(`   Fetched: ${fetchedFee} ETH`);
            console.log(`   Difference: ${difference} ETH`);
          }
        }
      } else {
        console.log('❌ Failed to fetch transaction details');
      }
    } catch (error) {
      console.error(`❌ Error testing transaction ${testTx.hash}:`, error);
    }
  }
  
  console.log('\n🧪 TransactionService test completed');
}

/**
 * Test network configurations
 */
export function testNetworkConfigurations() {
  console.log('\n🌐 Testing Network Configurations...');
  
  Object.entries(TESTNET_NETWORKS).forEach(([key, network]) => {
    console.log(`\n📡 ${network.displayName} (${key})`);
    console.log(`   🆔 Chain ID: ${network.chainId}`);
    console.log(`   🔗 RPC URL: ${network.rpcUrl}`);
    console.log(`   🔍 Explorer: ${network.explorerUrl}`);
    console.log(`   📊 API URL: ${network.explorerApiUrl || 'Not configured'}`);
    console.log(`   🔑 API Key: ${network.explorerApiKey ? 'Configured' : 'Not configured'}`);
  });
}

/**
 * Test network switching verification
 */
export async function testNetworkSwitching() {
  console.log('\n🔄 Testing Network Switching Logic...');
  
  // Mock wallet client for testing
  const mockWalletClient = {
    chain: { id: 421614 } // Arbitrum Sepolia
  };
  
  const targetChainId = 11155420; // Optimism Sepolia
  
  console.log(`Current chain: ${mockWalletClient.chain.id}`);
  console.log(`Target chain: ${targetChainId}`);
  
  const result = await TransactionService.verifyNetworkSwitch(
    targetChainId,
    mockWalletClient,
    1 // Only 1 retry for testing
  );
  
  console.log(`Network switch verification: ${result ? '✅ PASSED' : '❌ FAILED'}`);
}

// Export for use in components or testing
export default {
  testTransactionService,
  testNetworkConfigurations,
  testNetworkSwitching
};