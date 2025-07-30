// Shared type definitions across the application

export interface NetworkResult {
  network: string;
  networkName: string;
  deployment: {
    gasUsed: string;
    costETH: string;
    costUSD: number;
    l1DataCost?: number; // L1 data posting cost for L2s
    l2ExecutionCost?: number; // L2 execution cost
    totalCost?: number; // Total cost including L1 + L2
  };
  functions: GasEstimate[];
  gasPrice: string;
  ethPriceUSD: number;
  gasPriceBreakdown: {
    baseFee: number;
    priorityFee: number;
    totalFee: number;
    confidence: number;
    source: string;
    l1GasPrice?: number; // L1 gas price for L2 networks (unified mainnet pricing)
    l1DataFee?: number; // L1 data fee component
    l2ExecutionFee?: number; // L2 execution fee component
  };
  simulationData?: {
    forkBlockNumber: number;
    actualGasUsed: string;
    simulationAccuracy: 'HIGH' | 'MEDIUM' | 'LOW';
  };
}

export interface GasEstimate {
  functionName: string;
  gasUsed: string;
  estimatedCostETH: string;
  estimatedCostUSD: number;
  l1DataCost?: number; // L1 data posting cost for L2s
  l2ExecutionCost?: number; // L2 execution cost
  totalCost?: number; // Total cost including L1 + L2
  simulationData?: {
    actualGasUsed: string;
    simulationAccuracy: 'HIGH' | 'MEDIUM' | 'LOW';
  };
}

export interface AnalysisProgress {
  stage: 'idle' | 'compiling' | 'deploying' | 'analyzing' | 'complete';
  progress: number;
  message: string;
  currentNetwork?: string;
  networksCompleted?: number;
  totalNetworks?: number;
}

export interface SequentialAnalysisResult {
  contractName: string;
  timestamp: string;
  compilation: any;
  results: NetworkResult[];
  totalOperations: number;
  avgGasUsed: number;
  avgExecutionTime: number;
  analysisMethod: 'SIMULATION' | 'STATIC' | 'HYBRID';
  networksAnalyzed: string[];
}

export interface NetworkAnalysisStatus {
  network: string;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  result?: NetworkResult;
}

export interface NetworkConfig {
  id: string;
  name: string;
  color: string;
  symbol?: string;
  chainId?: number;
  explorerUrl?: string;
}

export interface GasPriceBreakdown {
  totalFee: number;
  source: string;
  confidence: number;
  baseFee?: number;
  priorityFee?: number;
}

export interface FunctionComparison {
  functionName: string;
  local: {
    gasUsed: string;
    costETH: string;
    costUSD: number;
  };
  l2: {
    gasUsed: string;
    costETH: string;
    costUSD: number;
  };
  savings: {
    gasReduction: number;
    costSavingsETH: number;
    costSavingsUSD: number;
    percentageSaving: number;
  };
}

export interface NetworkComparison {
  network: string;
  gasPrice: string;
  gasPriceBreakdown?: GasPriceBreakdown;
  deployment: {
    local: {
      gasUsed: string;
      costETH: string;
      costUSD: number;
    };
    l2: {
      gasUsed: string;
      costETH: string;
      costUSD: number;
    };
    savings: {
      gasReduction: number;
      costSavingsETH: number;
      costSavingsUSD: number;
      percentageSaving: number;
    };
  };
  functions: FunctionComparison[];
  summary: {
    totalLocalCost: number;
    totalL2Cost: number;
    totalSavings: number;
  };
}