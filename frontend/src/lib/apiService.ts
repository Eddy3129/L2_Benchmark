const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface BenchmarkSessionData {
  contractName: string;
  networks: string[];
  contracts: Array<{
    networkId: string;
    address: string;
    name: string;
    abi?: any;
  }>;
  functions: string[];
  timestamp: string;
}

interface BenchmarkSession {
  id: string;
  contractName: string;
  networks?: string[];
  results?: any;
  totalOperations?: number;
  avgGasUsed?: number;
  avgExecutionTime?: number;
  createdAt: string;
}

interface BenchmarkStats {
  totalSessions: number;
  avgOperations: number;
  avgGasUsed: number;
  avgExecutionTime: number;
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Benchmark Session Methods
  async createBenchmarkSession(data: BenchmarkSessionData): Promise<BenchmarkSession> {
    return this.request<BenchmarkSession>('/api/benchmark/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBenchmarkSessions(): Promise<BenchmarkSession[]> {
    return this.request<BenchmarkSession[]>('/api/benchmark/sessions');
  }

  async getBenchmarkSession(id: string): Promise<BenchmarkSession> {
    return this.request<BenchmarkSession>(`/api/benchmark/sessions/${id}`);
  }

  async deleteBenchmarkSession(id: string): Promise<void> {
    return this.request<void>(`/api/benchmark/sessions/${id}`, {
      method: 'DELETE',
    });
  }

  async getBenchmarkStats(): Promise<BenchmarkStats> {
    return this.request<BenchmarkStats>('/api/benchmark/stats');
  }

  async getBenchmarkSessionsByDateRange(startDate: string, endDate: string): Promise<BenchmarkSession[]> {
    const params = new URLSearchParams({
      startDate,
      endDate,
    });
    return this.request<BenchmarkSession[]>(`/api/benchmark/sessions/date-range?${params}`);
  }

  // Contract Analysis Methods (for gas estimator compatibility)
  async analyzeContract(data: {
    contractCode: string;
    networks: string[];
    compilerVersion?: string;
  }): Promise<any> {
    return this.request<any>('/api/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ABI Service Methods
  async fetchContractABI(address: string, networkId: string): Promise<any> {
    try {
      // This would typically call an external service like Etherscan
      // For now, return a basic ERC20 ABI as fallback
      return {
        abi: [
          {
            "constant": true,
            "inputs": [{"name": "_owner", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "balance", "type": "uint256"}],
            "type": "function"
          },
          {
            "constant": false,
            "inputs": [
              {"name": "_to", "type": "address"},
              {"name": "_value", "type": "uint256"}
            ],
            "name": "transfer",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
          },
          {
            "constant": false,
            "inputs": [
              {"name": "_spender", "type": "address"},
              {"name": "_value", "type": "uint256"}
            ],
            "name": "approve",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
          }
        ],
        name: 'Contract',
        symbol: 'TOKEN'
      };
    } catch (error) {
      console.error('Failed to fetch contract ABI:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
export default apiService;

// Export types for use in components
export type { BenchmarkSessionData, BenchmarkSession, BenchmarkStats };