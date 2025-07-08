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
} from '@nestjs/swagger';

// Base classes and utilities
import { BaseController } from '../../../common/base.controller';
import { ValidationPipe } from '../../../common/pipes/validation.pipe';
import { GlobalExceptionFilter } from '../../../common/filters/global-exception.filter';

// DTOs
import {
  CompareNetworksRequestDto,
  BlobCostComparisonRequestDto,
  NetworkComparisonDto,
  GasAnalysisResultDto,
} from '../../../common/dto/gas-analysis.dto';
import {
  BlobCostComparisonDto,
} from '../../../common/dto/comparison-report.dto';
import {
  SuccessResponseDto,
  IdParamDto,
} from '../../../common/dto/base.dto';

// Services
import { NetworkComparisonService } from '../services/network-comparison.service';
import { BlobCostAnalysisService } from '../services/blob-cost-analysis.service';

// Constants
import { SUCCESS_MESSAGES, API_CONSTANTS } from '../../../common/constants';

@ApiTags('Network Comparison')
@Controller(`${API_CONSTANTS.PREFIX}/gas-analysis/compare`)
@UseFilters(GlobalExceptionFilter)
@UsePipes(ValidationPipe)
export class NetworkComparisonController extends BaseController {
  constructor(
    private readonly networkComparisonService: NetworkComparisonService,
    private readonly blobCostAnalysisService: BlobCostAnalysisService,
  ) {
    super();
  }

  @Post('networks')
  @ApiOperation({
    summary: 'Compare gas costs across networks',
    description: 'Compares gas costs for contract deployment and function calls across multiple networks',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Network comparison completed successfully',
    type: SuccessResponseDto<NetworkComparisonDto>,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Contract compilation failed',
  })
  async compareNetworks(
    @Body() request: CompareNetworksRequestDto,
  ): Promise<SuccessResponseDto<NetworkComparisonDto>> {
    try {
      const startTime = Date.now();
      
      // Validate networks
      const allNetworks = [request.baselineNetwork, ...request.comparisonNetworks];
      await this.networkComparisonService.validateNetworks(allNetworks);
      
      // Perform network comparison
      const serviceResult = await this.networkComparisonService.compareNetworks(request);
      
      const duration = Date.now() - startTime;
      
      // Extract the data from the service response
      const result = serviceResult.data;
      
      return this.createSuccessResponse(
        result, // Use the result directly as it should already match NetworkComparisonDto
        SUCCESS_MESSAGES.COMPARISON.GENERATED
      );
    } catch (error) {
      this.handleError(error, 'Failed to compare networks');
    }
  }

