// Example usage of the simplified ABI service
// This shows how clean and simple the API is now

import { abiService } from './abiService';

// Example 1: Basic ABI fetching
export async function fetchContractAbi(contractAddress: string, chainId: number) {
  try {
    const abi = await abiService.fetchContractAbi(contractAddress, chainId);
    console.log('✅ ABI fetched successfully:', abi.length, 'functions/events');
    return abi;
  } catch (error) {
    console.error('❌ Failed to fetch ABI:', error.message);
    throw error;
  }
}

// Example 2: Get supported chains
export async function getSupportedChains() {
  try {
    const chains = await abiService.getSupportedChains();
    console.log('📋 Supported chains:', chains.map(c => c.name));
    return chains;
  } catch (error) {
    console.error('❌ Failed to get chains:', error.message);
    return [];
  }
}

// Example 3: Health check before using
export async function checkServiceHealth() {
  const isHealthy = await abiService.healthCheck();
  if (!isHealthy) {
    console.warn('⚠️ ABI service is not healthy, some features may not work');
  }
  return isHealthy;
}

// Example 4: Test connection with latency
export async function testConnection() {
  const result = await abiService.testConnection();
  if (result.connected) {
    console.log(`✅ Backend connected (${result.latency}ms latency)`);
  } else {
    console.error('❌ Backend connection failed:', result.error);
  }
  return result;
}

// Example 5: Complete workflow
export async function completeAbiWorkflow(contractAddress: string, chainId: number) {
  // 1. Check health
  const isHealthy = await checkServiceHealth();
  if (!isHealthy) {
    throw new Error('ABI service is not available');
  }

  // 2. Verify chain is supported
  const chains = await getSupportedChains();
  const supportedChain = chains.find(c => c.id === chainId);
  if (!supportedChain) {
    throw new Error(`Chain ID ${chainId} is not supported`);
  }

  // 3. Fetch ABI
  const abi = await fetchContractAbi(contractAddress, chainId);
  
  console.log(`🎉 Successfully fetched ABI for contract on ${supportedChain.name}`);
  return {
    abi,
    chain: supportedChain,
    contractAddress
  };
}

// Example usage in a React component:
/*
import { completeAbiWorkflow } from '@/lib/abiService.example';

function MyComponent() {
  const [abi, setAbi] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFetchAbi = async () => {
    setLoading(true);
    try {
      const result = await completeAbiWorkflow(
        '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
        11155111 // Sepolia
      );
      setAbi(result.abi);
    } catch (error) {
      console.error('Failed to fetch ABI:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleFetchAbi} disabled={loading}>
        {loading ? 'Fetching...' : 'Fetch ABI'}
      </button>
      {abi && <pre>{JSON.stringify(abi, null, 2)}</pre>}
    </div>
  );
}
*/