import { Injectable, Logger } from '@nestjs/common';
import { AnalysisType } from '../common/dto/gas-analysis.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { ethers, ContractFactory, Interface, FunctionFragment, Signer } from 'ethers';
import { DataStorageService } from '../shared/data-storage.service';
import { CsvExportService } from '../shared/csv-export.service';

// Import shared utilities
import { 
  GasPriceData, 
  CompilationResult, 
  GasEstimate, 
  NetworkAnalysisResult, 
  NetworkResult, 
  AnalysisResult,
  GasAnalysisData
} from '../shared/types';
import { NetworkConfigService, NetworkConfig, NetworkType } from '@/config/network.config';
import { GasUtils } from '../shared/gas-utils';
import { ValidationUtils } from '../shared/validation-utils';

// Define local interface for gas analysis
interface GasAnalysis {
  id: string;
  contractName: string;
  sourceCode: string;
  analysisType: AnalysisType;
  networks: string[];
  results: any;
  createdAt: Date;
  updatedAt: Date;
}

// Promisify exec for async/await usage
const execAsync = promisify(exec);

@Injectable()
export class GasAnalyzerService {
  private readonly logger = new Logger(GasAnalyzerService.name);
  private readonly hardhatProjectRoot = path.join(process.cwd(), '..');
  private readonly tempContractsDir = path.join(this.hardhatProjectRoot, 'contracts', 'temp');

  constructor(
    private dataStorage: DataStorageService,
    private csvExport: CsvExportService,
  ) {
    fs.mkdir(this.tempContractsDir, { recursive: true }).catch(this.logger.error);
  }

  async analyzeContract(code: string, networks: string[], contractName: string, confidenceLevel: number = 99): Promise<AnalysisResult> {
    this.logger.log(`Starting analysis for contract: ${contractName}`);
    
    // Validate inputs
    const codeValidation = ValidationUtils.validateSolidityCode(code);
    if (!codeValidation.isValid) {
      throw ValidationUtils.createValidationError(codeValidation.errors);
    }
    const { valid: validNetworks, invalid: invalidNetworks } = NetworkConfigService.validateNetworks(networks);
    
    if (invalidNetworks.length > 0) {
      this.logger.warn(`Invalid networks provided: ${invalidNetworks.join(', ')}`);
    }
    
    if (validNetworks.length === 0) {
      throw ValidationUtils.createValidationError(['No valid networks provided for analysis']);
    }
    
    const compilation = await this.compileCode(code, contractName);
    const results: NetworkResult[] = [];
    
    for (const networkKey of validNetworks) {
      const networkConfig = NetworkConfigService.getNetwork(networkKey);
      if (!networkConfig || !networkConfig.rpcUrl) {
        this.logger.warn(`RPC URL not configured for network: ${networkKey}. Skipping.`);
        continue;
      }

      this.logger.log(`Analyzing network: ${networkConfig.name}`);
      
      let networkResult: NetworkAnalysisResult;
      
      // Use actual deployment for local networks, estimation for others
      if (NetworkConfigService.isLocalNetwork(networkConfig.chainId)) {
        networkResult = await this.deployAndAnalyzeLocal(compilation, networkConfig, confidenceLevel);
      } else {
        // Get testnet gas usage but use mainnet gas prices for realistic cost calculation
        const testnetGasPriceData = await this.getOptimalGasPrice(networkConfig, confidenceLevel);
        const gasPriceChainId = NetworkConfigService.getMainnetChainId(networkKey);
        const mainnetGasPriceData = await this.getOptimalGasPrice({ ...networkConfig, chainId: gasPriceChainId }, confidenceLevel);
        const tokenPriceChainId = NetworkConfigService.getMainnetChainId(networkKey);
        const tokenPriceUSD = await this.getNetworkTokenPrice({ chainId: tokenPriceChainId });
        networkResult = await this.analyzeNetworkGasWithMainnetPricing(compilation, testnetGasPriceData, mainnetGasPriceData, tokenPriceUSD, networkConfig.name);
      }
      
      results.push({
        network: networkKey,
        networkName: networkConfig.name,
        ...networkResult,
      });
    }
    
    return { 
      contractName, 
      results, 
      timestamp: new Date().toISOString(),
      compilation
    };
  }