  @Post('blob-costs')
  @ApiOperation({
    summary: 'Compare blob costs across networks',
    description: 'Compares blob storage costs for contract data across multiple networks',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Blob cost comparison completed successfully',
    type: SuccessResponseDto<BlobCostComparisonDto>,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  async compareBlobCosts(
    @Body() request: BlobCostComparisonRequestDto,
  ): Promise<SuccessResponseDto<BlobCostComparisonDto>> {
    try {
      const startTime = Date.now();
      
      // Validate networks
      await this.blobCostAnalysisService.validateNetworks(request.networks);
      
      // Perform blob cost comparison
      const serviceResult = await this.blobCostAnalysisService.compareBlobCosts(request);
      
      const duration = Date.now() - startTime;
      
      // Extract the data from the service response
      const result = serviceResult.data;
      
      return this.createSuccessResponse(
        result, // Use the result directly as it should already match BlobCostComparisonDto
        SUCCESS_MESSAGES.COMPARISON.GENERATED
      );
    } catch (error) {
      this.handleError(error, 'Failed to compare blob costs');
    }
  }

  @Get('history/:comparisonId')
  @ApiOperation({
    summary: 'Get comparison by ID',
    description: 'Retrieves a specific network comparison by its ID',
  })
  @ApiParam({
    name: 'comparisonId',
    description: 'Comparison ID',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comparison retrieved successfully',
    type: SuccessResponseDto<GasAnalysisResultDto>,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Comparison not found',
  })
  async getComparisonById(
    @Param('comparisonId') comparisonId: string,
  ): Promise<SuccessResponseDto<GasAnalysisResultDto>> {
    try {
      const serviceResult = await this.networkComparisonService.getComparisonById(comparisonId);
      
      // Extract the data from the service response
      const result = serviceResult.data;
      
      return this.createSuccessResponse(
        result,
        'Network comparison retrieved successfully'
      );
    } catch (error) {
      this.handleError(error, `Failed to retrieve comparison with ID '${comparisonId}'`);
    }
  }

  @Get('blob-costs/:comparisonId')
  @ApiOperation({
    summary: 'Get blob cost comparison by ID',
    description: 'Retrieves a specific blob cost comparison by its ID',
  })
  @ApiParam({
    name: 'comparisonId',
    description: 'Blob cost comparison ID',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Blob cost comparison retrieved successfully',
    type: SuccessResponseDto<BlobCostComparisonDto>,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Blob cost comparison not found',
  })
  async getBlobCostComparisonById(
    @Param('comparisonId') comparisonId: string,
  ): Promise<SuccessResponseDto<BlobCostComparisonDto>> {
    try {
      const result = await this.blobCostAnalysisService.getBlobCostComparisonById(comparisonId);
      
      return this.createSuccessResponse(
        result,
        'Blob cost comparison retrieved successfully'
      );
    } catch (error) {
      this.handleError(error, `Failed to retrieve blob cost comparison with ID '${comparisonId}'`);
    }
  }

  @Post('quick-compare')
  @ApiOperation({
    summary: 'Quick network comparison',
    description: 'Performs a quick comparison between two networks for basic gas costs',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Quick comparison completed successfully',
    type: SuccessResponseDto,
  })
  async quickCompare(
    @Body() request: {
      contractName: string;
      sourceCode: string;
      baselineNetwork: string;
      comparisonNetwork: string;
      solidityVersion?: string;
    },
  ): Promise<SuccessResponseDto<any>> {
    try {
      const startTime = Date.now();
      
      // Convert to full comparison request
      const fullRequest: CompareNetworksRequestDto = {
        contractName: request.contractName,
        sourceCode: request.sourceCode,
        baselineNetwork: request.baselineNetwork,
        comparisonNetworks: [request.comparisonNetwork],
        solidityVersion: request.solidityVersion,
      };
      
      // Perform quick comparison (deployment only)
      const serviceResult = await this.networkComparisonService.quickCompare(fullRequest);
      
      const duration = Date.now() - startTime;
      
      // Extract the data from the service response
      const result = serviceResult.data;
      
      return this.createSuccessResponse(
        result, // Use the result directly from the service
        'Quick comparison completed successfully'
      );
    } catch (error) {
      this.handleError(error, 'Failed to perform quick comparison');
    }
  }

  @Get('supported-networks')
  @ApiOperation({
    summary: 'Get supported networks for comparison',
    description: 'Retrieves list of networks that support gas cost comparison',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Supported networks retrieved successfully',
    type: SuccessResponseDto,
  })
  async getSupportedNetworks(): Promise<SuccessResponseDto<any>> {
    try {
      const networks = await this.networkComparisonService.getSupportedNetworks();
      
      return this.createSuccessResponse(
        networks,
        'Supported networks retrieved successfully'
      );
    } catch (error) {
      this.handleError(error, 'Failed to retrieve supported networks');
    }
  }

  @Get('network-pairs/popular')
  @ApiOperation({
    summary: 'Get popular network comparison pairs',
    description: 'Retrieves most commonly compared network pairs',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Popular network pairs retrieved successfully',
    type: SuccessResponseDto,
  })
  async getPopularNetworkPairs(): Promise<SuccessResponseDto<any>> {
    try {
      const pairs = await this.networkComparisonService.getPopularNetworkPairs();
      
      return this.createSuccessResponse(
        pairs,
        'Popular network pairs retrieved successfully'
      );
    } catch (error) {
      this.handleError(error, 'Failed to retrieve popular network pairs');
    }
  }
}