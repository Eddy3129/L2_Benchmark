export interface GasAnalysis {
  id: string;
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
  createdAt: string;
}

export interface BenchmarkSession {
    id?: number;
    results: {
      transactions: {
        totalTransactions: number;
        successfulTransactions: number;
        failedTransactions: number;
        totalGasUsed: string;
        totalFees: string;
      };
    };
    totalOperations: number;
    avgGasUsed: number;
    avgExecutionTime: number;
    createdAt?: string;
  }
  
  class ApiService {
    private baseUrl = 'http://localhost:3001/api';
  
    async createBenchmarkSession(data: Omit<BenchmarkSession, 'id' | 'createdAt'>): Promise<BenchmarkSession> {
      const response = await fetch(`${this.baseUrl}/benchmark/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to create benchmark session: ${response.statusText}`);
      }
  
      return response.json();
    }
  
    async getBenchmarkSessions(): Promise<BenchmarkSession[]> {
      const response = await fetch(`${this.baseUrl}/benchmark/sessions`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch benchmark sessions: ${response.statusText}`);
      }
  
      return response.json();
    }
  
    async getBenchmarkSession(id: number): Promise<BenchmarkSession> {
      const response = await fetch(`${this.baseUrl}/benchmark/sessions/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch benchmark session: ${response.statusText}`);
      }
  
      return response.json();
    }
  
  // Gas Analysis methods
  async analyzeContract(data: {
    code: string;
    networks: string[];
    contractName: string;
    saveToDatabase?: boolean;
  }) {
    const response = await fetch(`${this.baseUrl}/gas-analyzer/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to analyze contract: ${response.statusText}`);
    }

    return response.json();
  }

  async getGasAnalysisHistory(limit?: number): Promise<GasAnalysis[]> {
    const url = limit ? `${this.baseUrl}/gas-analyzer/history?limit=${limit}` : `${this.baseUrl}/gas-analyzer/history`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch gas analysis history: ${response.statusText}`);
    }

    return response.json();
  }

  async getGasAnalysisByContract(contractName: string): Promise<GasAnalysis[]> {
    const response = await fetch(`${this.baseUrl}/gas-analyzer/contract/${contractName}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch gas analysis for contract: ${response.statusText}`);
    }

    return response.json();
  }

  async getGasAnalysisById(id: string): Promise<GasAnalysis> {
    const response = await fetch(`${this.baseUrl}/gas-analyzer/analysis/${id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch gas analysis: ${response.statusText}`);
    }

    return response.json();
  }
  }
  
  export const apiService = new ApiService();
  // export type { BenchmarkSession, GasAnalysis };