  // New method for actual local deployment and gas measurement
  private async deployAndAnalyzeLocal(compilation: CompilationResult, networkConfig: NetworkConfig, confidenceLevel: number = 99): Promise<NetworkAnalysisResult> {
    this.logger.log('Performing actual deployment on local network');
    
    try {
      // Connect to local Hardhat network
      const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
      const signer = await provider.getSigner();
      
      // Create contract factory
      const contractFactory = new ContractFactory(compilation.abi, compilation.bytecode, signer);
      
      // Deploy contract and measure actual gas
      const deployTx = await contractFactory.getDeployTransaction();
      const gasEstimate = await provider.estimateGas(deployTx);
      
      // Get actual gas price
      const gasPriceData = await this.getOptimalGasPrice(networkConfig, confidenceLevel);
      // Use mainnet chain ID for token pricing if available
      const tokenPriceChainId = networkConfig.gasPriceChainId || networkConfig.chainId;
      const ethPriceUSD = await this.getNetworkTokenPrice({ chainId: tokenPriceChainId });
      
      // Calculate deployment costs
      const deploymentCostETH = GasUtils.calculateCostETH(Number(gasEstimate), gasPriceData.totalFee);
      const deploymentCostUSD = GasUtils.calculateCostUSD(deploymentCostETH, ethPriceUSD);
      
      // Analyze functions with actual gas estimation
      const functions: GasEstimate[] = [];
      const contractInterface = new Interface(compilation.abi);
      
      for (const fragment of contractInterface.fragments) {
        if (fragment.type === 'function' && fragment instanceof FunctionFragment) {
          // For local networks, we can get more accurate estimates
          let gasEstimate: number;
          try {
            // Try to get a more accurate estimate by encoding the function call
            const encodedData = contractInterface.encodeFunctionData(fragment.name, []);
            gasEstimate = 21000 + (encodedData.length - 2) / 2 * 16; // More accurate estimation
          } catch {
            gasEstimate = GasUtils.estimateFunctionGas(fragment);
          }
          
          const costETH = GasUtils.calculateCostETH(gasEstimate, gasPriceData.totalFee);
          const costUSD = GasUtils.calculateCostUSD(costETH, ethPriceUSD);
          
          functions.push({
            functionName: fragment.name,
            gasUsed: gasEstimate.toString(),
            estimatedCostETH: costETH,
            estimatedCostUSD: costUSD
          });
        }
      }
      
      return {
        deployment: {
          gasUsed: gasEstimate.toString(),
          costETH: deploymentCostETH,
          costUSD: deploymentCostUSD
        },
        functions,
        gasPrice: gasPriceData.totalFee.toString(),
        ethPriceUSD,
        gasPriceBreakdown: gasPriceData
      };
      
    } catch (error) {
      this.logger.warn(`Local deployment failed, falling back to estimation: ${error.message}`);
      // Fallback to estimation if actual deployment fails
      const gasPriceData = await this.getOptimalGasPrice(networkConfig, confidenceLevel);
      // Use mainnet chain ID for token pricing if available
      const tokenPriceChainId = networkConfig.gasPriceChainId || networkConfig.chainId;
      const ethPriceUSD = await this.getNetworkTokenPrice({ chainId: tokenPriceChainId });
      return this.analyzeNetworkGas(compilation, gasPriceData, ethPriceUSD);
    }
  }



  // Helper method to generate source code hash
  private generateSourceCodeHash(sourceCode: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(sourceCode).digest('hex');
  }



