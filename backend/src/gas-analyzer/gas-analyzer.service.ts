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
    
    return { contractName, results, timestamp: new Date().toISOString() };
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

      const artifactPath = path.join(this.hardhatProjectRoot, 'artifacts', 'contracts', 'temp', tempFileName, `${contractName}.json`);
      const artifactContent = await fs.readFile(artifactPath, 'utf8');
      const artifacts = JSON.parse(artifactContent);

      return { abi: artifacts.abi, bytecode: artifacts.bytecode, contractName };
    } finally {
      await fs.rm(tempFilePath, { force: true }).catch(err => this.logger.error(`Failed to clean temp file: ${err.message}`));
    }
  }

  private async analyzeNetworkGas(
    compilation: CompilationResult,
    gasPriceData: GasPriceData,
    tokenPriceUSD: number  // Changed from ethPriceUSD
  ): Promise<NetworkAnalysisResult> {
    const { abi, bytecode } = compilation;
    let hardhatNodeProcess: ChildProcess | null = null;

    try {
      hardhatNodeProcess = exec('npx hardhat node', { cwd: this.hardhatProjectRoot });
      await new Promise(resolve => setTimeout(resolve, 4000));

      const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      const deployer = await provider.getSigner(0);
      const recipient = await provider.getSigner(1);

      const contractFactory = new ContractFactory(abi, bytecode, deployer);
      
      const constructorInputs = contractFactory.interface.fragments.find(f => f.type === 'constructor')?.inputs || [];
      const mockConstructorArgs = this.generateMockParameters(constructorInputs, await deployer.getAddress(), await recipient.getAddress());
      
      const deployTx = await contractFactory.getDeployTransaction(...mockConstructorArgs);
      const deploymentGasUsed = await provider.estimateGas({ data: deployTx.data, from: await deployer.getAddress() });

      const deployedContract = await contractFactory.deploy(...mockConstructorArgs);
      await deployedContract.waitForDeployment();

      const functionEstimates = await this.estimateFunctionGas(deployedContract as any, deployer, recipient, gasPriceData, tokenPriceUSD);
      const deploymentCost = this.calculateCost(deploymentGasUsed, gasPriceData.totalFee, tokenPriceUSD);

      return {
        deployment: { gasUsed: deploymentGasUsed.toString(), costETH: deploymentCost.eth, costUSD: deploymentCost.usd },
        functions: functionEstimates,
        gasPrice: gasPriceData.totalFee.toString(),
        ethPriceUSD: tokenPriceUSD,  // This should be renamed to tokenPriceUSD
        gasPriceBreakdown: gasPriceData
      };
    } finally {
      if (hardhatNodeProcess) hardhatNodeProcess.kill();
    }
  }

  private async estimateFunctionGas(
      contract: ethers.Contract,
      deployer: ethers.Signer,
      recipient: ethers.Signer,
      gasPriceData: GasPriceData,
      tokenPriceUSD: number  // Changed from ethPriceUSD
  ): Promise<GasEstimate[]> {
      const estimates: GasEstimate[] = [];
      const functions: FunctionFragment[] = [];
      
      contract.interface.forEachFunction((func) => {
          if (!['view', 'pure'].includes(func.stateMutability)) {
              functions.push(func);
          }
      });

      const deployerAddress = await deployer.getAddress();
      const recipientAddress = await recipient.getAddress();

      // Pre-fund recipient and set approvals if necessary for transferFrom
      if (functions.some(f => f.name === 'transferFrom')) {
          this.logger.log("Pre-funding and approving for transferFrom simulation...");
          try {
            // Check if transfer and approve functions exist before calling
            if (contract.interface.hasFunction('transfer')) {
                await contract.connect(deployer)['transfer(address,uint256)'](recipientAddress, ethers.parseEther('100'));
            }
            if (contract.interface.hasFunction('approve')) {
                await contract.connect(recipient)['approve(address,uint256)'](deployerAddress, ethers.MaxUint256);
            }
            this.logger.log("Setup for transferFrom complete.");
        } catch(e) {
            this.logger.warn(`Could not set up for transferFrom: ${e.message}`);
        }
      }

      for (const func of functions) {
          const functionName = func.name;
          try {
              const mockParams = this.generateMockParameters(func.inputs, deployerAddress, recipientAddress);
              const contractFunc = contract.connect(deployer).getFunction(functionName);
              const gasUsed = await contractFunc.estimateGas(...mockParams);
              const cost = this.calculateCost(gasUsed, gasPriceData.totalFee, tokenPriceUSD);

              estimates.push({ functionName, gasUsed: gasUsed.toString(), estimatedCostETH: cost.eth, estimatedCostUSD: cost.usd });
          } catch (error) {
              this.logger.warn(`Gas estimation failed for function '${functionName}': ${error.reason || error.message}`);
              estimates.push({ functionName, gasUsed: 'N/A', estimatedCostETH: 'N/A', estimatedCostUSD: 0 });
          }
      }
      return estimates;
  }
  
  private generateMockParameters(inputs: readonly ethers.ParamType[], mainAddress: string, secondaryAddress: string): any[] {
    return inputs.map((input, index) => {
        const type = input.type;
        // For transferFrom(from, to, amount), 'from' is the first address, 'to' is the second
        if (type.includes('address') && index === 0) return secondaryAddress; 
        if (type.includes('address')) return mainAddress;
        if (type.includes('uint')) return 1; 
        if (type.includes('string')) return 'test';
        if (type.includes('bool')) return true;
        if (type.includes('bytes')) return '0x1234';
        return '0';
    });
  }

  private calculateCost(gasUsed: bigint, gasPriceGwei: number, tokenPriceUSD: number) {
      const gasPriceWei = ethers.parseUnits(gasPriceGwei.toString(), 'gwei');
      const costWei = gasUsed * gasPriceWei;
      const costToken = parseFloat(ethers.formatEther(costWei));  // Cost in native token
      const costUsd = costToken * tokenPriceUSD;
      return {
          eth: costToken.toFixed(8),  // This should be renamed to 'token' but keeping for compatibility
          usd: parseFloat(costUsd.toFixed(4))
      };
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
