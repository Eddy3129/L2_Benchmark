import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { GasAnalysisResults } from './GasAnalysisResults';
import { ExportButton } from './ExportButton';

interface AnalysisResult {
  contractName: string;
  compilation: any;
  results: NetworkResult[];
  timestamp: string;
  // Additional properties for BenchmarkSession compatibility
  totalOperations: number;
  avgGasUsed: number;
  avgExecutionTime: number;
  id?: number;
  createdAt?: string;
}

interface NetworkResult {
  network: string;
  networkName: string;
  deployment: {
    gasUsed: string;
    costETH: string;
    costUSD: number;
  };
  functions: GasEstimate[];
  gasPrice: string;
  ethPriceUSD: number;
  gasPriceBreakdown: {
    baseFee: number;
    priorityFee: number;
    totalFee: number;
    confidence: number;
    source: string;
  };
}

interface GasEstimate {
  functionName: string;
  gasUsed: string;
  estimatedCostETH: string;
  estimatedCostUSD: number;
}

interface AnalysisProgress {
  stage: 'idle' | 'compiling' | 'deploying' | 'analyzing' | 'complete';
  progress: number;
  message: string;
}

const SAMPLE_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SampleToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1000000 * 10**18;
    
    constructor() ERC20("Sample Token", "SAMPLE") Ownable(msg.sender) {
        _mint(msg.sender, 100000 * 10**18);
    }
    
    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }
    
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
    
    function transfer(address to, uint256 amount) public override returns (bool) {
        return super.transfer(to, amount);
    }
}`;

const NETWORKS = [
  { id: 'arbitrumSepolia', name: 'Arbitrum Sepolia', color: 'bg-blue-500' },
  { id: 'optimismSepolia', name: 'Optimism Sepolia', color: 'bg-red-500' },
  { id: 'baseSepolia', name: 'Base Sepolia', color: 'bg-blue-600' },
  { id: 'polygonAmoy', name: 'Polygon Amoy', color: 'bg-purple-500' },
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
  const [code, setCode] = useState(SAMPLE_CONTRACT);
  const [contractName, setContractName] = useState('SampleToken');
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>(['arbitrumSepolia']);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({
    stage: 'idle',
    progress: 0,
    message: 'Ready to analyze'
  });
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAnalyzing = analysisProgress.stage !== 'idle' && analysisProgress.stage !== 'complete';

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

  // Helper function to transform AnalysisResult to BenchmarkSession format
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
      // Simulate compilation delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateProgress('deploying');
      
      // Simulate deployment delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateProgress('analyzing');

      const response = await fetch('http://localhost:3001/api/gas-analyzer/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          contractName,
          networks: selectedNetworks,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Transform the result to match the AnalysisResult interface
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
      
      // Auto-switch to results tab
      setActiveTab('results');
      
      // Reset to idle after 2 seconds
      setTimeout(() => updateProgress('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      updateProgress('idle');
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
                  <h3 className="text-lg font-semibold text-white">Target Networks</h3>
                  <p className="text-sm text-gray-400 mt-1">Select networks for gas analysis</p>
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
                          <div className={`w-3 h-3 rounded-full ${network.color}`}></div>
                          <span className="text-sm font-medium text-gray-300">
                            {network.name}
                          </span>
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
                disabled={isAnalyzing || selectedNetworks.length === 0}
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
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
                  <div className="flex">
                    <div className="text-red-400">
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-300">Analysis Error</h3>
                      <p className="text-sm text-red-400 mt-1">{error}</p>
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
                  sessions={[transformToBenchmarkSession(analysisResult)]} 
                  analysisResult={analysisResult}
                 />
                </div>
                <GasAnalysisResults result={analysisResult} />
              </>
            ) : (
              <div className="bg-gray-800 rounded-lg border border-gray-700 h-96 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <svg className="mx-auto h-16 w-16 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-xl font-medium text-gray-300 mb-2">No Analysis Results</h3>
                  <p className="text-gray-500 mb-4">
                    Switch to the Contract Editor tab to analyze your Solidity contract.
                  </p>
                  <button
                    onClick={() => setActiveTab('editor')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Go to Editor
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}