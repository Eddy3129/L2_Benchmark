import { NetworkConfig, TESTNET_NETWORKS } from '@/config/networks';
import { createPublicClient, http, type Hash } from 'viem';
import { arbitrumSepolia, optimismSepolia, baseSepolia, polygonAmoy, sepolia } from 'viem/chains';

interface TransactionDetails {
  hash: string;
  gasUsed: string;
  gasPrice: string;
  effectiveGasPrice: string;
  transactionFee: string;
  transactionFeeUSD?: string;
  status: 'success' | 'failed';
  blockNumber: string;
  timestamp: string;
  from: string;
  to: string;
  value: string;
}

interface ExplorerApiResponse {
  status: string;
  message: string;
  result: {
    gasUsed: string;
    gasPrice: string;
    effectiveGasPrice?: string;
    transactionIndex: string;
    blockNumber: string;
    timeStamp: string;
    from: string;
    to: string;
    value: string;
    isError: string;
  };
}

// Chain configurations for viem clients
const chainConfigs = {
  421614: arbitrumSepolia,
  11155420: optimismSepolia,
  84532: baseSepolia,
  80002: polygonAmoy,
  11155111: sepolia,
};

export class TransactionService {
  private static publicClients: Map<number, any> = new Map();

  /**
   * Get or create a public client for a specific chain
   */
  private static getPublicClient(chainId: number) {
    if (!this.publicClients.has(chainId)) {
      const chain = chainConfigs[chainId as keyof typeof chainConfigs];
      if (!chain) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      const networkConfig = Object.values(TESTNET_NETWORKS).find(n => n.chainId === chainId);
      if (!networkConfig) {
        throw new Error(`Network configuration not found for chain ID: ${chainId}`);
      }

      const client = createPublicClient({
        chain,
        transport: http(networkConfig.rpcUrl),
      });

      this.publicClients.set(chainId, client);
    }

    return this.publicClients.get(chainId);
  }

  /**
   * Fetch transaction details from blockchain explorer API
   */
  static async fetchTransactionFromExplorer(
    txHash: string,
    networkConfig: NetworkConfig
  ): Promise<TransactionDetails | null> {
    if (!networkConfig.explorerApiUrl) {
      console.warn(`No explorer API URL configured for ${networkConfig.name}`);
      return null;
    }

    try {
      const apiKey = networkConfig.explorerApiKey || '';
      const url = `${networkConfig.explorerApiUrl}?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === '1' && data.result) {
        const tx = data.result;
        
        // Also fetch transaction receipt for more details
        const receiptUrl = `${networkConfig.explorerApiUrl}?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${apiKey}`;
        const receiptResponse = await fetch(receiptUrl);
        const receiptData = await receiptResponse.json();

        let gasUsed = '0';
        let effectiveGasPrice = tx.gasPrice;
        let status: 'success' | 'failed' = 'failed';

        if (receiptData.status === '1' && receiptData.result) {
          gasUsed = receiptData.result.gasUsed || '0';
          effectiveGasPrice = receiptData.result.effectiveGasPrice || tx.gasPrice;
          status = receiptData.result.status === '0x1' ? 'success' : 'failed';
        }

        // Calculate transaction fee in ETH
        const gasUsedBigInt = BigInt(gasUsed);
        const effectiveGasPriceBigInt = BigInt(effectiveGasPrice);
        const feeWei = gasUsedBigInt * effectiveGasPriceBigInt;
        const feeEth = Number(feeWei) / 1e18;

        return {
          hash: txHash,
          gasUsed,
          gasPrice: tx.gasPrice,
          effectiveGasPrice,
          transactionFee: feeEth.toString(),
          status,
          blockNumber: tx.blockNumber,
          timestamp: new Date(parseInt(tx.timeStamp || '0') * 1000).toISOString(),
          from: tx.from,
          to: tx.to,
          value: tx.value,
        };
      }
    } catch (error) {
      console.error(`Failed to fetch transaction ${txHash} from explorer:`, error);
    }

    return null;
  }

  /**
   * Fetch transaction details using RPC client
   */
  static async fetchTransactionFromRPC(
    txHash: Hash,
    chainId: number
  ): Promise<TransactionDetails | null> {
    try {
      const client = this.getPublicClient(chainId);
      
      // Get transaction and receipt in parallel
      const [transaction, receipt] = await Promise.all([
        client.getTransaction({ hash: txHash }),
        client.getTransactionReceipt({ hash: txHash })
      ]);

      if (!transaction || !receipt) {
        return null;
      }

      // Calculate transaction fee
      const gasUsed = receipt.gasUsed;
      const effectiveGasPrice = receipt.effectiveGasPrice || transaction.gasPrice;
      const feeWei = gasUsed * effectiveGasPrice;
      const feeEth = Number(feeWei) / 1e18;

      return {
        hash: txHash,
        gasUsed: gasUsed.toString(),
        gasPrice: transaction.gasPrice?.toString() || '0',
        effectiveGasPrice: effectiveGasPrice.toString(),
        transactionFee: feeEth.toString(),
        status: receipt.status === 'success' ? 'success' : 'failed',
        blockNumber: receipt.blockNumber.toString(),
        timestamp: new Date().toISOString(), // We'd need to fetch block for exact timestamp
        from: transaction.from,
        to: transaction.to || '',
        value: transaction.value.toString(),
      };
    } catch (error) {
      console.error(`Failed to fetch transaction ${txHash} from RPC:`, error);
      return null;
    }
  }

  /**
   * Get comprehensive transaction details with fallback methods
   */
  static async getTransactionDetails(
    txHash: string,
    networkId: string
  ): Promise<TransactionDetails | null> {
    const networkConfig = TESTNET_NETWORKS[networkId];
    if (!networkConfig) {
      console.error(`Network configuration not found for ${networkId}`);
      return null;
    }

    // Try RPC first (faster and more reliable)
    try {
      const rpcResult = await this.fetchTransactionFromRPC(txHash as Hash, networkConfig.chainId);
      if (rpcResult) {
        console.log(`✅ Fetched transaction ${txHash} via RPC for ${networkConfig.name}`);
        return rpcResult;
      }
    } catch (error) {
      console.warn(`RPC fetch failed for ${txHash}, trying explorer API:`, error);
    }

    // Fallback to explorer API
    try {
      const explorerResult = await this.fetchTransactionFromExplorer(txHash, networkConfig);
      if (explorerResult) {
        console.log(`✅ Fetched transaction ${txHash} via Explorer API for ${networkConfig.name}`);
        return explorerResult;
      }
    } catch (error) {
      console.error(`Explorer API fetch failed for ${txHash}:`, error);
    }

    console.error(`❌ Failed to fetch transaction details for ${txHash} on ${networkConfig.name}`);
    return null;
  }

  /**
   * Batch fetch multiple transaction details
   */
  static async batchGetTransactionDetails(
    transactions: Array<{ hash: string; networkId: string }>
  ): Promise<Map<string, TransactionDetails>> {
    const results = new Map<string, TransactionDetails>();
    
    // Process in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      
      const promises = batch.map(async ({ hash, networkId }) => {
        const details = await this.getTransactionDetails(hash, networkId);
        if (details) {
          results.set(hash, details);
        }
        return details;
      });

      await Promise.all(promises);
      
      // Small delay between batches
      if (i + batchSize < transactions.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Verify network switch by checking current chain ID
   */
  static async verifyNetworkSwitch(
    expectedChainId: number,
    walletClient: any,
    maxRetries: number = 3
  ): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      if (walletClient.chain?.id === expectedChainId) {
        return true;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
  }
}

export default TransactionService;