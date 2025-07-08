import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { UnifiedGasResults } from './UnifiedGasResults';
import { ExportButton } from './ExportButton';
import { apiService } from '../lib/api';
import { CONTRACT_TEMPLATES, ContractTemplate, loadContractTemplate } from '@/lib/contractTemplate';

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

// Use centralized network configuration - filter to show only mainnet networks
const NETWORKS = getAllNetworks()
  .filter(network => {
    // Only show mainnet networks (exclude testnets)
    const testnetIds = ['arbitrumSepolia', 'optimismSepolia', 'baseSepolia', 'polygonAmoy', 'polygonZkEvm', 'zkSyncSepolia'];
    return !testnetIds.includes(network.id);
  })
  .map(network => ({
    id: network.id,
    name: network.name,
    color: network.color
  }));



const CONFIDENCE_LEVELS = [
  { value: 70, label: '70% - Fast', description: 'Quick confirmation, lower confidence' },
  { value: 80, label: '80% - Standard', description: 'Balanced speed and confidence' },
  { value: 90, label: '90% - Safe', description: 'Higher confidence, slower confirmation' },
  { value: 95, label: '95% - Very Safe', description: 'Very high confidence' },
  { value: 99, label: '99% - Maximum', description: 'Maximum confidence, slowest confirmation' },
];

