import { Controller, Post, Get, Body, Query, Param, Delete, HttpStatus, HttpException, Sse, MessageEvent } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { SequencerPerformanceService } from '../sequencer-performance.service';
import { L1FinalityService } from '../l1-finality.service';
import { ContractComplexityService } from '../contract-complexity.service';
import { ValidationUtils } from '../../shared/validation-utils';
import { SequencerPerformanceTest } from '../sequencer-performance.entity';
import { ContractComplexityProfile } from '../contract-complexity.entity';
import {
  RunSequencerTestDto,
  SequencerTestResultDto,
  StartL1FinalityTrackingDto,
  StopL1FinalityTrackingDto,
  L1FinalityResultDto,
  AnalyzeContractComplexityDto,
  CompareContractComplexityDto,
  ContractComplexityResultDto,
  GetSequencerHistoryDto,
  GetL1FinalityHistoryDto,
  GetComplexityHistoryDto
} from '../dto/advanced-analysis.dto';

@ApiTags('Advanced Analysis')
@Controller('advanced-analysis')
export class AdvancedAnalysisController {
  constructor(
    private readonly sequencerPerformanceService: SequencerPerformanceService,
    private readonly l1FinalityService: L1FinalityService,
    private readonly contractComplexityService: ContractComplexityService,
  ) {}

  private transformToSequencerTestResultDto(test: SequencerPerformanceTest): SequencerTestResultDto {
    // Calculate real-time transaction status
    const lowFeeTransactions = test.transactionResults?.lowFeeTransactions || [];
    const normalFeeTransactions = test.transactionResults?.normalFeeTransactions || [];
    
    console.log(`[DEBUG] Transforming test ${test.sessionId}: lowFee=${lowFeeTransactions.length}, normalFee=${normalFeeTransactions.length}, status=${test.status}`);
    
    const lowFeeSent = lowFeeTransactions.length;
    const lowFeeConfirmed = lowFeeTransactions.filter(tx => tx.status === 'confirmed').length;
    const lowFeePending = lowFeeTransactions.filter(tx => tx.status === 'pending').length;
    const lowFeeFailed = lowFeeTransactions.filter(tx => tx.status === 'failed' || tx.status === 'dropped').length;
    
    const normalFeeSent = normalFeeTransactions.length;
    const normalFeeConfirmed = normalFeeTransactions.filter(tx => tx.status === 'confirmed').length;
    const normalFeePending = normalFeeTransactions.filter(tx => tx.status === 'pending').length;
    const normalFeeFailed = normalFeeTransactions.filter(tx => tx.status === 'failed' || tx.status === 'dropped').length;
    
    console.log(`[DEBUG] Calculated counts - Total sent: ${lowFeeSent + normalFeeSent}, confirmed: ${lowFeeConfirmed + normalFeeConfirmed}`);
    
    return {
      sessionId: test.sessionId,
      l2Network: test.l2Network,
      testType: test.testType as any,
      testConfig: {
        transactionCount: test.testConfiguration.lowFeeTransactionCount + test.testConfiguration.normalFeeTransactionCount,
        testDurationSeconds: test.testConfiguration.testDurationSeconds,
        minFeePerGas: parseFloat(test.testConfiguration.minPriorityFeePerGas),
        maxFeePerGas: parseFloat(test.testConfiguration.normalPriorityFeePerGas)
      },
      realTimeStatus: {
        transactionsSent: lowFeeSent + normalFeeSent,
        transactionsConfirmed: lowFeeConfirmed + normalFeeConfirmed,
        transactionsPending: lowFeePending + normalFeePending,
        transactionsFailed: lowFeeFailed + normalFeeFailed,
        lowFeeTransactions: {
          sent: lowFeeSent,
          confirmed: lowFeeConfirmed,
          pending: lowFeePending,
          failed: lowFeeFailed
        },
        normalFeeTransactions: {
          sent: normalFeeSent,
          confirmed: normalFeeConfirmed,
          pending: normalFeePending,
          failed: normalFeeFailed
        }
      },
      metrics: {
        inclusionRate: test.performanceMetrics?.inclusionRate ? 
          (test.performanceMetrics.inclusionRate.lowFeeTransactions + test.performanceMetrics.inclusionRate.normalFeeTransactions) / 2 : 0,
        avgConfirmationLatency: test.performanceMetrics?.confirmationLatency ? 
          ((test.performanceMetrics.confirmationLatency.lowFeeAvgMs + test.performanceMetrics.confirmationLatency.normalFeeAvgMs) / 2) / 1000 : 0, // Convert ms to seconds
        parallelProcessingCapability: test.performanceMetrics?.parallelProcessingCapability?.parallelProcessingEfficiency || 0,
        censorshipResistanceScore: test.performanceMetrics?.censorshipResistanceScore || 0
      },
      totalTestCostETH: test.totalTestCostUSD ? (test.totalTestCostUSD / 2000).toFixed(6) : '0', // Convert USD to ETH (assuming $2000/ETH)
      totalTestCostUSD: test.totalTestCostUSD || 0,
      status: test.status || (test.completedAt ? 'completed' : 'running'),
      startedAt: test.createdAt,
      completedAt: test.completedAt,
      errorMessage: test.notes?.includes('failed') ? test.notes : undefined
    };
  }

