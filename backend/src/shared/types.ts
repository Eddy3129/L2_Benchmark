// Shared type definitions for the backend

export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  gasPriceChainId?: number; // Optional chain ID to use for gas price fetching
}

export interface GasPriceData {
  baseFee: number;
  priorityFee: number;
  totalFee: number; // in Gwei
  confidence: number;
  source: 'blocknative' | 'provider' | 'hardhat' | 'mainnet-pricing';
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
  deployment: { 
    gasUsed: string; 
    costETH: string; 
    costUSD: number; 
  };
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
  compilation?: any;
}

// API Request/Response types
export interface AnalyzeContractRequest {
  code: string;
  networks: string[];
  contractName: string;
  confidenceLevel?: number;
  saveToDatabase?: boolean;
}

export interface CompareNetworksRequest {
  code: string;
  contractName: string;
  l2Networks: string[];
  confidenceLevel?: number;
  saveToDatabase?: boolean;
}

// Database entity interfaces
export interface GasAnalysisData {
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
}

export interface BenchmarkSessionData {
  results: any;
  totalOperations: number;
  avgGasUsed: number;
  avgExecutionTime: number;
}

// Error types
export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  type?: string;
}