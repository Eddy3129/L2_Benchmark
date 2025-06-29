import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasAnalysis } from './gas-analysis.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { ethers, ContractFactory, Interface, FunctionFragment, Signer } from 'ethers';

// Promisify exec for async/await usage
const execAsync = promisify(exec);

// --- Interfaces (assuming these are defined elsewhere or here) ---
interface NetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
}

interface GasPriceData {
  baseFee: number;
  priorityFee: number;
  totalFee: number; // in Gwei
  confidence: number;
  source: 'blocknative' | 'provider';
}

export interface CompilationResult {
  abi: any[];
  bytecode: string;
  contractName: string;
}

export interface GasEstimate {
  functionName: string;
  gasUsed: string;
  estimatedCostETH: string;
  estimatedCostUSD: number;
}

export interface NetworkAnalysisResult {
  deployment: { gasUsed: string; costETH: string; costUSD: number; };
  functions: GasEstimate[];
  gasPrice: string;
  ethPriceUSD: number;
  gasPriceBreakdown: GasPriceData;
}

export interface NetworkResult extends NetworkAnalysisResult {
  network: string;
  networkName: string;
}

export interface AnalysisResult {
  contractName: string;
  results: NetworkResult[];
  timestamp: string;
  compilation?: any; // Add optional compilation property
}
// --- End of Interfaces ---

@Injectable()
export class GasAnalyzerService {
  private readonly logger = new Logger(GasAnalyzerService.name);
  private readonly hardhatProjectRoot = path.join(process.cwd(), '..');
  private readonly tempContractsDir = path.join(this.hardhatProjectRoot, 'contracts', 'temp');