  private transformToContractComplexityResultDto(profile: ContractComplexityProfile): ContractComplexityResultDto {
    return {
      sessionId: profile.sessionId,
      contractName: profile.contractName,
      functionName: profile.functionName,
      l2Network: profile.l2Network,
      transactionHash: profile.transactionHash,
      gasAnalysis: profile.gasBreakdown,
      totalGasUsed: parseInt(profile.executionTrace.totalGasUsed) || 0,
      complexityMetrics: profile.complexityMetrics,
      optimizationSuggestions: profile.optimizationRecommendations,
      executionTrace: profile.executionTrace,
      compilationArtifacts: profile.compilationArtifacts,
      createdAt: profile.createdAt
    };
  }

  private transformToL1FinalityResultDto(tracking: any): L1FinalityResultDto {
    return {
      sessionId: tracking.sessionId,
      l2Network: tracking.l2Network,
      l1Network: tracking.l1Network || 'mainnet',
      status: tracking.status || 'monitoring',
      metrics: tracking.finalityMetrics || {},
      batchesTracked: tracking.batchesTracked || 0,
      totalL2Transactions: tracking.totalL2Transactions || 0,
      startedAt: tracking.createdAt
    };
  }

  // Sequencer Performance Analysis Endpoints
  @Post('sequencer/test')
  @ApiOperation({ summary: 'Run sequencer performance test' })
  @ApiResponse({ status: 201, description: 'Test started successfully', type: SequencerTestResultDto })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  async runSequencerTest(@Body() dto: RunSequencerTestDto): Promise<SequencerTestResultDto> {
    try {
      // Validate the request
      this.validateSequencerTestRequest(dto);
      
      // Run the test with proper defaults
      const transactionCount = dto.transactionCount && dto.transactionCount > 0 ? dto.transactionCount : 5;
      const result = await this.sequencerPerformanceService.runPerformanceTest({
        l2Network: dto.l2Network,
        testType: dto.testType,
        lowFeeTransactionCount: transactionCount,
        normalFeeTransactionCount: transactionCount,
        minPriorityFeePerGas: dto.minFeePerGas?.toString() || '1000000000', // 1 gwei default
        normalPriorityFeePerGas: dto.maxFeePerGas?.toString() || '10000000000', // 10 gwei default
        testDurationSeconds: dto.testDurationSeconds || 300,
        parallelAccountsUsed: 2
      });
      
      return this.transformToSequencerTestResultDto(result);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to run sequencer test: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('sequencer/history')
  @ApiOperation({ summary: 'Get sequencer performance test history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully', type: [SequencerTestResultDto] })
  @ApiQuery({ name: 'l2Network', required: false, description: 'Filter by L2 network' })
  @ApiQuery({ name: 'testType', required: false, description: 'Filter by test type' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results to return' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of results to skip' })
  async getSequencerHistory(@Query() query: GetSequencerHistoryDto): Promise<SequencerTestResultDto[]> {
    try {
      const limit = query.limit || 50;
      const offset = query.offset || 0;
      
      const results = await this.sequencerPerformanceService.getTestHistory(limit);
      return results.map(result => this.transformToSequencerTestResultDto(result));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to retrieve sequencer history: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('sequencer/test/:sessionId')
  @ApiOperation({ summary: 'Get specific sequencer test result' })
  @ApiResponse({ status: 200, description: 'Test result retrieved successfully', type: SequencerTestResultDto })
  @ApiResponse({ status: 404, description: 'Test result not found' })
  @ApiParam({ name: 'sessionId', description: 'Test session ID' })
  async getSequencerTestResult(@Param('sessionId') sessionId: string): Promise<SequencerTestResultDto> {
    try {
      // Validate session ID format (custom format: seq-test-timestamp-randomstring)
      if (!sessionId || !sessionId.startsWith('seq-test-')) {
        throw new HttpException('Invalid session ID format', HttpStatus.BAD_REQUEST);
      }
      
      const result = await this.sequencerPerformanceService.getTestResult(sessionId);
      if (!result) {
        throw new HttpException('Test result not found', HttpStatus.NOT_FOUND);
      }
      return this.transformToSequencerTestResultDto(result);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to retrieve test result: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // L1 Finality Analysis Endpoints
  @Post('l1-finality/start')
  @ApiOperation({ summary: 'Start REAL L1 finality tracking using live blockchain data' })
  @ApiResponse({ status: 201, description: 'Real L1 finality tracking started successfully', type: L1FinalityResultDto })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  async startL1FinalityTracking(@Body() dto: StartL1FinalityTrackingDto): Promise<L1FinalityResultDto> {
    try {
      console.log('Starting REAL L1 finality tracking with config:', dto);
      
      // Validate the request
      this.validateL1FinalityRequest(dto);
      
      // Start REAL blockchain monitoring
      const sessionId = await this.l1FinalityService.startL1FinalityTracking({
        l2Network: dto.l2Network,
        l1Network: dto.l1Network,
        l2TransactionHashes: [], // Will be populated by real blockchain monitoring
        monitoringDurationHours: dto.monitoringDurationHours || 24
      });
      
      const result: L1FinalityResultDto = {
        sessionId,
        l2Network: dto.l2Network,
        l1Network: dto.l1Network,
        status: 'active' as any,
        metrics: {
          avgTimeToL1Settlement: 0,
          avgL1SettlementCostPerBatch: '0',
          avgAmortizedL1CostPerTransaction: '0',
          finalityConfidenceLevel: 0
        },
        batchesTracked: 0,
        totalL2Transactions: 0,
        startedAt: new Date()
      };
      
      console.log(`Real blockchain monitoring started for session: ${sessionId}`);
      return result;
    } catch (error) {
      console.error('Error starting real L1 finality tracking:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to start real L1 finality tracking: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('l1-finality/stop')
  @ApiOperation({ summary: 'Stop REAL L1 finality tracking session' })
  @ApiResponse({ status: 200, description: 'Real L1 finality tracking stopped successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async stopL1FinalityTracking(@Body() dto: StopL1FinalityTrackingDto): Promise<{ message: string }> {
    try {
      ValidationUtils.validateUUID(dto.sessionId);
      await this.l1FinalityService.stopL1FinalityTracking(dto.sessionId);
      return { message: 'Real L1 finality tracking stopped successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to stop real L1 finality tracking: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Sse('l1-finality/stream/:sessionId')
  @ApiOperation({ summary: 'Stream real-time L1 finality updates via Server-Sent Events' })
  @ApiResponse({ status: 200, description: 'Real-time batch detection stream' })
  @ApiParam({ name: 'sessionId', description: 'L1 finality tracking session ID' })
  streamL1FinalityUpdates(@Param('sessionId') sessionId: string): Observable<MessageEvent> {
    console.log(`Setting up real-time stream for session: ${sessionId}`);
    
    try {
      ValidationUtils.validateUUID(sessionId);
      return this.l1FinalityService.getSessionStream(sessionId);
    } catch (error) {
      console.error(`Error setting up stream for session ${sessionId}:`, error);
      throw new HttpException(
        `Failed to setup real-time stream: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('l1-finality/results/:sessionId')
  @ApiOperation({ summary: 'Get L1 finality tracking results' })
  @ApiResponse({ status: 200, description: 'Results retrieved successfully', type: L1FinalityResultDto })
  @ApiResponse({ status: 404, description: 'Tracking session not found' })
  @ApiParam({ name: 'sessionId', description: 'Tracking session ID' })
  async getL1FinalityResults(@Param('sessionId') sessionId: string): Promise<L1FinalityResultDto> {
    try {
      ValidationUtils.validateUUID(sessionId);
      const results = await this.l1FinalityService.getL1FinalityResults(sessionId);
      
      if (results.length === 0) {
        throw new HttpException(
          'No L1 finality results found for the specified session ID',
          HttpStatus.NOT_FOUND
        );
      }
      
      return this.transformToL1FinalityResultDto(results[0]);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to retrieve L1 finality results: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('l1-finality/statistics')
  @ApiOperation({ summary: 'Get L1 finality statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiQuery({ name: 'l2Network', required: false, description: 'Filter by L2 network' })
  @ApiQuery({ name: 'l1Network', required: false, description: 'Filter by L1 network' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results to return' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of results to skip' })
  async getL1FinalityStatistics(@Query() query: GetL1FinalityHistoryDto): Promise<any> {
    try {
      const limit = query.limit || 50;
      const offset = query.offset || 0;
      
      return await this.l1FinalityService.getL1FinalityStatistics(query.l2Network);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to retrieve L1 finality statistics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('l1-finality/history')
  @ApiOperation({ summary: 'Get L1 finality tracking history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully', type: [L1FinalityResultDto] })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results to return', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of results to skip', type: Number })
  async getL1FinalityHistory(@Query() query: GetL1FinalityHistoryDto): Promise<L1FinalityResultDto[]> {
    try {
      const limit = query.limit || 50;
      const offset = query.offset || 0;
      
      const results = await this.l1FinalityService.getL1FinalityHistory(limit);
      return results.map(result => this.transformToL1FinalityResultDto(result));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to retrieve L1 finality history: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Contract Complexity Analysis Endpoints
  @Post('contract-complexity/analyze')
  @ApiOperation({ summary: 'Analyze contract complexity' })
  @ApiResponse({ status: 201, description: 'Analysis completed successfully', type: ContractComplexityResultDto })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  async analyzeContractComplexity(@Body() dto: AnalyzeContractComplexityDto): Promise<ContractComplexityResultDto> {
    try {
      // Validate the request
      this.validateContractComplexityRequest(dto);
      
      // Perform analysis
      const result = await this.contractComplexityService.analyzeContractComplexity({
        solidityCode: dto.code,
        contractName: dto.contractName,
        functionName: dto.functionName,
        l2Network: dto.l2Network,
        functionParameters: dto.functionParameters || [],
        enableDetailedTracing: true,
        enableOptimizationAnalysis: dto.includeOptimizations !== false
      });
      
      return this.transformToContractComplexityResultDto(result);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to analyze contract complexity: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('contract-complexity/compare')
  @ApiOperation({ summary: 'Compare contract complexity across networks' })
  @ApiResponse({ status: 201, description: 'Comparison completed successfully', type: [ContractComplexityResultDto] })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  async compareContractComplexity(@Body() dto: CompareContractComplexityDto): Promise<ContractComplexityResultDto[]> {
    try {
      // Validate the request
      this.validateContractComplexityCompareRequest(dto);
      
      // Perform comparison across networks
      const results = await this.contractComplexityService.compareComplexityAcrossNetworks(
        dto.contractName,
        dto.functionName
      );
      
      return results.map(result => this.transformToContractComplexityResultDto(result));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to compare contract complexity: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('contract-complexity/history')
  @ApiOperation({ summary: 'Get contract complexity analysis history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully', type: [ContractComplexityResultDto] })
  @ApiQuery({ name: 'contractName', required: false, description: 'Filter by contract name' })
  @ApiQuery({ name: 'functionName', required: false, description: 'Filter by function name' })
  @ApiQuery({ name: 'l2Network', required: false, description: 'Filter by L2 network' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results to return' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of results to skip' })
  async getContractComplexityHistory(@Query() query: GetComplexityHistoryDto): Promise<ContractComplexityResultDto[]> {
    try {
      const limit = query.limit || 50;
      const offset = query.offset || 0;
      
      let results: ContractComplexityProfile[];
      if (query.contractName) {
        results = await this.contractComplexityService.getComplexityProfileByContract(query.contractName);
      } else if (query.l2Network) {
        results = await this.contractComplexityService.getComplexityProfileByNetwork(query.l2Network);
      } else {
        results = await this.contractComplexityService.getComplexityProfileHistory(limit);
      }
      return results.map(result => this.transformToContractComplexityResultDto(result));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to retrieve complexity analysis history: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('contract-complexity/analysis/:sessionId')
  @ApiOperation({ summary: 'Get specific complexity analysis result' })
  @ApiResponse({ status: 200, description: 'Analysis result retrieved successfully', type: ContractComplexityResultDto })
  @ApiResponse({ status: 404, description: 'Analysis result not found' })
  @ApiParam({ name: 'sessionId', description: 'Analysis session ID' })
  async getContractComplexityResult(@Param('sessionId') sessionId: string): Promise<ContractComplexityResultDto> {
    try {
      ValidationUtils.validateUUID(sessionId);
      const result = await this.contractComplexityService.getComplexityAnalysisResult(sessionId);
      return this.transformToContractComplexityResultDto(result);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to retrieve complexity analysis result: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Private validation methods
  private validateSequencerTestRequest(dto: RunSequencerTestDto): void {
    const errors: string[] = [];
    
    if (!dto.l2Network || typeof dto.l2Network !== 'string') {
      errors.push('L2 network is required and must be a string');
    }
    
    if (!dto.testType || !['low_fee_test', 'stuck_transaction_test', 'fee_market_stress'].includes(dto.testType)) {
      errors.push('Test type is required and must be one of: low_fee_test, stuck_transaction_test, fee_market_stress');
    }
    
    if (dto.transactionCount !== undefined && (typeof dto.transactionCount !== 'number' || dto.transactionCount < 1 || dto.transactionCount > 100)) {
      errors.push('Transaction count must be a number between 1 and 100');
    }
    
    if (dto.testDurationSeconds !== undefined && (typeof dto.testDurationSeconds !== 'number' || dto.testDurationSeconds < 60 || dto.testDurationSeconds > 3600)) {
      errors.push('Test duration must be a number between 60 and 3600 seconds');
    }
    
    if (errors.length > 0) {
      throw ValidationUtils.createValidationError(errors);
    }
  }

  private validateL1FinalityRequest(dto: StartL1FinalityTrackingDto): void {
    const errors: string[] = [];
    
    if (!dto.l2Network || typeof dto.l2Network !== 'string') {
      errors.push('L2 network is required and must be a string');
    }
    
    if (!dto.l1Network || typeof dto.l1Network !== 'string') {
      errors.push('L1 network is required and must be a string');
    }
    
    if (dto.monitoringDurationHours !== undefined && (typeof dto.monitoringDurationHours !== 'number' || dto.monitoringDurationHours < 1 || dto.monitoringDurationHours > 168)) {
      errors.push('Monitoring duration must be a number between 1 and 168 hours');
    }
    
    if (errors.length > 0) {
      throw ValidationUtils.createValidationError(errors);
    }
  }

  private validateContractComplexityRequest(dto: AnalyzeContractComplexityDto): void {
    const errors: string[] = [];
    
    if (!dto.code || typeof dto.code !== 'string' || dto.code.trim().length === 0) {
      errors.push('Code is required and must be a non-empty string');
    }
    
    if (!dto.contractName || typeof dto.contractName !== 'string' || dto.contractName.trim().length === 0) {
      errors.push('Contract name is required and must be a non-empty string');
    }
    
    if (!dto.functionName || typeof dto.functionName !== 'string' || dto.functionName.trim().length === 0) {
      errors.push('Function name is required and must be a non-empty string');
    }
    
    if (!dto.l2Network || typeof dto.l2Network !== 'string') {
      errors.push('L2 network is required and must be a string');
    }
    
    if (!Array.isArray(dto.functionParameters)) {
      errors.push('Function parameters must be an array');
    }
    
    if (errors.length > 0) {
      throw ValidationUtils.createValidationError(errors);
    }
  }

  private validateContractComplexityCompareRequest(dto: CompareContractComplexityDto): void {
    const errors: string[] = [];
    
    if (!dto.code || typeof dto.code !== 'string' || dto.code.trim().length === 0) {
      errors.push('Code is required and must be a non-empty string');
    }
    
    if (!dto.contractName || typeof dto.contractName !== 'string' || dto.contractName.trim().length === 0) {
      errors.push('Contract name is required and must be a non-empty string');
    }
    
    if (!dto.functionName || typeof dto.functionName !== 'string' || dto.functionName.trim().length === 0) {
      errors.push('Function name is required and must be a non-empty string');
    }
    
    if (!Array.isArray(dto.l2Networks) || dto.l2Networks.length === 0) {
      errors.push('L2 networks must be a non-empty array');
    }
    
    if (!Array.isArray(dto.functionParameters)) {
      errors.push('Function parameters must be an array');
    }
    
    if (errors.length > 0) {
      throw ValidationUtils.createValidationError(errors);
    }
  }
}