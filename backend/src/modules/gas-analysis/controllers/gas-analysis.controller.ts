import {
  Controller,
  Post,
  Get,
  Query,
  Param,
  Body,
  HttpStatus,
  UseFilters,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

// Base classes and utilities
import { BaseController } from '../../../common/base.controller';
import { ValidationPipe } from '../../../common/pipes/validation.pipe';
import { GlobalExceptionFilter } from '../../../common/filters/global-exception.filter';

// DTOs
import {
  AnalyzeContractRequestDto,
  GasAnalysisResultDto,
  GasAnalysisHistoryDto,
  GasAnalysisQueryDto,
} from '../../../common/dto/gas-analysis.dto';
import {
  SuccessResponseDto,
  PaginatedResponseDto,
  IdParamDto,
} from '../../../common/dto/base.dto';

// Services
import { GasAnalysisService } from '../services/gas-analysis.service';

// Constants
import { SUCCESS_MESSAGES, API_CONSTANTS } from '../../../common/constants';

@ApiTags('Gas Analysis')
@Controller(`${API_CONSTANTS.PREFIX}/gas-analysis`)
@UseFilters(GlobalExceptionFilter)
@UsePipes(ValidationPipe)
export class GasAnalysisController extends BaseController {
  constructor(private readonly gasAnalysisService: GasAnalysisService) {
    super();
  }

  @Post('analyze')
  @ApiOperation({
    summary: 'Analyze contract gas costs',
    description: 'Analyzes gas costs for contract deployment and function calls across multiple networks',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Gas analysis completed successfully',
    type: SuccessResponseDto<GasAnalysisResultDto>,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Contract compilation failed',
  })
  async analyzeContract(
    @Body() request: AnalyzeContractRequestDto,
  ): Promise<SuccessResponseDto<GasAnalysisResultDto>> {
    try {
      const startTime = Date.now();
      
      // Validate networks
      await this.gasAnalysisService.validateNetworks(request.networks);
      
      // Perform gas analysis
      const result = await this.gasAnalysisService.analyzeContract(request);
      
      const duration = Date.now() - startTime;
      
      return this.createSuccessResponse(
        {
          ...result,
          metadata: {
            solidityVersion: request.solidityVersion || '0.8.0',
            optimizationLevel: 'medium' as any,
            gasEstimationType: 'both' as any,
            totalNetworks: request.networks.length,
            successfulNetworks: result.networkResults.length,
            failedNetworks: []
          }
        },
        SUCCESS_MESSAGES.GAS_ANALYSIS.COMPLETED
      );
    } catch (error) {
      this.handleError(error, 'Failed to analyze contract');
    }
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get gas analysis history',
    description: 'Retrieves paginated history of gas analyses with optional filtering',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Gas analysis history retrieved successfully',
    type: PaginatedResponseDto<GasAnalysisResultDto>,
  })
  async getAnalysisHistory(
    @Query() query: GasAnalysisQueryDto,
  ): Promise<PaginatedResponseDto<GasAnalysisResultDto>> {
    try {
      const result = await this.gasAnalysisService.getAnalysisHistory(query);
      
      return this.createPaginatedResponse(
        result.data,
        result.meta,
        'Gas analysis history retrieved successfully'
      );
    } catch (error) {
      this.handleError(error, 'Failed to retrieve gas analysis history');
    }
  }

  @Get('contract/:contractName')
  @ApiOperation({
    summary: 'Get analyses by contract name',
    description: 'Retrieves all gas analyses for a specific contract',
  })
  @ApiParam({
    name: 'contractName',
    description: 'Name of the contract',
    type: String,
  })
  @ApiQuery({
    name: 'network',
    description: 'Filter by network',
    required: false,
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contract analyses retrieved successfully',
    type: PaginatedResponseDto<GasAnalysisResultDto>,
  })
  async getAnalysesByContract(
    @Param('contractName') contractName: string,
    @Query() query: GasAnalysisQueryDto,
  ): Promise<PaginatedResponseDto<GasAnalysisResultDto>> {
    try {
      // Add contract name to query
      const searchQuery = { ...query, contractName };
      
      const result = await this.gasAnalysisService.getAnalysisHistory(searchQuery);
      
      return this.createPaginatedResponse(
        result.data,
        result.meta,
        `Analyses for contract '${contractName}' retrieved successfully`
      );
    } catch (error) {
      this.handleError(error, `Failed to retrieve analyses for contract '${contractName}'`);
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get gas analysis by ID',
    description: 'Retrieves a specific gas analysis by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Gas analysis ID',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Gas analysis retrieved successfully',
    type: SuccessResponseDto<GasAnalysisResultDto>,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Gas analysis not found',
  })
  async getAnalysisById(
    @Param() params: IdParamDto,
  ): Promise<SuccessResponseDto<GasAnalysisResultDto>> {
    try {
      const result = await this.gasAnalysisService.getAnalysisById(params.id);
      
      return this.createSuccessResponse(
        result,
        'Gas analysis retrieved successfully'
      );
    } catch (error) {
      this.handleError(error, `Failed to retrieve gas analysis with ID '${params.id}'`);
    }
  }

  @Get('network/:network')
  @ApiOperation({
    summary: 'Get analyses by network',
    description: 'Retrieves all gas analyses for a specific network',
  })
  @ApiParam({
    name: 'network',
    description: 'Network name',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Network analyses retrieved successfully',
    type: PaginatedResponseDto<GasAnalysisResultDto>,
  })
  async getAnalysesByNetwork(
    @Param('network') network: string,
    @Query() query: GasAnalysisQueryDto,
  ): Promise<PaginatedResponseDto<GasAnalysisResultDto>> {
    try {
      // Add network to query
      const searchQuery = { ...query, network };
      
      const result = await this.gasAnalysisService.getAnalysisHistory(searchQuery);
      
      return this.createPaginatedResponse(
        result.data,
        result.meta,
        `Analyses for network '${network}' retrieved successfully`
      );
    } catch (error) {
      this.handleError(error, `Failed to retrieve analyses for network '${network}'`);
    }
  }

  @Post('validate-code')
  @ApiOperation({
    summary: 'Validate Solidity code',
    description: 'Validates Solidity code syntax without performing full analysis',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Code validation completed',
    type: SuccessResponseDto,
  })
  async validateCode(
    @Body() request: { sourceCode: string; solidityVersion?: string },
  ): Promise<SuccessResponseDto<{ isValid: boolean; errors: string[]; warnings: string[] }>> {
    try {
      const result = await this.gasAnalysisService.validateSolidityCode(
        request.sourceCode,
        request.solidityVersion
      );
      
      return this.createSuccessResponse(
        result,
        result.isValid ? 'Code validation passed' : 'Code validation failed'
      );
    } catch (error) {
      this.handleError(error, 'Failed to validate Solidity code');
    }
  }

  @Get('stats/summary')
  @ApiOperation({
    summary: 'Get gas analysis statistics',
    description: 'Retrieves summary statistics for gas analyses',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    type: SuccessResponseDto,
  })
  async getAnalysisStats(): Promise<SuccessResponseDto<any>> {
    try {
      const stats = await this.gasAnalysisService.getAnalysisStatistics();
      
      return this.createSuccessResponse(
        stats,
        'Gas analysis statistics retrieved successfully'
      );
    } catch (error) {
      this.handleError(error, 'Failed to retrieve gas analysis statistics');
    }
  }
}