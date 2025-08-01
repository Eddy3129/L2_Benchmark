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
import { GasMonitoringService, GasMonitoringData, ExportOptions } from '../services/gas-monitoring.service';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Gas Monitoring')
@Controller('gas-monitoring')
export class GasMonitoringController {
  constructor(private readonly gasMonitoringService: GasMonitoringService) {}

  @Post('store')
  @ApiOperation({
    summary: 'Store current gas monitoring data',
    description: 'Stores the current gas dashboard data to the database with timestamp',
  })
  @ApiBody({
    description: 'Array of gas monitoring data',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          network: { type: 'string', example: 'Arbitrum One' },
          type: { type: 'string', example: 'Optimistic' },
          baseFeeGwei: { type: 'number', example: 0.0308 },
          priorityFeeGwei: { type: 'number', example: 0.062 },
          maxFeeGwei: { type: 'number', example: 0.0928 },
          txCostUsd: { type: 'number', example: 0.00700084 },
          metadata: { type: 'object', nullable: true },
        },
        required: ['network', 'type', 'baseFeeGwei', 'priorityFeeGwei', 'maxFeeGwei', 'txCostUsd'],
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Gas monitoring data stored successfully',
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
  async storeGasData(@Body() gasData: GasMonitoringData[]) {
    try {
      if (!Array.isArray(gasData) || gasData.length === 0) {
        throw new BadRequestException('Gas data array is required and cannot be empty');
      }

      // Validate required fields
      for (const data of gasData) {
        if (!data.network || !data.type || 
            typeof data.baseFeeGwei !== 'number' || 
            typeof data.priorityFeeGwei !== 'number' || 
            typeof data.maxFeeGwei !== 'number' || 
            typeof data.txCostUsd !== 'number') {
          throw new BadRequestException('Invalid gas data format. All required fields must be provided.');
        }
      }

      const records = await this.gasMonitoringService.storeGasData(gasData);
      
      return {
        success: true,
        message: 'Gas monitoring data stored successfully',
        data: {
          recordsStored: records.length,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to store gas monitoring data');
    }
  }

  @Get('records')
  @ApiOperation({
    summary: 'Get gas monitoring records',
    description: 'Retrieves gas monitoring records with optional filtering',
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'networks', required: false, type: String, description: 'Comma-separated network names' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of records' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of records to skip' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Gas monitoring records retrieved successfully',
  })
  async getGasRecords(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('networks') networks?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    try {
      const options: any = {};
      
      if (startDate) {
        options.startDate = new Date(startDate);
      }
      
      if (endDate) {
        options.endDate = new Date(endDate);
      }
      
      if (networks) {
        options.networks = networks.split(',').map(n => n.trim());
      }
      
      if (limit) {
        options.limit = parseInt(limit.toString(), 10);
      }
      
      if (offset) {
        options.offset = parseInt(offset.toString(), 10);
      }

      const result = await this.gasMonitoringService.getGasData(options);
      
      return {
        success: true,
        data: {
          records: result.records,
          total: result.total,
        },
        pagination: {
          total: result.total,
          limit: options.limit || result.total,
          offset: options.offset || 0,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to retrieve gas monitoring records');
    }
  }

  @Get('latest')
  @ApiOperation({
    summary: 'Get latest gas data',
    description: 'Retrieves the latest gas monitoring data for all networks',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Latest gas data retrieved successfully',
  })
  async getLatestGasData() {
    try {
      const records = await this.gasMonitoringService.getLatestGasData();
      
      return {
        success: true,
        data: records,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to retrieve latest gas data');
    }
  }

  @Post('export/csv')
  @ApiOperation({
    summary: 'Export gas monitoring data to CSV',
    description: 'Exports gas monitoring data to CSV format matching the specified format',
  })
  @ApiBody({
    description: 'Export options',
    schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', format: 'date-time', nullable: true },
        endDate: { type: 'string', format: 'date-time', nullable: true },
        networks: { type: 'array', items: { type: 'string' }, nullable: true },
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
  async exportToCsv(@Body() options: ExportOptions = {}) {
    try {
      if (options.startDate && typeof options.startDate === 'string') {
        options.startDate = new Date(options.startDate);
      }
      
      if (options.endDate && typeof options.endDate === 'string') {
        options.endDate = new Date(options.endDate);
      }

      const filePath = await this.gasMonitoringService.exportToCsv(options);
      const filename = path.basename(filePath);
      
      // Get record count for the export
      const { total } = await this.gasMonitoringService.getGasData({
        startDate: options.startDate,
        endDate: options.endDate,
        networks: options.networks,
      });
      
      return {
        success: true,
        message: 'CSV export completed successfully',
        data: {
          filename,
          filePath,
          recordCount: total,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to export CSV');
    }
  }

  @Get('export/csv/download/:filename')
  @ApiOperation({
    summary: 'Download CSV file',
    description: 'Downloads a previously generated CSV file',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV file downloaded successfully',
  })
  async downloadCsv(@Query('filename') filename: string, @Res() res: Response) {
    try {
      const exportsDir = path.join(process.cwd(), 'exports');
      const filePath = path.join(exportsDir, filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found',
        });
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to download file',
      });
    }
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Get gas monitoring statistics',
    description: 'Retrieves statistics about stored gas monitoring data',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics() {
    try {
      const statistics = await this.gasMonitoringService.getStatistics();
      return {
        success: true,
        data: statistics,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get statistics: ${error.message}`);
    }
  }

  @Delete('records/timestamp/:timestamp')
  @ApiOperation({
    summary: 'Delete gas monitoring records by timestamp',
    description: 'Deletes all gas monitoring records for a specific timestamp',
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
            timestamp: { type: 'string' },
          },
        },
      },
    },
  })
  async deleteRecordsByTimestamp(@Param('timestamp') timestamp: string) {
    try {
      const deletedCount = await this.gasMonitoringService.deleteRecordsByTimestamp(timestamp);
      return {
        success: true,
        message: `Successfully deleted ${deletedCount} records for timestamp ${timestamp}`,
        data: {
          deletedCount,
          timestamp,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to delete records: ${error.message}`);
    }
  }
}