import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BaseController } from '../../../common/base.controller';
import { ComparisonReportService } from '../services/comparison-report.service';
import { ReportGenerationService } from '../services/report-generation.service';
import { ReportAnalyticsService } from '../services/report-analytics.service';
import {
  CreateComparisonReportRequestDto,
  ComparisonReportQueryDto,
  ComparisonReportDto,
  ComparisonReportStatsDto,
} from '../../../common/dto/comparison-report.dto';
import {
  PaginatedResponseDto,
  SuccessResponseDto,
  IdParamDto,
  PaginationMetaDto,
} from '../../../common/dto/base.dto';

@ApiTags('Comparison Reports')
@Controller('comparison-reports')
export class ComparisonReportController extends BaseController {
  constructor(
    private readonly comparisonReportService: ComparisonReportService,
    private readonly reportGenerationService: ReportGenerationService,
    private readonly reportAnalyticsService: ReportAnalyticsService,
  ) {
    super();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new comparison report',
    description: 'Generate a comprehensive comparison report for gas costs across networks',
  })
  @ApiResponse({
    status: 201,
    description: 'Comparison report created successfully',
    type: SuccessResponseDto<ComparisonReportDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async createReport(
    @Body() request: CreateComparisonReportRequestDto,
  ): Promise<SuccessResponseDto<ComparisonReportDto>> {
    const result = await this.comparisonReportService.createReport(request);
    return {
      success: true,
      message: 'Comparison report created successfully',
      data: result
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get comparison reports with pagination',
    description: 'Retrieve a paginated list of comparison reports with optional filtering',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'reportType', required: false, type: String, description: 'Filter by report type' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by report status' })
  @ApiQuery({ name: 'contractName', required: false, type: String, description: 'Filter by contract name' })
  @ApiQuery({ name: 'networkId', required: false, type: String, description: 'Filter by network ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter by start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter by end date (ISO string)' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], description: 'Sort order' })
  @ApiResponse({
    status: 200,
    description: 'Comparison reports retrieved successfully',
    type: PaginatedResponseDto<ComparisonReportDto>,
  })
  async getReports(
    @Query() query: ComparisonReportQueryDto,
  ): Promise<PaginatedResponseDto<ComparisonReportDto>> {
    const result = await this.comparisonReportService.getAllReports(query);
    return {
      success: true,
      message: 'Comparison reports retrieved successfully',
      data: result,
      meta: new PaginationMetaDto(
        query.page || 1,
        query.limit || 10,
        result.length
      )
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get comparison report by ID',
    description: 'Retrieve a specific comparison report with all details',
  })
  @ApiParam({ name: 'id', description: 'Report ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Comparison report retrieved successfully',
    type: SuccessResponseDto<ComparisonReportDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Comparison report not found',
  })
  async getReportById(
    @Param() params: IdParamDto,
  ): Promise<SuccessResponseDto<ComparisonReportDto>> {
    const result = await this.comparisonReportService.getReportById(params.id);
    return {
      success: true,
      message: 'Comparison report retrieved successfully',
      data: result
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update comparison report',
    description: 'Update an existing comparison report',
  })
  @ApiParam({ name: 'id', description: 'Report ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Comparison report updated successfully',
    type: SuccessResponseDto<ComparisonReportDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Comparison report not found',
  })
  async updateReport(
    @Param() params: IdParamDto,
    @Body() request: Partial<CreateComparisonReportRequestDto>,
  ): Promise<SuccessResponseDto<ComparisonReportDto>> {
    const result = await this.comparisonReportService.updateReport(params.id, request);
    return {
      success: true,
      message: 'Comparison report updated successfully',
      data: result
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete comparison report',
    description: 'Delete a comparison report and all its sections',
  })
  @ApiParam({ name: 'id', description: 'Report ID (UUID)' })
  @ApiResponse({
    status: 204,
    description: 'Comparison report deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Comparison report not found',
  })
  async deleteReport(@Param() params: IdParamDto): Promise<void> {
    await this.comparisonReportService.deleteReport(params.id);
  }

  @Post(':id/generate')
  @ApiOperation({
    summary: 'Generate report content',
    description: 'Generate detailed content for an existing comparison report',
  })
  @ApiParam({ name: 'id', description: 'Report ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Report content generated successfully',
    type: SuccessResponseDto<ComparisonReportDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Comparison report not found',
  })
  async generateReportContent(
    @Param() params: IdParamDto,
  ): Promise<SuccessResponseDto<ComparisonReportDto>> {
    return await this.reportGenerationService.generateReportContent(params.id);
  }

  @Post(':id/publish')
  @ApiOperation({
    summary: 'Publish comparison report',
    description: 'Mark a comparison report as published and make it publicly available',
  })
  @ApiParam({ name: 'id', description: 'Report ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Comparison report published successfully',
    type: SuccessResponseDto<ComparisonReportDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Comparison report not found',
  })
  async publishReport(
    @Param() params: IdParamDto,
  ): Promise<SuccessResponseDto<ComparisonReportDto>> {
    const result = await this.comparisonReportService.publishReport(params.id);
    return {
      success: true,
      message: 'Comparison report published successfully',
      data: result
    };
  }

  @Post(':id/archive')
  @ApiOperation({
    summary: 'Archive comparison report',
    description: 'Archive a comparison report to remove it from active listings',
  })
  @ApiParam({ name: 'id', description: 'Report ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Comparison report archived successfully',
    type: SuccessResponseDto<ComparisonReportDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Comparison report not found',
  })
  async archiveReport(
    @Param() params: IdParamDto,
  ): Promise<SuccessResponseDto<ComparisonReportDto>> {
    const result = await this.comparisonReportService.archiveReport(params.id);
    return {
      success: true,
      message: 'Comparison report archived successfully',
      data: result
    };
  }

  @Get(':id/export')
  @ApiOperation({
    summary: 'Export comparison report',
    description: 'Export a comparison report in various formats (PDF, Excel, etc.)',
  })
  @ApiParam({ name: 'id', description: 'Report ID (UUID)' })
  @ApiQuery({ name: 'format', required: false, enum: ['pdf', 'excel', 'csv', 'json'], description: 'Export format' })
  @ApiResponse({
    status: 200,
    description: 'Report exported successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Comparison report not found',
  })
  async exportReport(
    @Param() params: IdParamDto,
    @Query('format') format: 'pdf' | 'excel' | 'csv' | 'json' = 'pdf',
  ): Promise<any> {
    return await this.reportGenerationService.exportReport(params.id, format);
  }

  @Get(':id/analytics')
  @ApiOperation({
    summary: 'Get report analytics',
    description: 'Get detailed analytics and insights for a comparison report',
  })
  @ApiParam({ name: 'id', description: 'Report ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Report analytics retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Comparison report not found',
  })
  async getReportAnalytics(
    @Param() params: IdParamDto,
  ): Promise<SuccessResponseDto<any>> {
    return await this.reportAnalyticsService.getReportAnalytics();
  }

  @Get('stats/overview')
  @ApiOperation({
    summary: 'Get comparison report statistics',
    description: 'Get overall statistics about comparison reports',
  })
  @ApiResponse({
    status: 200,
    description: 'Report statistics retrieved successfully',
    type: SuccessResponseDto<ComparisonReportStatsDto>,
  })
  async getReportStats(): Promise<SuccessResponseDto<ComparisonReportStatsDto>> {
    const result = await this.comparisonReportService.getReportStats();
    return {
      success: true,
      message: 'Report statistics retrieved successfully',
      data: result
    };
  }

  @Get('templates/available')
  @ApiOperation({
    summary: 'Get available report templates',
    description: 'Get a list of available report templates for different comparison types',
  })
  @ApiResponse({
    status: 200,
    description: 'Report templates retrieved successfully',
  })
  async getAvailableTemplates(): Promise<SuccessResponseDto<any[]>> {
    return await this.reportGenerationService.getAvailableTemplates();
  }

  @Post('bulk/generate')
  @ApiOperation({
    summary: 'Generate multiple reports',
    description: 'Generate multiple comparison reports in batch',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk report generation initiated successfully',
  })
  async generateBulkReports(
    @Body() requests: CreateComparisonReportRequestDto[],
  ): Promise<SuccessResponseDto<any>> {
    return await this.reportGenerationService.generateBulkReports(requests);
  }

  @Get('search/similar')
  @ApiOperation({
    summary: 'Search for similar reports',
    description: 'Find reports with similar characteristics or contract patterns',
  })
  @ApiQuery({ name: 'contractName', required: false, type: String, description: 'Contract name to search for' })
  @ApiQuery({ name: 'networks', required: false, type: String, description: 'Comma-separated network IDs' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of results' })
  @ApiResponse({
    status: 200,
    description: 'Similar reports found successfully',
  })
  async searchSimilarReports(
    @Query('contractName') contractName?: string,
    @Query('networks') networks?: string,
    @Query('limit') limit?: number,
  ): Promise<SuccessResponseDto<ComparisonReportDto[]>> {
    const networkList = networks ? networks.split(',') : undefined;
    const result = await this.comparisonReportService.searchSimilarReports(
      contractName,
      networkList,
      limit,
    );
    return {
      success: true,
      message: 'Similar reports retrieved successfully',
      data: result
    };
  }
}