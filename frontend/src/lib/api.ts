interface BenchmarkSession {
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
  }
  
  export const apiService = new ApiService();
  export type { BenchmarkSession };