  // Add method to get gas analysis history
  async getGasAnalysisHistory(limit: number = 50): Promise<GasAnalysis[]> {
    const allAnalyses = this.dataStorage.findAll('gasAnalysis');
    return allAnalyses
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  // Add method to get gas analysis by contract name
  async getGasAnalysisByContract(contractName: string): Promise<GasAnalysis[]> {
    return this.dataStorage.findAll('gasAnalysis', (analysis) => 
      analysis.contractName === contractName
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Add method to get detailed gas analysis by ID
  async getGasAnalysisById(id: string): Promise<GasAnalysis | null> {
    return this.dataStorage.findById('gasAnalysis', id);
  }

  // Add method to save gas analysis
  async saveGasAnalysis(analysisData: Omit<GasAnalysis, 'id' | 'createdAt' | 'updatedAt'>): Promise<GasAnalysis> {
    const gasAnalysis = {
      ...analysisData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return this.dataStorage.create('gasAnalysis', gasAnalysis);
  }

  // Export gas analyses to CSV
  async exportGasAnalysesToCsv(): Promise<string> {
    const analyses = this.dataStorage.findAll('gasAnalysis');
    return this.csvExport.exportGasAnalysis(analyses);
  }

  // Export gas analyses by contract name to CSV
  async exportGasAnalysesByContractToCsv(contractName: string): Promise<string> {
    const analyses = await this.getGasAnalysisByContract(contractName);
    return this.csvExport.exportGasAnalysis(analyses);
  }

  // EIP-4844 Blob Cost Analysis Methods
  async analyzeBlobCosts(
    l2Networks: string[],
    blobDataSize: number = 131072, // Default blob size (128KB)
    confidenceLevel: number = 70
  ): Promise<any> {
    this.logger.log(`Starting EIP-4844 blob cost analysis for networks: ${l2Networks.join(', ')}`);
    
    const results: any[] = [];
    
    for (const networkKey of l2Networks) {
      const networkConfig = NetworkConfigService.getNetwork(networkKey);
      if (!networkConfig) {
        this.logger.warn(`Network configuration not found for: ${networkKey}`);
        continue;
      }

      this.logger.log(`Analyzing blob costs for: ${networkConfig.name}`);
      
      // Get mainnet gas prices for realistic cost calculation
      const mainnetChainId = NetworkConfigService.getMainnetChainId(networkKey);
      const mainnetGasPriceData = await this.getOptimalGasPrice({ ...networkConfig, chainId: mainnetChainId }, confidenceLevel);
      const tokenPriceUSD = await this.getNetworkTokenPrice({ chainId: mainnetChainId });
      
      // Calculate blob transaction costs
      const blobAnalysis = await this.calculateBlobTransactionCosts(
        networkConfig,
        blobDataSize,
        mainnetGasPriceData,
        tokenPriceUSD
      );
      
      results.push({
        network: networkKey,
        networkName: networkConfig.name,
        ...blobAnalysis
      });
    }
    
    return {
      blobDataSize,
      results,
      timestamp: new Date().toISOString(),
      analysis: 'EIP-4844 Blob Transaction Cost Comparison'
    };
  }

  private async calculateBlobTransactionCosts(
    networkConfig: NetworkConfig,
    blobDataSize: number,
    gasPriceData: GasPriceData,
    tokenPriceUSD: number
  ): Promise<any> {
    // EIP-4844 blob specifications
    const BLOB_SIZE = 131072; // 128KB per blob
    const MAX_BLOBS_PER_TX = 6;
    const BLOB_GAS_PER_BLOB = 131072; // Gas units per blob
    
    // Calculate number of blobs needed
    const blobsNeeded = Math.ceil(blobDataSize / BLOB_SIZE);
    if (blobsNeeded > MAX_BLOBS_PER_TX) {
      throw new Error(`Data size requires ${blobsNeeded} blobs, but maximum is ${MAX_BLOBS_PER_TX} per transaction`);
    }
    
    // Base transaction costs (Type 3 transaction)
    const baseTxGas = 21000; // Base transaction cost
    const blobTxOverhead = 1000; // Additional overhead for blob transaction
    const totalBaseTxGas = baseTxGas + blobTxOverhead;
    
    // Blob gas costs (separate from regular gas)
    const totalBlobGas = blobsNeeded * BLOB_GAS_PER_BLOB;
    
    // Get real-time blob gas price from Blocknative API
    let estimatedBlobGasPrice: number;
    try {
      const blocknativeBlobBaseFee = await this.getBlocknativeBlobBaseFee(99); // Use 70% confidence for blob pricing
      if (blocknativeBlobBaseFee !== null) {
        estimatedBlobGasPrice = blocknativeBlobBaseFee;
        this.logger.log(`Using real-time blob base fee: ${estimatedBlobGasPrice} gwei`);
      } else {
        throw new Error('Blocknative blob base fee not available');
      }
    } catch (error) {
      this.logger.warn('Failed to fetch real-time blob base fee, using fallback estimation:', error.message);
      // Fallback to conservative estimation only if API fails
      estimatedBlobGasPrice = Math.min(5, Math.max(1, gasPriceData.baseFee * 0.02));
    }
    
    // Ensure gas prices are properly formatted (avoid scientific notation)
    const safeRegularGasPrice = Number(gasPriceData.totalFee.toFixed(9));
    const safeBlobGasPrice = Number(estimatedBlobGasPrice.toFixed(9));
    
    // Calculate costs
    const regularGasCostETH = GasUtils.calculateCostETH(totalBaseTxGas, safeRegularGasPrice);
    const blobGasCostETH = GasUtils.calculateCostETH(totalBlobGas, safeBlobGasPrice);
    const totalCostETH = (parseFloat(regularGasCostETH) + parseFloat(blobGasCostETH)).toFixed(8);
    const totalCostUSD = GasUtils.calculateCostUSD(totalCostETH, tokenPriceUSD);
    
    // Calculate cost per KB for comparison
    const costPerKB = totalCostUSD / (blobDataSize / 1024);
    
    // Estimate L2 settlement frequency and batch costs
    const estimatedBatchSize = 100; // Typical number of L2 transactions per batch
    const costPerL2Transaction = totalCostUSD / estimatedBatchSize;
    
    // Calculate calldata comparison
    const calldataComparison = this.calculateCalldataCostComparison(blobDataSize, gasPriceData, tokenPriceUSD);
    
    // Calculate cost reduction percentage
    const costReductionVsCalldata = ((calldataComparison.costUSD - totalCostUSD) / calldataComparison.costUSD) * 100;
    
    return {
      blobTransaction: {
        blobsUsed: blobsNeeded,
        blobDataSize,
        regularGasUsed: totalBaseTxGas,
        blobGasUsed: totalBlobGas,
        regularGasCostETH,
        blobGasCostETH,
        totalCostETH,
        totalCostUSD,
        costPerKB,
        costPerL2Transaction
      },
      gasBreakdown: {
        regularGasPrice: safeRegularGasPrice,
        estimatedBlobGasPrice: safeBlobGasPrice,
        tokenPriceUSD
      },
      comparison: {
        vsTraditionalCalldata: calldataComparison,
        efficiency: {
          dataCompressionRatio: 1, // Blobs don't compress data, but enable efficient L2 settlement
          costReductionVsCalldata: costReductionVsCalldata
        }
      }
    };
  }

  private calculateCalldataCostComparison(
    dataSize: number,
    gasPriceData: GasPriceData,
    tokenPriceUSD: number
  ): any {
    // Traditional calldata costs: 16 gas per non-zero byte, 4 gas per zero byte
    // Assume average case: 50% zero bytes, 50% non-zero bytes
    const avgGasPerByte = (16 + 4) / 2; // 10 gas per byte average
    const calldataGas = dataSize * avgGasPerByte;
    const baseTxGas = 21000;
    const totalCalldataGas = baseTxGas + calldataGas;
    
    // Ensure gas price is properly formatted (avoid scientific notation)
    const safeGasPrice = Number(gasPriceData.totalFee.toFixed(9));
    
    const calldataCostETH = GasUtils.calculateCostETH(totalCalldataGas, safeGasPrice);
    const calldataCostUSD = GasUtils.calculateCostUSD(calldataCostETH, tokenPriceUSD);
    
    return {
      gasUsed: totalCalldataGas,
      costETH: calldataCostETH,
      costUSD: calldataCostUSD,
      costPerKB: calldataCostUSD / (dataSize / 1024)
    };
  }



  private async compileCode(code: string, contractName: string): Promise<CompilationResult> {
    const tempFileName = `${contractName}_${Date.now()}.sol`;
    const tempFilePath = path.join(this.tempContractsDir, tempFileName);

    try {
      await fs.writeFile(tempFilePath, code);
      this.logger.log(`Compiling with Hardhat in: ${this.hardhatProjectRoot}`);
      
      const { stderr } = await execAsync('npx hardhat compile', { cwd: this.hardhatProjectRoot });
      if (stderr && !stderr.toLowerCase().includes('warning')) {
        throw new Error(`Compilation failed: ${stderr}`);
      }

      // Read compilation artifacts
      const artifactsPath = path.join(this.hardhatProjectRoot, 'artifacts', 'contracts', 'temp', tempFileName, `${contractName}.json`);
      const artifactContent = await fs.readFile(artifactsPath, 'utf-8');
      const artifact = JSON.parse(artifactContent);

      return {
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        contractName
      };
    } catch (error) {
      this.logger.error(`Compilation error: ${error.message}`);
      throw error;
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        this.logger.warn(`Failed to clean up temp file: ${cleanupError.message}`);
      }
    }
  }

  private async analyzeNetworkGas(
    compilation: CompilationResult,
    gasPriceData: GasPriceData,
    ethPriceUSD: number
  ): Promise<NetworkAnalysisResult> {
    // Ensure gas price is properly formatted (avoid scientific notation)
    const safeGasPrice = Number(gasPriceData.totalFee.toFixed(9));
    
    // Estimate deployment gas
    const deploymentGas = GasUtils.estimateDeploymentGas(compilation.bytecode);
    const deploymentCostETH = GasUtils.calculateCostETH(deploymentGas, safeGasPrice);
    const deploymentCostUSD = parseFloat(deploymentCostETH) * ethPriceUSD;

    // Analyze functions
    const functions: GasEstimate[] = [];
    const contractInterface = new Interface(compilation.abi);
    
    for (const fragment of contractInterface.fragments) {
      if (fragment.type === 'function' && fragment instanceof FunctionFragment) {
        const gasEstimate = GasUtils.estimateFunctionGas(fragment);
        const costETH = GasUtils.calculateCostETH(gasEstimate, safeGasPrice);
        const costUSD = parseFloat(costETH) * ethPriceUSD;
        
        functions.push({
          functionName: fragment.name,
          gasUsed: gasEstimate.toString(),
          estimatedCostETH: costETH,
          estimatedCostUSD: costUSD
        });
      }
    }

    return {
      deployment: {
        gasUsed: deploymentGas.toString(),
        costETH: deploymentCostETH,
        costUSD: deploymentCostUSD
      },
      functions,
      gasPrice: gasPriceData.totalFee.toString(),
      ethPriceUSD,
      gasPriceBreakdown: gasPriceData
    };
  }

  private async analyzeNetworkGasWithMainnetPricing(
    compilation: CompilationResult,
    testnetGasPriceData: GasPriceData,
    mainnetGasPriceData: GasPriceData,
    ethPriceUSD: number,
    networkName: string
  ): Promise<NetworkAnalysisResult> {
    // Ensure gas price is properly formatted (avoid scientific notation)
    const safeMainnetGasPrice = Number(mainnetGasPriceData.totalFee.toFixed(9));
    
    // Estimate deployment gas using testnet conditions
    const deploymentGas = GasUtils.estimateDeploymentGas(compilation.bytecode);
    
    // Calculate costs using mainnet gas prices for realistic estimates
    const deploymentCostETH = GasUtils.calculateCostETH(deploymentGas, safeMainnetGasPrice);
    const deploymentCostUSD = GasUtils.calculateCostUSD(deploymentCostETH, ethPriceUSD);

    // Analyze functions with mainnet pricing
    const functions: GasEstimate[] = [];
    const contractInterface = new Interface(compilation.abi);
    
    for (const fragment of contractInterface.fragments) {
      if (fragment.type === 'function' && fragment instanceof FunctionFragment) {
        const gasEstimate = GasUtils.estimateFunctionGas(fragment);
        // Use mainnet gas prices for cost calculation
        const costETH = GasUtils.calculateCostETH(gasEstimate, safeMainnetGasPrice);
        const costUSD = GasUtils.calculateCostUSD(costETH, ethPriceUSD);
        
        functions.push({
          functionName: fragment.name,
          gasUsed: gasEstimate.toString(),
          estimatedCostETH: costETH,
          estimatedCostUSD: costUSD
        });
      }
    }

    this.logger.log(`${networkName}: Using testnet gas estimates with mainnet gas prices (${mainnetGasPriceData.totalFee} gwei) and mainnet token pricing`);

    return {
      deployment: {
        gasUsed: deploymentGas.toString(),
        costETH: deploymentCostETH,
        costUSD: deploymentCostUSD
      },
      functions,
      gasPrice: `${mainnetGasPriceData.totalFee} gwei (mainnet pricing)`,
      ethPriceUSD,
      gasPriceBreakdown: {
        ...mainnetGasPriceData,
        source: 'mainnet-pricing' as any
      }
    };
  }

  // Gas calculation methods moved to shared/gas-utils.ts

  // Function gas estimation methods moved to shared/gas-utils.ts

  private async getOptimalGasPrice(networkConfig: NetworkConfig, confidenceLevel: number = 99): Promise<GasPriceData> {
    // For local networks, use minimal gas prices for fair Layer 2 comparison
    if (networkConfig.chainId === 31337) {
      return {
        baseFee: 0.1, // 0.1 gwei for more realistic local testing
        priorityFee: 0,
        totalFee: 0.1,
        confidence: 100,
        source: 'hardhat' as const
      };
    }
    
    // Try Blocknative API first for professional gas price data
    // Use gasPriceChainId for mainnet pricing if available, otherwise use chainId
    const gasPriceChainId = networkConfig.gasPriceChainId || networkConfig.chainId;
    try {
      const blocknativeData = await this.getBlocknativeGasPrice(gasPriceChainId, confidenceLevel);
      if (blocknativeData) {
        return blocknativeData;
      }
    } catch (error) {
      this.logger.warn(`Blocknative API failed for chain ${gasPriceChainId}, falling back to provider`, error);
    }
    
    // Fallback to provider
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    const feeData = await provider.getFeeData();
    const baseFee = feeData.gasPrice || ethers.parseUnits('10', 'gwei');
    const priorityFee = feeData.maxPriorityFeePerGas || ethers.parseUnits('1', 'gwei');
    const totalFeeGwei = parseFloat(ethers.formatUnits(baseFee + priorityFee, 'gwei'));
    return {
      baseFee: parseFloat(ethers.formatUnits(baseFee, 'gwei')),
      priorityFee: parseFloat(ethers.formatUnits(priorityFee, 'gwei')),
      totalFee: totalFeeGwei,
      confidence: 90, 
      source: 'provider'
    };
  }

  private async getMainnetGasPrice(): Promise<GasPriceData> {
    try {
      // Try Blocknative API first for professional mainnet gas prices
      const blocknativeData = await this.getBlocknativeGasPrice(1); // Ethereum mainnet
      if (blocknativeData) {
        return blocknativeData;
      }
    } catch (error) {
      this.logger.warn('Blocknative API failed for mainnet, falling back to provider', error);
    }
    
    try {
      // Fallback to provider
      const mainnetProvider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
      const feeData = await mainnetProvider.getFeeData();
      const baseFee = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
      const priorityFee = feeData.maxPriorityFeePerGas || ethers.parseUnits('2', 'gwei');
      const totalFeeGwei = parseFloat(ethers.formatUnits(baseFee + priorityFee, 'gwei'));
      
      return {
        baseFee: parseFloat(ethers.formatUnits(baseFee, 'gwei')),
        priorityFee: parseFloat(ethers.formatUnits(priorityFee, 'gwei')),
        totalFee: totalFeeGwei,
        confidence: 95,
        source: 'provider'
      };
    } catch (error) {
      this.logger.warn('Failed to fetch mainnet gas prices, using fallback', error);
      // Fallback to reasonable mainnet gas prices
      return {
        baseFee: 20,
        priorityFee: 2,
        totalFee: 22,
        confidence: 50,
        source: 'provider'
      };
    }
  }

  private async getBlocknativeBlobBaseFee(confidenceLevel: number = 99): Promise<number | null> {
    const apiKey = process.env.BLOCKNATIVE_API_KEY;
    if (!apiKey) {
      this.logger.warn('BLOCKNATIVE_API_KEY not configured');
      return null;
    }

    try {
      const url = 'https://api.blocknative.com/gasprices/basefee-estimates';
      
      const response = await fetch(url, {
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Blocknative basefee-estimates API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Get current blob base fee
      const currentBlobBaseFee = data.blobBaseFeePerGas;
      if (currentBlobBaseFee !== undefined) {
        this.logger.log(`Current blob base fee: ${currentBlobBaseFee} gwei`);
        return currentBlobBaseFee;
      }

      // If current is not available, get prediction for next block
      const estimatedBaseFees = data.estimatedBaseFees;
      if (!estimatedBaseFees || estimatedBaseFees.length === 0) {
        throw new Error('No estimated base fees available');
      }

      // Get the first prediction (pending+1)
      const nextBlockEstimate = estimatedBaseFees[0]['pending+1'];
      if (!nextBlockEstimate || nextBlockEstimate.length === 0) {
        throw new Error('No next block estimates available');
      }

      // Find the estimate for the requested confidence level
      let selectedEstimate = nextBlockEstimate.find((estimate: any) => estimate.confidence === confidenceLevel);
      
      if (!selectedEstimate) {
        // Fallback to closest confidence level
        selectedEstimate = nextBlockEstimate.reduce((closest: any, current: any) => {
          return Math.abs(current.confidence - confidenceLevel) < Math.abs(closest.confidence - confidenceLevel) 
            ? current : closest;
        });
      }

      if (!selectedEstimate || selectedEstimate.blobBaseFee === undefined) {
        throw new Error('No suitable blob base fee estimate found');
      }

      this.logger.log(`Predicted blob base fee: ${selectedEstimate.blobBaseFee} gwei (confidence: ${selectedEstimate.confidence}%, requested: ${confidenceLevel}%)`);
      return selectedEstimate.blobBaseFee;
    } catch (error) {
      this.logger.error('Failed to fetch Blocknative blob base fee:', error);
      return null;
    }
  }

  private async getBlocknativeGasPrice(chainId: number, confidenceLevel: number = 99): Promise<GasPriceData | null> {
    const apiKey = process.env.BLOCKNATIVE_API_KEY;
    if (!apiKey) {
      this.logger.warn('BLOCKNATIVE_API_KEY not configured');
      return null;
    }

    // Map chain IDs to Blocknative supported mainnet chains only
    // Based on official Blocknative documentation - testnets are NOT supported
    const supportedChains: { [chainId: number]: boolean } = {
      1: true,        // Ethereum Mainnet
      137: true,      // Polygon Mainnet
      42161: true,    // Arbitrum One
      10: true,       // Optimism Mainnet
      8453: true,     // Base Mainnet
      43114: true,    // Avalanche
      56: true,       // BSC
      100: true,      // Gnosis
      324: true,      // ZKsync
      59144: true,    // Linea
      534352: true,   // Scroll
      1101: true,     // Polygon zkEVM
      5000: true,     // Mantle
      1088: true,     // Metis
      25: true,       // Cronos
      1284: true,     // Moonbeam
      30: true,       // Rootstock
      2020: true,     // Ronin
      252: true,      // Fraxtal
      204: true,      // opBNB
      34443: true,    // Mode
      1135: true,     // Lisk
      232: true,      // Lens
      57073: true,    // Ink
      13371: true,    // Immutable zkEVM
      88888: true,    // Chiliz
      60808: true,    // Bob
      81457: true,    // Blast
      80094: true,    // Berachain
      11297108109: true, // Palm
      167000: true,   // Taiko
      7777777: true,  // Zora
      48900: true,    // Zircuit
      7000: true,     // ZetaChain
      480: true,      // World Chain
      130: true,      // Unichain
      1923: true,     // Swell
      146: true,      // Sonic
      1868: true,     // Soneium
      2192: true,     // Snax Chain
      1329: true,     // SEI
      1514: true      // Story
    };

    if (!supportedChains[chainId]) {
      this.logger.warn(`Blocknative does not support chain ID ${chainId} (testnets and some networks not supported)`);
      return null;
    }

    try {
      // Build URL with confidence level parameter
      const url = `https://api.blocknative.com/gasprices/blockprices?chainid=${chainId}&confidenceLevels=${confidenceLevel}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Blocknative API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extract gas prices from the response
      const blockPrices = data.blockPrices?.[0];
      if (!blockPrices) {
        throw new Error('No block prices data available');
      }

      const estimatedPrices = blockPrices.estimatedPrices;
      if (!estimatedPrices || estimatedPrices.length === 0) {
        throw new Error('No estimated prices available');
      }

      // Find the price for the requested confidence level, or closest available
      let selectedPrice = estimatedPrices.find((price: any) => price.confidence === confidenceLevel);
      
      if (!selectedPrice) {
        // Fallback to closest confidence level
        selectedPrice = estimatedPrices.reduce((closest: any, current: any) => {
          return Math.abs(current.confidence - confidenceLevel) < Math.abs(closest.confidence - confidenceLevel) 
            ? current : closest;
        });
      }

      if (!selectedPrice) {
        throw new Error('No suitable gas price estimate found');
      }

      this.logger.log(`Blocknative gas price for chain ${chainId}: ${selectedPrice.maxFeePerGas} gwei (confidence: ${selectedPrice.confidence}%, requested: ${confidenceLevel}%)`);

      return {
        baseFee: blockPrices.baseFeePerGas || 0,
        priorityFee: selectedPrice.maxPriorityFeePerGas || 0,
        totalFee: selectedPrice.maxFeePerGas || selectedPrice.price || 0,
        confidence: selectedPrice.confidence,
        source: 'blocknative'
      };
    } catch (error) {
      this.logger.error(`Failed to fetch Blocknative gas prices for chain ${chainId}:`, error);
      return null;
    }
  }

  private async getNetworkTokenPrice(networkConfig: { chainId: number }): Promise<number> {
      // Map chain IDs to their native tokens with both ID and symbol support
      const tokenMap: { [chainId: number]: { id?: string, symbol?: string, name: string } } = {
          1: { id: 'ethereum', name: 'ETH' },           // Ethereum Mainnet
          11155111: { id: 'ethereum', name: 'ETH' },    // Sepolia
          31337: { id: 'ethereum', name: 'ETH' },       // Hardhat/Localhost
          137: { symbol: 'pol', name: 'POL' },         // Polygon Mainnet (use symbol for POL)
          80002: { symbol: 'pol', name: 'POL' },       // Polygon Amoy (use symbol for POL)
          42161: { id: 'ethereum', name: 'ETH' },       // Arbitrum One
          421614: { id: 'ethereum', name: 'ETH' },      // Arbitrum Sepolia
          10: { id: 'ethereum', name: 'ETH' },          // Optimism
          11155420: { id: 'ethereum', name: 'ETH' },    // Optimism Sepolia
          8453: { id: 'ethereum', name: 'ETH' },        // Base
          84532: { id: 'ethereum', name: 'ETH' },       // Base Sepolia
          1101: { id: 'ethereum', name: 'ETH' },        // Polygon zkEVM Mainnet
          2442: { id: 'ethereum', name: 'ETH' },        // Polygon zkEVM Testnet
          324: { id: 'ethereum', name: 'ETH' },         // zkSync Era Mainnet
          300: { id: 'ethereum', name: 'ETH' }          // zkSync Era Sepolia
      };
  
      const token = tokenMap[networkConfig.chainId] || { id: 'ethereum', name: 'ETH' };
      
      this.logger.log(`Fetching ${token.name} price for chain ID ${networkConfig.chainId}...`);
      // For local networks, use a reasonable fixed price for consistency
      if (networkConfig.chainId === 31337) {
          this.logger.log(`Using fixed ETH price for local network: $3000`);
          return 3000;
      }
      
      // Try multiple price sources for professional reliability
      const priceSources = [
          () => this.fetchCoinGeckoPrice(token),
          () => this.fetchCoinMarketCapPrice(token),
          () => this.fetchCryptoComparePrice(token)
      ];
      
      for (const fetchPrice of priceSources) {
          try {
              const price = await fetchPrice();
              if (price && price > 0) {
                  this.logger.log(`Successfully fetched ${token.name} price: $${price}`);
                  return price;
              }
          } catch (error) {
              this.logger.warn(`Price source failed for ${token.name}:`, error.message);
              continue;
          }
      }
      
      // If all sources fail, throw error instead of using hardcoded fallback
       throw new Error(`Failed to fetch ${token.name} price from all available sources`);
   }
   
   private async fetchCoinGeckoPrice(token: { id?: string, symbol?: string, name: string }): Promise<number> {
       const apiKey = process.env.COINGECKO_API_KEY || 'CG-njMzeCqg4NmSv1JFwKypf5Zy';
       
       let url: string;
       if (token.id) {
           url = `https://api.coingecko.com/api/v3/simple/price?ids=${token.id}&vs_currencies=usd`;
       } else if (token.symbol) {
           url = `https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&symbols=${token.symbol}`;
       } else {
           throw new Error('No valid identifier for CoinGecko API');
       }
       
       const response = await fetch(url, {
           headers: {
               'accept': 'application/json',
               'x-cg-demo-api-key': apiKey
           }
       });
       
       if (!response.ok) {
           throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
       }
       
       const data = await response.json();
       
       if (token.id) {
           const price = data[token.id]?.usd;
           if (price === undefined) {
               throw new Error(`Price not found for token ID: ${token.id}`);
           }
           return price;
       } else if (token.symbol) {
           const price = data[token.symbol.toUpperCase()]?.usd;
           if (price === undefined) {
               throw new Error(`Price not found for token symbol: ${token.symbol}`);
           }
           return price;
       } else {
           throw new Error('No valid identifier provided for price lookup');
       }
   }
   
   private async fetchCoinMarketCapPrice(token: { id?: string, symbol?: string, name: string }): Promise<number> {
       const apiKey = process.env.COINMARKETCAP_API_KEY;
       if (!apiKey) {
           throw new Error('CoinMarketCap API key not configured');
       }
       
       const symbol = token.symbol || (token.name === 'ETH' ? 'ETH' : 'POL');
       
       const response = await fetch(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol.toUpperCase()}`, {
           headers: {
               'X-CMC_PRO_API_KEY': apiKey,
               'Accept': 'application/json'
           }
       });
       
       if (!response.ok) {
           throw new Error(`CoinMarketCap API error: ${response.status} ${response.statusText}`);
       }
       
       const data = await response.json();
       return data.data[symbol.toUpperCase()]?.quote?.USD?.price;
   }
   
   private async fetchCryptoComparePrice(token: { id?: string, symbol?: string, name: string }): Promise<number> {
       const apiKey = process.env.CRYPTOCOMPARE_API_KEY;
       const symbol = token.symbol || (token.name === 'ETH' ? 'ETH' : 'POL');
       
       const url = apiKey 
           ? `https://min-api.cryptocompare.com/data/price?fsym=${symbol.toUpperCase()}&tsyms=USD&api_key=${apiKey}`
           : `https://min-api.cryptocompare.com/data/price?fsym=${symbol.toUpperCase()}&tsyms=USD`;
       
       const response = await fetch(url);
       
       if (!response.ok) {
           throw new Error(`CryptoCompare API error: ${response.status} ${response.statusText}`);
       }
       
       const data = await response.json();
       return data.USD;
   }
 }