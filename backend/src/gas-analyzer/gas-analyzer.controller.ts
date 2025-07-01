import { Controller, Post, Get, Body, Query, Param, HttpException, HttpStatus } from '@nestjs/common';
import { GasAnalyzerService } from './gas-analyzer.service';
import { ValidationUtils } from '../shared/validation-utils';
import { AnalyzeContractRequest, CompareNetworksRequest } from '../shared/types';

@Controller('api/gas-analyzer')
export class GasAnalyzerController {
  constructor(private readonly gasAnalyzerService: GasAnalyzerService) {}

  @Post('analyze')
  async analyzeContract(@Body() body: AnalyzeContractRequest) {
    // Validate request using centralized validation
    ValidationUtils.validateAnalyzeContractRequest(body);
    
    const { code, networks, contractName, confidenceLevel = 70, saveToDatabase = false } = body;
    
    try {
      const result = await this.gasAnalyzerService.analyzeContract(code, networks, contractName, confidenceLevel);
      
      // Save to database if requested
      if (saveToDatabase) {
        await this.gasAnalyzerService.saveAnalysisResults(result, code);
      }
      
      return result;
    } catch (error) {
      // Handle compilation errors specifically
      if (error.message && error.message.includes('Compilation failed')) {
        throw ValidationUtils.createCompilationError(error.message);
      }
      
      // Handle validation errors
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Handle other service errors
      if (error.message) {
        throw ValidationUtils.createValidationError(error.message);
      }
      
      // Fallback for unknown errors
      throw ValidationUtils.createInternalServerError('Internal server error during contract analysis');
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

  @Post('compare')
  async compareLocalVsL2(@Body() body: CompareNetworksRequest) {
    // Validate request using centralized validation
    ValidationUtils.validateCompareNetworksRequest(body);
    
    const { code, contractName, l2Networks, confidenceLevel = 70, saveToDatabase = false } = body;
    
    try {
      // Analyze Sepolia testnet as baseline (more realistic gas prices)
      const baselineResult = await this.gasAnalyzerService.analyzeContract(
        code, 
        ['sepolia'], 
        contractName,
        confidenceLevel
      );
      
      // Analyze L2 networks
      const l2Result = await this.gasAnalyzerService.analyzeContract(
        code, 
        l2Networks, 
        contractName,
        confidenceLevel
      );
      
      // Create comparison report
      const comparisonReport = this.generateComparisonReport(baselineResult, l2Result);
      
      // Save to database if requested
      if (saveToDatabase) {
        await this.gasAnalyzerService.saveAnalysisResults(baselineResult, code);
        await this.gasAnalyzerService.saveAnalysisResults(l2Result, code);
      }
      
      return comparisonReport;
    } catch (error) {
      if (error.message && error.message.includes('Compilation failed')) {
        throw ValidationUtils.createCompilationError(error.message);
      }
      
      // Handle validation errors
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw ValidationUtils.createInternalServerError(error.message || 'Comparison analysis failed');
    }
  }
  
  private generateComparisonReport(baselineResult: any, l2Result: any) {
    const baseline = baselineResult.results[0]; // Sepolia testnet result
    const l2Networks = l2Result.results;
    
    const comparisons = l2Networks.map(l2Network => {
      const deploymentSavings = {
        gasReduction: parseInt(baseline.deployment.gasUsed) - parseInt(l2Network.deployment.gasUsed),
        costSavingsETH: parseFloat(baseline.deployment.costETH) - parseFloat(l2Network.deployment.costETH),
        costSavingsUSD: baseline.deployment.costUSD - l2Network.deployment.costUSD,
        percentageSaving: ((baseline.deployment.costUSD - l2Network.deployment.costUSD) / baseline.deployment.costUSD * 100)
      };
      
      const functionComparisons = baseline.functions.map(baselineFunc => {
        const l2Func = l2Network.functions.find(f => f.functionName === baselineFunc.functionName);
        if (!l2Func) return null;
        
        return {
          functionName: baselineFunc.functionName,
          baseline: {
            gasUsed: baselineFunc.gasUsed,
            costETH: baselineFunc.estimatedCostETH,
            costUSD: baselineFunc.estimatedCostUSD
          },
          l2: {
            gasUsed: l2Func.gasUsed,
            costETH: l2Func.estimatedCostETH,
            costUSD: l2Func.estimatedCostUSD
          },
          savings: {
            gasReduction: parseInt(baselineFunc.gasUsed) - parseInt(l2Func.gasUsed),
            costSavingsETH: parseFloat(baselineFunc.estimatedCostETH) - parseFloat(l2Func.estimatedCostETH),
            costSavingsUSD: baselineFunc.estimatedCostUSD - l2Func.estimatedCostUSD,
            percentageSaving: ((baselineFunc.estimatedCostUSD - l2Func.estimatedCostUSD) / baselineFunc.estimatedCostUSD * 100)
          }
        };
      }).filter(Boolean);
      
      return {
        network: l2Network.network,
        gasPrice: l2Network.gasPrice,
        gasPriceBreakdown: l2Network.gasPriceBreakdown,
        deployment: {
          baseline: {
            gasUsed: baseline.deployment.gasUsed,
            costETH: baseline.deployment.costETH,
            costUSD: baseline.deployment.costUSD
          },
          l2: {
            gasUsed: l2Network.deployment.gasUsed,
            costETH: l2Network.deployment.costETH,
            costUSD: l2Network.deployment.costUSD
          },
          savings: deploymentSavings
        },
        functions: functionComparisons,
        summary: {
          totalLocalCost: baseline.deployment.costUSD + baseline.functions.reduce((sum, f) => sum + f.estimatedCostUSD, 0),
          totalL2Cost: l2Network.deployment.costUSD + l2Network.functions.reduce((sum, f) => sum + f.estimatedCostUSD, 0),
          totalSavings: deploymentSavings.costSavingsUSD + functionComparisons.reduce((sum, f) => sum + (f?.savings?.costSavingsUSD || 0), 0)
        }
      };
    });
    
    return {
      contractName: baselineResult.contractName,
      timestamp: new Date().toISOString(),
      local: {
        ...baseline,
        gasPrice: baseline.gasPrice,
        gasPriceBreakdown: baseline.gasPriceBreakdown
      },
      comparisons,
      overallSummary: {
        bestNetwork: comparisons.reduce((best, current) => 
          current.summary.totalSavings > best.summary.totalSavings ? current : best
        ),
        averageSavings: comparisons.reduce((sum, comp) => sum + comp.summary.totalSavings, 0) / comparisons.length
      }
    };
  }
  
  // Compilation error extraction moved to shared/validation-utils.ts
}