import { Controller, Post, Get, Body, Query, Param, HttpException, HttpStatus } from '@nestjs/common';
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
      saveToDatabase?: boolean;
    }
  ) {
    const { code, networks, contractName, saveToDatabase = false } = body;
    
    try {
      const result = await this.gasAnalyzerService.analyzeContract(code, networks, contractName);
      
      // Save to database if requested
      if (saveToDatabase) {
        await this.gasAnalyzerService.saveAnalysisResults(result, code);
      }
      
      return result;
    } catch (error) {
      // Handle compilation errors specifically
      if (error.message && error.message.includes('Compilation failed')) {
        // Extract the actual compilation error from stderr
        const compilationError = this.extractCompilationError(error.message);
        throw new HttpException(
          {
            statusCode: 400,
            message: `Compilation failed: ${compilationError}`,
            error: 'Bad Request',
            type: 'COMPILATION_ERROR'
          },
          HttpStatus.BAD_REQUEST
        );
      }
      
      // Handle other service errors
      if (error.message) {
        throw new HttpException(
          {
            statusCode: 400,
            message: error.message,
            error: 'Bad Request'
          },
          HttpStatus.BAD_REQUEST
        );
      }
      
      // Fallback for unknown errors
      throw new HttpException(
        {
          statusCode: 500,
          message: 'Internal server error during contract analysis',
          error: 'Internal Server Error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Get('history')
  async getAnalysisHistory(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.gasAnalyzerService.getGasAnalysisHistory(limitNum);
  }

  @Get('contract/:contractName')
  async getAnalysisByContract(@Param('contractName') contractName: string) {
    return this.gasAnalyzerService.getGasAnalysisByContract(contractName);
  }

  @Get('analysis/:id')
  async getAnalysisById(@Param('id') id: string) {
    return this.gasAnalyzerService.getGasAnalysisById(id);
  }
  
  private extractCompilationError(errorMessage: string): string {
    // Extract the meaningful part of the compilation error
    const lines = errorMessage.split('\n');
    const errorLines: string[] = [];
    
    for (const line of lines) {
      // Look for parser errors, syntax errors, etc.
      if (line.includes('ParserError:') || 
          line.includes('SyntaxError:') || 
          line.includes('TypeError:') ||
          line.includes('Error HH')) {
        errorLines.push(line.replace(/\x1B\[[0-9;]*m/g, '')); // Remove ANSI color codes
      }
      // Include the line that shows the error location
      if (line.includes('-->') || line.includes('|')) {
        errorLines.push(line);
      }
    }
    
    return errorLines.length > 0 ? errorLines.join('\n') : 'Unknown compilation error';
  }
}