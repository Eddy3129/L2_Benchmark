import React, { useState, useEffect } from 'react';
import { apiService } from '@/lib/api';
import { CONTRACT_TEMPLATES, loadContractTemplate } from '@/lib/contractTemplate';
import { Code, BarChart3 } from 'lucide-react';

interface AnalysisResult {
  contractName: string;
  compilation: any;
  results: NetworkResult[];
  timestamp: string;
  totalOperations: number;
  avgGasUsed: number;
  avgExecutionTime: number;
  id?: number;
  createdAt?: string;
  analysisMethod?: 'SIMULATION' | 'STATIC' | 'HYBRID';
  networksAnalyzed?: string[];
}

// Import shared types and utilities
import { NetworkResult, GasEstimate, AnalysisProgress, SequentialAnalysisResult, NetworkAnalysisStatus } from '@/types/shared';
import { getAllNetworks } from '@/utils/networkConfig';



const PROGRESS_STAGES = {
  idle: { message: 'Ready to analyze', progress: 0 },
  compiling: { message: 'Compiling Solidity contract...', progress: 25 },
  deploying: { message: 'Deploying to test networks...', progress: 50 },
  analyzing: { message: 'Analyzing gas costs and functions...', progress: 75 },
  complete: { message: 'Analysis complete', progress: 100 }
};

import ContractEditorTab from './ContractEditorTab';
import GasEstimatorResultsTab from './GasEstimatorResultsTab';

