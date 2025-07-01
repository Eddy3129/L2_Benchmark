// Shared type definitions across the application

export interface NetworkResult {
  network: string;
  networkName: string;
  deployment: {
    gasUsed: string;
    costETH: string;
    costUSD: number;
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
  };
}

export interface GasEstimate {
  functionName: string;
  gasUsed: string;
  estimatedCostETH: string;
  estimatedCostUSD: number;
}

export interface AnalysisProgress {
  stage: 'idle' | 'compiling' | 'deploying' | 'analyzing' | 'complete';
  progress: number;
  message: string;
}

export interface NetworkConfig {
  id: string;
  name: string;
  color: string;
  symbol?: string;
  chainId?: number;
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