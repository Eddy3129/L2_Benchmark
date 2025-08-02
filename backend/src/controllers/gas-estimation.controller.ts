import {
  Controller,
  Post,
  Get,
  Delete,
  Query,
  Body,
  Param,
  HttpStatus,
  BadRequestException,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { GasEstimationService, GasEstimationData, EstimationExportOptions } from '../services/gas-estimation.service';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Gas Estimation')
@Controller('gas-estimation')
export class GasEstimationController {
  constructor(private readonly gasEstimationService: GasEstimationService) {}

  @Post('store')
  @ApiOperation({
    summary: 'Store gas estimation data',
    description: 'Stores gas estimation analysis results to the database with timestamp',
  })
  @ApiBody({
    description: 'Array of gas estimation data',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          network: { type: 'string', example: 'Arbitrum One' },
          contractName: { type: 'string', example: 'BasicToken' },
          measuredGasUsed: { type: 'string', example: '2316600' },
          l2GasPriceGwei: { type: 'number', example: 0.03, nullable: true },
          tokenPriceUsd: { type: 'number', example: 3721.69 },
          estDeploymentCostUsd: { type: 'number', example: 0.258583 },
          estL2ExecutionUsd: { type: 'number', example: 0.200000, nullable: true },
          estL1BlobCostUsd: { type: 'number', example: 0.058583, nullable: true },
          vsEthereum: { type: 'string', example: '97.50%' },
          confidenceLevel: { type: 'number', example: 99 },
          metadata: { type: 'object', nullable: true },
        },
        required: ['network', 'contractName', 'measuredGasUsed', 'tokenPriceUsd', 'estDeploymentCostUsd', 'vsEthereum', 'confidenceLevel'],
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Gas estimation data stored successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            recordsStored: { type: 'number' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  })
  async storeEstimationData(@Body() estimationData: GasEstimationData[]) {
    try {
      if (!Array.isArray(estimationData) || estimationData.length === 0) {
        throw new BadRequestException('Gas estimation data array is required and cannot be empty');
      }

      // Validate required fields
      for (const data of estimationData) {
        if (!data.network || !data.contractName || !data.measuredGasUsed ||
            typeof data.tokenPriceUsd !== 'number' || 
            typeof data.estDeploymentCostUsd !== 'number' ||
            !data.vsEthereum || typeof data.confidenceLevel !== 'number') {
          throw new BadRequestException('Invalid gas estimation data format. All required fields must be provided.');
        }
      }

      const records = await this.gasEstimationService.storeEstimationData(estimationData);
      
      return {
        success: true,
        message: 'Gas estimation data stored successfully',
        data: {
          recordsStored: records.length,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to store gas estimation data');
    }
  }

  @Get('records')
  @ApiOperation({
    summary: 'Get gas estimation records',
    description: 'Retrieves gas estimation records with optional filtering',
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'networks', required: false, type: String, description: 'Comma-separated network names' })
  @ApiQuery({ name: 'contractNames', required: false, type: String, description: 'Comma-separated contract names' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of records' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of records to skip' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], description: 'Sort order' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Gas estimation records retrieved successfully',
  })
  async getRecords(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('networks') networks?: string,
    @Query('contractNames') contractNames?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    try {
      const parsedStartDate = startDate ? new Date(startDate) : undefined;
      const parsedEndDate = endDate ? new Date(endDate) : undefined;
      const parsedNetworks = networks ? networks.split(',').map(n => n.trim()) : undefined;
      const parsedContractNames = contractNames ? contractNames.split(',').map(n => n.trim()) : undefined;
      const parsedLimit = limit ? parseInt(limit, 10) : 100;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;
      const parsedSortOrder = sortOrder || 'DESC';

      const result = await this.gasEstimationService.getRecords(
        parsedStartDate,
        parsedEndDate,
        parsedNetworks,
        parsedContractNames,
        parsedLimit,
        parsedOffset,
        sortBy,
        parsedSortOrder,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get gas estimation records: ${error.message}`);
    }
  }

  @Delete('records/timestamp/:timestamp')
  @ApiOperation({
    summary: 'Delete gas estimation records by timestamp',
    description: 'Deletes all gas estimation records for a specific timestamp',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Records deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            deletedCount: { type: 'number' },
          },
        },
      },
    },
  })
  async deleteRecordsByTimestamp(@Param('timestamp') timestamp: string) {
    try {
      const deletedCount = await this.gasEstimationService.deleteRecordsByTimestamp(timestamp);
      
      return {
        success: true,
        message: `Deleted ${deletedCount} gas estimation records`,
        data: {
          deletedCount,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to delete gas estimation records: ${error.message}`);
    }
  }

  @Post('export/csv')
  @ApiOperation({
    summary: 'Export gas estimation data to CSV',
    description: 'Exports gas estimation data to CSV format',
  })
  @ApiBody({
    description: 'Export options',
    schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', format: 'date-time', nullable: true },
        endDate: { type: 'string', format: 'date-time', nullable: true },
        networks: { type: 'array', items: { type: 'string' }, nullable: true },
        contractNames: { type: 'array', items: { type: 'string' }, nullable: true },
      },
    },
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV file generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            filename: { type: 'string' },
            filePath: { type: 'string' },
            recordCount: { type: 'number' },
          },
        },
      },
    },
  })
  async exportToCsv(
    @Body() options: {
      startDate?: string;
      endDate?: string;
      networks?: string[];
      contractNames?: string[];
    } = {},
  ) {
    try {
      const exportOptions: EstimationExportOptions = {
        startDate: options.startDate ? new Date(options.startDate) : undefined,
        endDate: options.endDate ? new Date(options.endDate) : undefined,
        networks: options.networks,
        contractNames: options.contractNames,
      };

      const result = await this.gasEstimationService.exportToCsv(exportOptions);
      
      return {
        success: true,
        message: 'CSV export completed successfully',
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to export CSV: ${error.message}`);
    }
  }

  @Get('export/csv/download/:filename')
  @ApiOperation({
    summary: 'Download exported CSV file',
    description: 'Downloads a previously exported CSV file',
  })
  async downloadCsv(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const exportsDir = path.join(process.cwd(), 'exports');
      const filePath = path.join(exportsDir, filename);
      
      if (!fs.existsSync(filePath)) {
        throw new BadRequestException('File not found');
      }
      
      res.download(filePath, filename, (err) => {
        if (err) {
          throw new BadRequestException('Failed to download file');
        }
      });
    } catch (error) {
      throw new BadRequestException(`Failed to download file: ${error.message}`);
    }
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Get gas estimation statistics',
    description: 'Retrieves statistics about stored gas estimation data',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics() {
    try {
      const statistics = await this.gasEstimationService.getStatistics();
      return {
        success: true,
        data: statistics,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get statistics: ${error.message}`);
    }
  }
}