export function GasEstimatorIDE() {
  const [activeTab, setActiveTab] = useState<'editor' | 'results'>('editor');
  const [code, setCode] = useState('');
  const [contractName, setContractName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>(CONTRACT_TEMPLATES[0].id);
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>(['mainnet', 'polygon', 'arbitrum', 'optimism', 'base', 'linea', 'scroll', 'ink']);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(99);
  const [saveToDatabase, setSaveToDatabase] = useState(true);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'unified'>('unified');
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({
    stage: 'idle',
    progress: 0,
    message: 'Ready to analyze'
  });
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [networkStatuses, setNetworkStatuses] = useState<NetworkAnalysisStatus[]>([]);
  const [currentAnalysisMethod, setCurrentAnalysisMethod] = useState<'SIMULATION' | 'STATIC' | 'HYBRID'>('SIMULATION');
  const [error, setError] = useState<string | null>(null);
  const [compilationError, setCompilationError] = useState<string | null>(null);

  const isAnalyzing = analysisProgress.stage !== 'idle' && analysisProgress.stage !== 'complete';

  // Load initial template on component mount
  useEffect(() => {
    handleTemplateChange(CONTRACT_TEMPLATES[0].id);
  }, []);

  const updateProgress = (stage: AnalysisProgress['stage']) => {
    const stageInfo = PROGRESS_STAGES[stage];
    setAnalysisProgress({ stage, ...stageInfo });
  };



  const handleTemplateChange = async (templateId: string) => {
    const template = CONTRACT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setIsLoadingTemplate(true);
      setError(null);
      try {
        const contractCode = await loadContractTemplate(template.fileName);
        setSelectedTemplate(templateId);
        setCode(contractCode);
        setContractName(template.contractName);
      } catch (error) {
        console.error('Failed to load contract template:', error);
        setError('Failed to load contract template. Please try again.');
      } finally {
        setIsLoadingTemplate(false);
      }
    }
  };

  const transformToBenchmarkSession = (analysisResult: AnalysisResult) => {
    const totalTransactions = analysisResult.results.length;
    const totalGasUsed = analysisResult.results.reduce((sum, r) => 
      sum + parseInt(r.deployment.gasUsed || '0'), 0
    ).toString();
    const totalFees = analysisResult.results.reduce((sum, r) => 
      sum + r.deployment.costUSD, 0
    ).toString();
  
    return {
      ...analysisResult,
      results: {
        transactions: {
          totalTransactions,
          successfulTransactions: totalTransactions,
          failedTransactions: 0,
          totalGasUsed,
          totalFees,
        }
      }
    };
  };

  const handleAnalyze = async () => {
    if (!code.trim() || !contractName.trim() || selectedNetworks.length === 0) {
      setError('Please provide contract code, name, and select at least one network.');
      return;
    }

    setError(null);
    setCompilationError(null);
    setAnalysisResult(null);
    
    // Initialize network statuses
    const initialStatuses: NetworkAnalysisStatus[] = selectedNetworks.map(network => ({
      network,
      status: 'pending',
      progress: 0
    }));
    setNetworkStatuses(initialStatuses);
    
    // Start with compilation
    setAnalysisProgress({
      stage: 'compiling',
      progress: 10,
      message: 'Compiling Solidity contract...',
      currentNetwork: undefined,
      networksCompleted: 0,
      totalNetworks: selectedNetworks.length
    });

    try {
      const results: NetworkResult[] = [];
      let compilation: any = null;
      
      // Sequential network analysis
      for (let i = 0; i < selectedNetworks.length; i++) {
        const network = selectedNetworks[i];
        
        // Update network status to analyzing
        setNetworkStatuses(prev => prev.map(status => 
          status.network === network 
            ? { ...status, status: 'analyzing', progress: 0 }
            : status
        ));
        
        // Update overall progress
        const baseProgress = 20 + (i / selectedNetworks.length) * 70;
        setAnalysisProgress({
          stage: 'analyzing',
          progress: baseProgress,
          message: `Analyzing ${network}...`,
          currentNetwork: network,
          networksCompleted: i,
          totalNetworks: selectedNetworks.length
        });
        
        try {
          const networkResult = await apiService.analyzeNetworkSequentially({
            code,
            network,
            contractName,
            confidenceLevel
          });
          
          if (!compilation && networkResult.compilation) {
            compilation = networkResult.compilation;
          }
          
          results.push(networkResult.result);
          
          // Update network status to completed
          setNetworkStatuses(prev => prev.map(status => 
            status.network === network 
              ? { ...status, status: 'completed', progress: 100, result: networkResult.result }
              : status
          ));
          
        } catch (networkError: any) {
          console.error(`Analysis failed for ${network}:`, networkError);
          
          // Update network status to failed
          setNetworkStatuses(prev => prev.map(status => 
            status.network === network 
              ? { ...status, status: 'failed', progress: 0, error: networkError.message }
              : status
          ));
          
          // Continue with other networks instead of failing completely
        }
      }
      
      if (results.length === 0) {
        throw new Error('All network analyses failed. Please check your contract code and try again.');
      }
      
      const transformedResult: AnalysisResult = {
        contractName,
        compilation,
        results,
        timestamp: new Date().toISOString(),
        totalOperations: results.length,
        avgGasUsed: results.length > 0 ? 
          results.reduce((sum, r) => {
            const totalGas = parseInt(r.deployment?.gasUsed || '0') + 
              r.functions?.reduce((fSum, f) => fSum + parseInt(f.gasUsed || '0'), 0);
            return sum + totalGas;
          }, 0) / results.length : 0,
        avgExecutionTime: 0,
        analysisMethod: currentAnalysisMethod,
        networksAnalyzed: selectedNetworks
      };
      
      setAnalysisResult(transformedResult);
      
      // Final progress update
      setAnalysisProgress({
        stage: 'complete',
        progress: 100,
        message: `Analysis complete - ${results.length} networks analyzed`,
        currentNetwork: undefined,
        networksCompleted: selectedNetworks.length,
        totalNetworks: selectedNetworks.length
      });
      
      setActiveTab('results');
      setTimeout(() => {
        setAnalysisProgress({
          stage: 'idle',
          progress: 0,
          message: 'Ready to analyze'
        });
      }, 2000);
    } catch (err: any) {
      console.error('Analysis error:', err);
      
      let errorMessage = 'Analysis failed';
      let compilationDetails = null;
      
      // Enhanced error handling for different response formats
      if (err.response) {
        const { status, data } = err.response;
        
        // Handle different error response structures
        if (data) {
          if (typeof data === 'string') {
            errorMessage = data;
          } else if (data.message) {
            errorMessage = data.message;
          } else if (data.error) {
            if (typeof data.error === 'string') {
              errorMessage = data.error;
            } else {
              compilationDetails = data.error;
              errorMessage = 'Compilation failed. Check details below.';
            }
          } else {
            errorMessage = `Server error (${status}): ${JSON.stringify(data)}`;
          }
        } else {
          errorMessage = `Server responded with status ${status}`;
        }
      } else if (err.request) {
        errorMessage = 'Network error: Unable to reach the server';
      } else {
        errorMessage = err.message || 'Unknown error occurred';
      }

      if (compilationDetails) {
        setCompilationError(typeof compilationDetails === 'string' ? 
          compilationDetails : JSON.stringify(compilationDetails, null, 2));
      }
      
      setError(errorMessage);
      setAnalysisProgress({
        stage: 'idle',
        progress: 0,
        message: 'Ready to analyze'
      });
      setNetworkStatuses([]);
      setActiveTab('editor');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('editor')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'editor'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Code className="w-5 h-5" />
                <span>Contract Editor</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('results')}
              disabled={!analysisResult}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === 'results'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Analysis Results</span>
                {analysisResult && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    {analysisResult.results.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'editor' ? (
          <ContractEditorTab
            code={code}
            setCode={setCode}
            contractName={contractName}
            setContractName={setContractName}
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
            selectedNetworks={selectedNetworks}
            onNetworkChange={setSelectedNetworks}
            confidenceLevel={confidenceLevel}
            setConfidenceLevel={setConfidenceLevel}
            saveToDatabase={saveToDatabase}
            setSaveToDatabase={setSaveToDatabase}
            isLoadingTemplate={isLoadingTemplate}
            setIsLoadingTemplate={setIsLoadingTemplate}
            analysisProgress={analysisProgress}
            analysisResult={analysisResult}
            error={error}
            compilationError={compilationError}
            isAnalyzing={isAnalyzing}
            handleTemplateChange={handleTemplateChange}
            handleAnalyze={handleAnalyze}
            networkStatuses={networkStatuses}
            analysisMethod={currentAnalysisMethod}
          />
        ) : (
          <GasEstimatorResultsTab analysisResult={analysisResult} />
        )}
      </div>
    </div>
  );
}





export default GasEstimatorIDE;