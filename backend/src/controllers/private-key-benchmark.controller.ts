import { Controller, Post, Get, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { PrivateKeyBenchmarkService } from '../services/private-key-benchmark.service';
import { AbiService } from '../abi/abi.service';
import { getNetworkConfig } from '../config/networks';

interface StartBenchmarkRequest {
  contracts: Array<{
    networkId: string;
    address: string;
    name?: string;
  }>;
  functions: string[];
  parameters?: {
    [functionName: string]: {
      [paramName: string]: string;
    };
  };
}

@Controller('private-benchmark')
export class PrivateKeyBenchmarkController {

  constructor(
    private benchmarkService: PrivateKeyBenchmarkService,
    private abiService: AbiService
  ) {}

  @Post('start')
  async startBenchmark(@Body() request: StartBenchmarkRequest) {
    try {
      // Validate request
      if (!request.contracts || request.contracts.length === 0) {
        throw new HttpException('At least one contract is required', HttpStatus.BAD_REQUEST);
      }

      if (!request.functions || request.functions.length === 0) {
        throw new HttpException('At least one function is required', HttpStatus.BAD_REQUEST);
      }

      // Fetch ABIs for all contracts
      const contractsWithAbi = await Promise.all(
        request.contracts.map(async (contract) => {
          try {
            // Convert networkId to chainId using network configuration
            const networkConfig = getNetworkConfig(contract.networkId);
            if (!networkConfig) {
              throw new Error(`Unsupported network: ${contract.networkId}`);
            }
            
            const abi = await this.abiService.fetchContractAbi(contract.address, networkConfig.chainId);
            return {
              ...contract,
              abi,
              name: contract.name || `Contract_${contract.address.slice(0, 8)}`
            };
          } catch (error) {
            throw new HttpException(
              `Failed to fetch ABI for contract ${contract.address} on ${contract.networkId}: ${error.message}`,
              HttpStatus.BAD_REQUEST
            );
          }
        })
      );

      // Validate that parameters are provided for functions that need them
      if (!request.parameters) {
        throw new Error('Parameters are required for function execution');
      }

      // Start benchmark
      const sessionId = await this.benchmarkService.startBenchmark(
        contractsWithAbi,
        request.functions,
        request.parameters || {}
      );

      const session = this.benchmarkService.getSession(sessionId);
      return {
        success: true,
        sessionId,
        session
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to start benchmark',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('sessions')
  async getAllSessions() {
    try {
      const sessions = this.benchmarkService.getAllSessions();
      return {
        success: true,
        sessions: sessions.map(session => ({
          id: session.id,
          status: session.status,
          startTime: session.startTime,
          endTime: session.endTime,
          summary: session.summary,
          transactionCount: session.transactions.length
        }))
      };
    } catch (error) {
      throw new HttpException(
        'Failed to fetch sessions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('sessions/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    try {
      const session = this.benchmarkService.getSession(sessionId);
      if (!session) {
        throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        session
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch session',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('sessions/:sessionId/status')
  async getSessionStatus(@Param('sessionId') sessionId: string) {
    try {
      const session = this.benchmarkService.getSession(sessionId);
      if (!session) {
        throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        sessionId: session.id,
        status: session.status,
        progress: {
          totalTransactions: session.summary.totalTransactions,
          successfulTransactions: session.summary.successfulTransactions,
          failedTransactions: session.summary.failedTransactions
        },
        summary: session.summary,
        recentTransactions: session.transactions.slice(-5) // Last 5 transactions
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch session status',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('sessions/:sessionId/transactions')
  async getSessionTransactions(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    try {
      const session = this.benchmarkService.getSession(sessionId);
      if (!session) {
        throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
      }

      const limitNum = limit ? parseInt(limit, 10) : 50;
      const offsetNum = offset ? parseInt(offset, 10) : 0;

      const transactions = session.transactions.slice(offsetNum, offsetNum + limitNum);

      return {
        success: true,
        transactions,
        total: session.transactions.length,
        limit: limitNum,
        offset: offsetNum
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch transactions',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('sessions/:sessionId/export')
  async exportSession(@Param('sessionId') sessionId: string) {
    try {
      const csvContent = await this.benchmarkService.exportSessionToCsv(sessionId);
      
      return {
        success: true,
        filename: `benchmark_${sessionId}_${new Date().toISOString().split('T')[0]}.csv`,
        content: csvContent,
        contentType: 'text/csv'
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to export session',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('networks')
  async getSupportedNetworks() {
    try {
      // Return supported networks for benchmarking
      const networks = [
        { id: 'sepolia', name: 'Ethereum Sepolia', chainId: 11155111 },
        { id: 'base-sepolia', name: 'Base Sepolia', chainId: 84532 },
        { id: 'arbitrum-sepolia', name: 'Arbitrum Sepolia', chainId: 421614 },
        { id: 'optimism-sepolia', name: 'Optimism Sepolia', chainId: 11155420 },
        { id: 'polygon-zkevm-testnet', name: 'Polygon zkEVM Testnet', chainId: 2442 },
        { id: 'zksync-sepolia', name: 'zkSync Sepolia', chainId: 300 }
      ];

      return {
        success: true,
        networks
      };
    } catch (error) {
      throw new HttpException(
        'Failed to fetch supported networks',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('validate-contract')
  async validateContract(@Body() request: { address: string; networkId: string }) {
    try {
      // Convert networkId to chainId using network configuration
      const networkConfig = getNetworkConfig(request.networkId);
      if (!networkConfig) {
        throw new Error(`Unsupported network: ${request.networkId}`);
      }
      
      const abi = await this.abiService.fetchContractAbi(request.address, networkConfig.chainId);
      
      // Find executable functions
      const executableFunctions = abi.filter(item => 
        item.type === 'function' && 
        (item.stateMutability === 'nonpayable' || item.stateMutability === 'payable')
      ).map(func => ({
        name: func.name,
        inputs: func.inputs || [],
        stateMutability: func.stateMutability
      }));

      return {
        success: true,
        valid: true,
        functions: executableFunctions,
        totalFunctions: executableFunctions.length
      };
    } catch (error) {
      return {
        success: false,
        valid: false,
        error: error.message,
        functions: []
      };
    }
  }
}