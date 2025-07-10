import React, { useState, useEffect } from 'react';
import { apiService } from '../lib/api';
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
}

// Import shared types and utilities
import { NetworkResult, GasEstimate, AnalysisProgress } from '@/types/shared';
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
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>(['mainnet', 'polygon', 'arbitrum']);
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

  const handleNetworkToggle = (networkId: string) => {
    setSelectedNetworks(prev => 
      prev.includes(networkId)
        ? prev.filter(id => id !== networkId)
        : [...prev, networkId]
    );
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
    updateProgress('compiling');

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Always use unified analysis for comprehensive data
      const result = await apiService.analyzeContract({
        code,
        contractName,
        networks: selectedNetworks,
        saveToDatabase,
        confidenceLevel
      });

      updateProgress('deploying');
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateProgress('analyzing');
      
      const transformedResult: AnalysisResult = {
        contractName: result.contractName || contractName,
        compilation: result.compilation,
        results: result.results || [],
        timestamp: result.timestamp || new Date().toISOString(),
        totalOperations: result.results?.length || 0,
        avgGasUsed: result.results?.length > 0 ? 
          result.results.reduce((sum: number, r: any) => {
            const totalGas = parseInt(r.deployment?.gasUsed || '0') + 
              r.functions?.reduce((fSum: number, f: any) => fSum + parseInt(f.gasUsed || '0'), 0);
            return sum + totalGas;
          }, 0) / result.results.length : 0,
        avgExecutionTime: 0,
      };
      
      setAnalysisResult(transformedResult);
      
      updateProgress('complete');
      setActiveTab('results');
      setTimeout(() => updateProgress('idle'), 2000);
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
      updateProgress('idle');
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
            onNetworkToggle={handleNetworkToggle}
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
          />
        ) : (
          <GasEstimatorResultsTab analysisResult={analysisResult} />
        )}
      </div>
    </div>
  );
}





export default GasEstimatorIDE;