  private readonly networks: Record<string, NetworkConfig> = {
    arbitrumSepolia: { name: 'Arbitrum Sepolia', rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc", chainId: 421614 },
    optimismSepolia: { name: 'Optimism Sepolia', rpcUrl: process.env.OP_SEPOLIA_RPC_URL || "https://sepolia.optimism.io/", chainId: 11155420 },
    baseSepolia: { name: 'Base Sepolia', rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org", chainId: 84532 },
    polygonAmoy: { name: 'Polygon Amoy', rpcUrl: process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/", chainId: 80002 },
  };

  constructor(
    @InjectRepository(GasAnalysis)
    private gasAnalysisRepository: Repository<GasAnalysis>,
  ) {
    fs.mkdir(this.tempContractsDir, { recursive: true }).catch(this.logger.error);
  }

  async analyzeContract(code: string, networks: string[], contractName: string): Promise<AnalysisResult> {
    this.logger.log(`Starting analysis for contract: ${contractName}`);
    const compilation = await this.compileCode(code, contractName);

    const results: NetworkResult[] = [];
    for (const networkKey of networks) {
      const networkConfig = this.networks[networkKey];
      if (!networkConfig || !networkConfig.rpcUrl) {
        this.logger.warn(`RPC URL not configured for network: ${networkKey}. Skipping.`);
        continue;
      }

      this.logger.log(`Analyzing network: ${networkConfig.name}`);
      const gasPriceData = await this.getOptimalGasPrice(networkConfig);
      // Fetch the correct token price for each network
      const tokenPriceUSD = await this.getNetworkTokenPrice({ chainId: networkConfig.chainId });
      const networkResult = await this.analyzeNetworkGas(compilation, gasPriceData, tokenPriceUSD);
      
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
      compilation // Include compilation data
    };
  }

  // Add method to save gas analysis results
  async saveGasAnalysis(analysisData: {
    contractName: string;
    functionSignature: string;
    l2Network: string;
    gasUsed: string;
    estimatedL2Fee: string;
    estimatedL1Fee: string;
    totalEstimatedFeeUSD: number;
    solidityCode: string;
    compilationArtifacts: any;
    functionParameters: any;
  }): Promise<GasAnalysis> {
    const gasAnalysis = this.gasAnalysisRepository.create(analysisData);
    return await this.gasAnalysisRepository.save(gasAnalysis);
  }

  // Add method to save multiple gas analyses from a complete analysis
  async saveAnalysisResults(analysisResult: AnalysisResult, solidityCode: string): Promise<GasAnalysis[]> {
    const savedAnalyses: GasAnalysis[] = [];
    
    for (const networkResult of analysisResult.results) {
      // Save deployment analysis
      const deploymentAnalysis = await this.saveGasAnalysis({
        contractName: analysisResult.contractName,
        functionSignature: 'constructor',
        l2Network: networkResult.networkName,
        gasUsed: networkResult.deployment.gasUsed,
        estimatedL2Fee: networkResult.deployment.costETH,
        estimatedL1Fee: '0',
        totalEstimatedFeeUSD: networkResult.deployment.costUSD,
        solidityCode,
        compilationArtifacts: analysisResult.compilation || {},
        functionParameters: {}
      });
      savedAnalyses.push(deploymentAnalysis);

      // Save function analyses
      for (const func of networkResult.functions) {
        const functionAnalysis = await this.saveGasAnalysis({
          contractName: analysisResult.contractName,
          functionSignature: func.functionName,
          l2Network: networkResult.networkName,
          gasUsed: func.gasUsed,
          estimatedL2Fee: func.estimatedCostETH,
          estimatedL1Fee: '0',
          totalEstimatedFeeUSD: func.estimatedCostUSD,
          solidityCode,
          compilationArtifacts: analysisResult.compilation || {},
          functionParameters: {}
        });
        savedAnalyses.push(functionAnalysis);
      }
    }
    
    return savedAnalyses;
  }

  // Add method to get gas analysis history
  async getGasAnalysisHistory(limit: number = 50): Promise<GasAnalysis[]> {
    return await this.gasAnalysisRepository.find({
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  // Add method to get gas analysis by contract name
  async getGasAnalysisByContract(contractName: string): Promise<GasAnalysis[]> {
    return await this.gasAnalysisRepository.find({
      where: { contractName },
      order: { createdAt: 'DESC' }
    });
  }

  // Add method to get detailed gas analysis by ID
  async getGasAnalysisById(id: string): Promise<GasAnalysis | null> {
    return await this.gasAnalysisRepository.findOne({ where: { id } });
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
    // Estimate deployment gas
    const deploymentGas = this.estimateDeploymentGas(compilation.bytecode);
    const deploymentCostETH = this.calculateCostETH(deploymentGas, gasPriceData.totalFee);
    const deploymentCostUSD = parseFloat(deploymentCostETH) * ethPriceUSD;

    // Analyze functions
    const functions: GasEstimate[] = [];
    const contractInterface = new Interface(compilation.abi);
    
    for (const fragment of contractInterface.fragments) {
      if (fragment.type === 'function' && fragment instanceof FunctionFragment) {
        const gasEstimate = this.estimateFunctionGas(fragment);
        const costETH = this.calculateCostETH(gasEstimate, gasPriceData.totalFee);
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

  private estimateDeploymentGas(bytecode: string): number {
    // Rough estimation: 21000 base + 68 gas per byte of bytecode
    const bytecodeLength = (bytecode.length - 2) / 2; // Remove '0x' and convert hex to bytes
    return 21000 + (bytecodeLength * 68);
  }

  private estimateFunctionGas(fragment: FunctionFragment): number {
    // Basic gas estimation based on function complexity
    let baseGas = 21000; // Base transaction cost
    
    // Add gas based on function inputs
    baseGas += fragment.inputs.length * 1000;
    
    // Add gas for state changes (rough estimation)
    if (fragment.stateMutability === 'nonpayable' || fragment.stateMutability === 'payable') {
      baseGas += 20000; // State changing functions
    } else {
      baseGas = 3000; // View/pure functions
    }
    
    return baseGas;
  }

  private calculateCostETH(gasUsed: number, gasPriceGwei: number): string {
    const gasPriceWei = ethers.parseUnits(gasPriceGwei.toString(), 'gwei');
    const totalCostWei = BigInt(gasUsed) * gasPriceWei;
    return ethers.formatEther(totalCostWei);
  }

  private async getOptimalGasPrice(networkConfig: NetworkConfig): Promise<GasPriceData> {
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

  private async getNetworkTokenPrice(networkConfig: { chainId: number }): Promise<number> {
      // Map chain IDs to their native tokens with both ID and symbol support
      const tokenMap: { [chainId: number]: { id?: string, symbol?: string, name: string } } = {
          1: { id: 'ethereum', name: 'ETH' },           // Ethereum Mainnet
          11155111: { id: 'ethereum', name: 'ETH' },    // Sepolia
          137: { symbol: 'pol', name: 'POL' },         // Polygon Mainnet (use symbol for POL)
          80002: { symbol: 'pol', name: 'POL' },       // Polygon Amoy (use symbol for POL)
          42161: { id: 'ethereum', name: 'ETH' },       // Arbitrum One
          421614: { id: 'ethereum', name: 'ETH' },      // Arbitrum Sepolia
          10: { id: 'ethereum', name: 'ETH' },          // Optimism
          11155420: { id: 'ethereum', name: 'ETH' },    // Optimism Sepolia
          8453: { id: 'ethereum', name: 'ETH' },        // Base
          84532: { id: 'ethereum', name: 'ETH' }        // Base Sepolia
      };
  
      const token = tokenMap[networkConfig.chainId] || { id: 'ethereum', name: 'ETH' };
      
      this.logger.log(`Fetching ${token.name} price for chain ID ${networkConfig.chainId}...`);
      try {
          // Fetch multiple tokens at once using the symbols API with API key
          const url = 'https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&symbols=pol%2Ceth';
          const options = {
              method: 'GET',
              headers: {
                  'accept': 'application/json',
                  'x-cg-demo-api-key': 'CG-njMzeCqg4NmSv1JFwKypf5Zy'
              }
          };
          
          const response = await fetch(url, options);
          if (!response.ok) throw new Error(`CoinGecko API error: ${response.statusText}`);
          const data = await response.json();
          
          // Extract price based on token type
          let price: number;
          if (token.name === 'POL') {
              price = data?.POL?.usd;
          } else {
              price = data?.eth?.usd;
          }
          
          if (!price) throw new Error('Price not found in CoinGecko response');
          
          this.logger.log(`Successfully fetched ${token.name} price: $${price}`);
          return price;
      } catch (error) {
          const defaultPrice = token.name === 'POL' ? 0.5 : 3000; // Different defaults for different tokens
          this.logger.warn(`Could not fetch ${token.name} price, using default of $${defaultPrice}. Error: ${error.message}`);
          return defaultPrice;
      }
  }
}