const PROGRESS_STAGES = {
  idle: { message: 'Ready to analyze', progress: 0 },
  compiling: { message: 'Compiling Solidity contract...', progress: 25 },
  deploying: { message: 'Deploying to test networks...', progress: 50 },
  analyzing: { message: 'Analyzing gas costs and functions...', progress: 75 },
  complete: { message: 'Analysis complete', progress: 100 }
};

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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      updateProgress('idle');
      
      if (errorMessage.includes('Compilation Error') || errorMessage.includes('Syntax Error')) {
        setActiveTab('editor');
      }
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contract Editor - Takes 2/3 width */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gray-800 rounded-lg border border-gray-700">
                <div className="p-4 border-b border-gray-700">
                  <h2 className="text-xl font-semibold text-white">Solidity Contract</h2>
                  <p className="text-sm text-gray-400 mt-1">Write or paste your contract code for comprehensive gas analysis</p>
                </div>
                
                <div className="p-6 space-y-4">
                  {/* Contract Template Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Contract Template
                    </label>
                    <div className="flex items-center space-x-4">
                      <select
                        value={selectedTemplate}
                        onChange={(e) => handleTemplateChange(e.target.value)}
                        disabled={isLoadingTemplate}
                        className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                      >
                        {CONTRACT_TEMPLATES.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name} ({template.category})
                          </option>
                        ))}
                      </select>
                      {isLoadingTemplate && (
                        <div className="text-sm text-gray-500 flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          <span>Loading...</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                      {CONTRACT_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Contract Name
                    </label>
                    <input
                      type="text"
                      value={contractName}
                      onChange={(e) => setContractName(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter contract name"
                    />
                  </div>



                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="saveToDatabase"
                      checked={saveToDatabase}
                      onChange={(e) => setSaveToDatabase(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label htmlFor="saveToDatabase" className="text-sm font-medium text-gray-300">
                      Save results to database for reporting
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Solidity Code
                    </label>
                    <div className="border border-gray-600 rounded-md overflow-hidden">
                      <Editor
                        height="500px"
                        defaultLanguage="solidity"
                        value={code}
                        onChange={(value) => setCode(value || '')}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          lineNumbers: 'on',
                          roundedSelection: false,
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          padding: { top: 16, bottom: 16 },
                          wordWrap: 'on',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Configuration Panel - Takes 1/3 width */}
            <div className="space-y-6">
              {/* Network Selection */}
              <div className="bg-gray-800 rounded-lg border border-gray-700">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-lg font-semibold text-white">
                    Target Networks
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Select networks for gas cost analysis and comparison
                  </p>
                </div>
                
                <div className="p-4">
                  <div className="space-y-3">
                    {NETWORKS.map((network) => (
                      <label
                        key={network.id}
                        className="flex items-center space-x-3 cursor-pointer p-3 rounded-md hover:bg-gray-700 transition-colors border border-gray-600"
                      >
                        <input
                          type="checkbox"
                          checked={selectedNetworks.includes(network.id)}
                          onChange={() => handleNetworkToggle(network.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-700 rounded"
                        />
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: network.color }}
                          ></div>
                          <span className="text-sm font-medium text-gray-300">
                            {network.name}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Gas Price Confidence Level */}
              <div className="bg-gray-800 rounded-lg border border-gray-700">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-lg font-semibold text-white">Gas Price Confidence</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Select confidence level for gas price estimation
                  </p>
                </div>
                
                <div className="p-4">
                  <div className="space-y-3">
                    {CONFIDENCE_LEVELS.map((level) => (
                      <label
                        key={level.value}
                        className="flex items-start space-x-3 cursor-pointer p-3 rounded-md hover:bg-gray-700 transition-colors border border-gray-600"
                      >
                        <input
                          type="radio"
                          name="confidenceLevel"
                          value={level.value}
                          checked={confidenceLevel === level.value}
                          onChange={(e) => setConfidenceLevel(Number(e.target.value))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-700 mt-0.5"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-300">
                            {level.label}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {level.description}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {(isAnalyzing || analysisProgress.stage === 'complete') && (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">{analysisProgress.message}</span>
                    <span className="text-sm text-gray-400">{analysisProgress.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${analysisProgress.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || selectedNetworks.length === 0 || isLoadingTemplate}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
              >
                {isAnalyzing ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Analyzing...</span>
                  </div>
                ) : (
                  'Analyze Gas & Costs'
                )}
              </button>

              {error && (
                <div className={`border rounded-lg p-4 ${
                  error.includes('Compilation Error') || error.includes('Syntax Error')
                    ? 'bg-red-900/50 border-red-700'
                    : 'bg-yellow-900/50 border-yellow-700'
                }`}>
                  <div className="flex">
                    <div className={error.includes('Compilation Error') || error.includes('Syntax Error') ? 'text-red-400' : 'text-yellow-400'}>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className={`text-sm font-medium ${
                        error.includes('Compilation Error') || error.includes('Syntax Error')
                          ? 'text-red-300'
                          : 'text-yellow-300'
                      }`}>
                        {error.includes('Compilation Error') ? 'Compilation Error' :
                         error.includes('Syntax Error') ? 'Syntax Error' : 'Analysis Error'}
                      </h3>
                      <p className={`text-sm mt-1 ${
                        error.includes('Compilation Error') || error.includes('Syntax Error')
                          ? 'text-red-400'
                          : 'text-yellow-400'
                      }`}>
                        {error}
                      </p>
                      {(error.includes('Compilation Error') || error.includes('Syntax Error')) && (
                        <p className="text-xs text-gray-400 mt-2">
                          💡 Check your Solidity syntax, imports, and contract structure.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              {analysisResult && (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Quick Stats</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Networks:</span>
                      <span className="text-blue-400 font-medium">{analysisResult.results.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Functions:</span>
                      <span className="text-purple-400 font-medium">
                        {analysisResult.results.reduce((sum, r) => sum + r.functions.length, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Deploy Cost:</span>
                      <span className="text-green-400 font-medium">
                        ${(analysisResult.results.reduce((sum, r) => sum + r.deployment.costUSD, 0) / analysisResult.results.length).toFixed(3)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Results Tab
          <div className="space-y-6">
            {analysisResult ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-white">Gas Analysis Results</h1>
                    <p className="text-gray-400 mt-1">
                      Contract: <span className="text-blue-400 font-medium">{analysisResult.contractName}</span> • 
                      Analyzed: <span className="text-green-400 font-medium">{new Date(analysisResult.timestamp).toLocaleString()}</span>
                    </p>
                  </div>
                  <ExportButton 
                     sessions={[]}
                     analysisResult={analysisResult}
                   />
                </div>
                <UnifiedGasResults result={analysisResult} />
              </>
            ) : (
              <div className="bg-gray-800 rounded-lg border border-gray-700 h-96 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-medium mb-2">No Analysis Results</h3>
                  <p className="text-sm">Run a gas analysis to see detailed results here.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}