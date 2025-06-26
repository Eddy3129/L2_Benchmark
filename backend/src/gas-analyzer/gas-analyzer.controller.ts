import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { GasAnalyzerService } from './gas-analyzer.service';

@Controller('api/gas-analyzer')
export class GasAnalyzerController {
  constructor(private readonly gasAnalyzerService: GasAnalyzerService) {}

  @Post('analyze')
  async analyzeContract(
    @Body() body: { 
      code: string; 
      networks: string[]; 
      contractName: string;
      confidenceLevel?: number;
    }
  ) {
    const { code, networks, contractName } = body;
    return this.gasAnalyzerService.analyzeContract(code, networks, contractName);
  }

  // @Get('history')
  // async getAnalysisHistory(@Query('limit') limit?: string) {
  //   const limitNum = limit ? parseInt(limit, 10) : 10;
  //   return this.gasAnalyzerService.getAnalysisHistory(limitNum);
  // }
}