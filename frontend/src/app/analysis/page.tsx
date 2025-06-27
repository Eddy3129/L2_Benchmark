'use client'

import React, { useState, useEffect } from 'react';
import { apiService, type BenchmarkSession, type GasAnalysis } from '../../lib/api';

interface DetailedGasAnalysis extends GasAnalysis {
  expanded?: boolean;
}

interface GroupedGasAnalysis {
  contractName: string;
  createdAt: string;
  analyses: GasAnalysis[];
  totalGasUsed: number;
  totalCostUSD: number;
  networkCount: number;
  functionCount: number;
}

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<'estimation' | 'benchmark'>('estimation');
  const [gasAnalyses, setGasAnalyses] = useState<GroupedGasAnalysis[]>([]);
  const [benchmarkSessions, setBenchmarkSessions] = useState<BenchmarkSession[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<GroupedGasAnalysis | null>(null);
  const [selectedBenchmark, setSelectedBenchmark] = useState<BenchmarkSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add filter states
  const [functionFilter, setFunctionFilter] = useState<string>('');
  const [networkFilter, setNetworkFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'gasUsed' | 'totalCost' | 'function' | 'network'>('gasUsed');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Move filter and sort function here (before useEffect and other functions)
  const filterAndSortAnalyses = (analyses: GasAnalysis[]) => {
    let filtered = analyses.filter(analysis => {
      const matchesFunction = !functionFilter || 
        analysis.functionSignature.toLowerCase().includes(functionFilter.toLowerCase());
      const matchesNetwork = !networkFilter || analysis.l2Network === networkFilter;
      return matchesFunction && matchesNetwork;
    });

    return filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'gasUsed':
          aValue = parseInt(a.gasUsed || '0');
          bValue = parseInt(b.gasUsed || '0');
          break;
        case 'totalCost':
          aValue = Number(a.totalEstimatedFeeUSD) || 0;
          bValue = Number(b.totalEstimatedFeeUSD) || 0;
          break;
        case 'function':
          aValue = a.functionSignature;
          bValue = b.functionSignature;
          break;
        case 'network':
          aValue = a.l2Network;
          bValue = b.l2Network;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });
  };

  // Get unique networks for filter dropdown
  const getUniqueNetworks = (analyses: GasAnalysis[]) => {
    return Array.from(new Set(analyses.map(a => a.l2Network)));
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [gasData, benchmarkData] = await Promise.all([
        apiService.getGasAnalysisHistory(),
        apiService.getBenchmarkSessions()
      ]);
      
      // Group gas analyses by contract and session
      const groupedGasAnalyses = groupGasAnalyses(gasData);
      setGasAnalyses(groupedGasAnalyses);
      setBenchmarkSessions(benchmarkData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const groupGasAnalyses = (analyses: GasAnalysis[]): GroupedGasAnalysis[] => {
    const grouped = analyses.reduce((acc, analysis) => {
      const key = `${analysis.contractName}-${analysis.createdAt.split('T')[0]}`;
      if (!acc[key]) {
        acc[key] = {
          contractName: analysis.contractName,
          createdAt: analysis.createdAt,
          analyses: [],
          totalGasUsed: 0,
          totalCostUSD: 0,
          networkCount: 0,
          functionCount: 0
        };
      }
      acc[key].analyses.push(analysis);
      acc[key].totalGasUsed += parseInt(analysis.gasUsed || '0');
      acc[key].totalCostUSD += Number(analysis.totalEstimatedFeeUSD) || 0;
      return acc;
    }, {} as Record<string, GroupedGasAnalysis>);

    return Object.values(grouped).map(group => ({
      ...group,
      networkCount: new Set(group.analyses.map(a => a.l2Network)).size,
      functionCount: group.analyses.length
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const exportToCSV = (data: any[], filename: string, type: 'estimation' | 'benchmark') => {
    let csvContent = '';
    
    if (type === 'estimation') {
      csvContent = 'Contract Name,Function,Network,Gas Used,L2 Fee (ETH),L1 Fee (ETH),Total Cost (USD),Created At\n';
      data.forEach((group: GroupedGasAnalysis) => {
        group.analyses.forEach((analysis: GasAnalysis) => {
          csvContent += `"${analysis.contractName}","${analysis.functionSignature}","${analysis.l2Network}",${analysis.gasUsed},${analysis.estimatedL2Fee},${analysis.estimatedL1Fee},${analysis.totalEstimatedFeeUSD},"${analysis.createdAt}"\n`;
        });
      });
    } else {
      csvContent = 'Session Name,Total Operations,Avg Gas Used,Avg Execution Time,Success Rate,Total Gas Used,Total Fees,Created At\n';
      data.forEach((session: BenchmarkSession) => {
        const successRate = session.results.transactions.totalTransactions > 0 
          ? (Number(session.results.transactions.successfulTransactions) || 0) / (Number(session.results.transactions.totalTransactions) || 1) * 100
          : 0;
        csvContent += `"${session.sessionName}",${session.totalOperations || 0},${session.avgGasUsed || 0},${Number(session.avgExecutionTime) || 0},${successRate.toFixed(2)}%,${session.results.transactions.totalGasUsed || 0},${session.results.transactions.totalFees || 0},"${session.createdAt}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading analysis data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white bg-clip-text">
                Analysis Reports
              </h1>
              <p className="text-gray-400 mt-2">
                Comprehensive gas estimation and benchmark analysis reports
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => exportToCSV(
                  activeTab === 'estimation' ? gasAnalyses : benchmarkSessions,
                  `${activeTab}-report-${new Date().toISOString().split('T')[0]}.csv`,
                  activeTab
                )}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className='text-sm'>Export CSV</span>
              </button>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className='text-sm'>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('estimation')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'estimation'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Gas Estimation Reports</span>
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  {gasAnalyses.length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('benchmark')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'benchmark'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Benchmark Test Reports</span>
                <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                  {benchmarkSessions.length}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-400 font-medium">Error loading data</span>
            </div>
            <p className="text-red-300 mt-1">{error}</p>
            <button
              onClick={loadData}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {activeTab === 'estimation' ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Total Analyses</p>
                    <p className="text-xl font-bold text-white">{gasAnalyses.length}</p>
                  </div>
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Avg Gas Used</p>
                    <p className="text-xl font-bold text-white">
                      {gasAnalyses.length > 0 
                        ? Math.round(gasAnalyses.reduce((sum, g) => sum + (g.totalGasUsed || 0), 0) / gasAnalyses.length).toLocaleString()
                        : '0'
                      }
                    </p>
                  </div>
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Total Cost (USD)</p>
                    <p className="text-xl font-bold text-white">
                      ${gasAnalyses.length > 0 
                        ? gasAnalyses.reduce((sum, g) => sum + (Number(g.totalCostUSD) || 0), 0).toFixed(4)
                        : '0.0000'
                      }
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-500/20 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Unique Contracts</p>
                    <p className="text-xl font-bold text-white">
                      {new Set(gasAnalyses.map(g => g.contractName)).size}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Gas Analysis Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Gas Estimation Analysis Sessions</h3>
                <p className="text-sm text-gray-400 mt-1">Click on any row to view detailed function-level gas consumption</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Contract</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Networks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Functions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Gas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Cost (USD)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {gasAnalyses.map((group, index) => (
                      <React.Fragment key={index}>
                        <tr 
                          className="hover:bg-gray-700 cursor-pointer transition-colors"
                          onClick={() => setSelectedAnalysis(selectedAnalysis?.contractName === group.contractName && selectedAnalysis?.createdAt === group.createdAt ? null : group)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-sm font-medium text-white">{group.contractName}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {new Date(group.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {group.networkCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {group.functionCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {(group.totalGasUsed || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            ${(Number(group.totalCostUSD) || 0).toFixed(6)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                exportToCSV([group], `${group.contractName}-${new Date(group.createdAt).toISOString().split('T')[0]}.csv`, 'estimation');
                              }}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              Export
                            </button>
                          </td>
                        </tr>
                        {selectedAnalysis?.contractName === group.contractName && selectedAnalysis?.createdAt === group.createdAt && (
                          <tr>
                            <td colSpan={7} className="px-4 py-6 bg-gray-900">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between mb-6">
                                  <h4 className="text-sm font-medium text-white">Detailed Function Analysis</h4>
                                  <div className="flex items-center space-x-4">
                                    {/* Function Filter */}
                                    <div className="flex items-center space-x-2">
                                      <label className="text-sm text-gray-400">Function:</label>
                                      <input
                                        type="text"
                                        placeholder="Filter by function..."
                                        value={functionFilter}
                                        onChange={(e) => setFunctionFilter(e.target.value)}
                                        className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:border-blue-500"
                                      />
                                    </div>
                                    
                                    {/* Network Filter */}
                                    <div className="flex items-center space-x-2">
                                      <label className="text-sm text-gray-400">Network:</label>
                                      <select
                                        value={networkFilter}
                                        onChange={(e) => setNetworkFilter(e.target.value)}
                                        className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:border-blue-500"
                                      >
                                        <option value="">All Networks</option>
                                        {getUniqueNetworks(group.analyses).map(network => (
                                          <option key={network} value={network}>{network}</option>
                                        ))}
                                      </select>
                                    </div>
                                    
                                    {/* Sort Options */}
                                    <div className="flex items-center space-x-2">
                                      <label className="text-sm text-gray-400">Sort by:</label>
                                      <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:border-blue-500"
                                      >
                                        <option value="gasUsed">Gas Used</option>
                                        <option value="totalCost">Total Cost</option>
                                        <option value="function">Function Name</option>
                                        <option value="network">Network</option>
                                      </select>
                                      <button
                                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                        className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs transition-colors"
                                      >
                                        {sortOrder === 'asc' ? '↑' : '↓'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  {filterAndSortAnalyses(group.analyses).map((analysis, idx) => (
                                    <div key={idx} className="bg-gray-800 rounded-lg border border-gray-600 p-4">
                                      <div className="flex items-center justify-between mb-3">
                                        <h5 className="font-medium text-white">{analysis.functionSignature}</h5>
                                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                                          {analysis.l2Network}
                                        </span>
                                      </div>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Gas Used:</span>
                                          <span className="text-white font-mono">{parseInt(analysis.gasUsed || '0').toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">L2 Fee:</span>
                                          <span className="text-white font-mono">{(Number(analysis.estimatedL2Fee) || 0).toFixed(8)} ETH</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">L1 Fee:</span>
                                          <span className="text-white font-mono">{(Number(analysis.estimatedL1Fee) || 0).toFixed(8)} ETH</span>
                                        </div>
                                        <div className="flex justify-between border-t border-gray-600 pt-2">
                                          <span className="text-gray-400 font-medium">Total Cost:</span>
                                          <span className="text-green-400 font-mono font-medium">${(Number(analysis.totalEstimatedFeeUSD) || 0).toFixed(6)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Show message if no results after filtering */}
                                {filterAndSortAnalyses(group.analyses).length === 0 && (
                                  <div className="text-center py-8">
                                    <p className="text-gray-400">No functions match the current filters.</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Benchmark Sessions Tab - Similar structure but for benchmark data */
          <div className="space-y-6">
            {/* Summary Cards for Benchmark */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Total Sessions</p>
                    <p className="text-xl font-bold text-white">{benchmarkSessions.length}</p>
                  </div>
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Avg Gas Used</p>
                    <p className="text-xl font-bold text-white">
                      {benchmarkSessions.length > 0 
                        ? Math.round(benchmarkSessions.reduce((sum, s) => sum + (Number(s.avgGasUsed) || 0), 0) / benchmarkSessions.length).toLocaleString()
                        : '0'
                      }
                    </p>
                  </div>
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Avg Execution Time</p>
                    <p className="text-xl font-bold text-white">
                      {benchmarkSessions.length > 0 
                        ? (benchmarkSessions.reduce((sum, s) => sum + (Number(s.avgExecutionTime) || 0), 0) / benchmarkSessions.length).toFixed(2)
                        : '0.00'
                      }ms
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-500/20 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Total Operations</p>
                    <p className="text-xl font-bold text-white">
                      {benchmarkSessions.reduce((sum, s) => sum + (Number(s.totalOperations) || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Benchmark Sessions Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Benchmark Test Sessions</h3>
                <p className="text-sm text-gray-400 mt-1">Click on any row to view detailed transaction information</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Session Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Operations</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Avg Gas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Avg Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Success Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {benchmarkSessions.map((session, index) => {
                      const successRate = session.results?.transactions?.totalTransactions > 0 
                        ? (Number(session.results.transactions.successfulTransactions) || 0) / (Number(session.results.transactions.totalTransactions) || 1) * 100
                        : 0;
                      
                      return (
                        <React.Fragment key={session.id || index}>
                          <tr 
                            className="hover:bg-gray-700 cursor-pointer transition-colors"
                            onClick={() => setSelectedBenchmark(selectedBenchmark?.id === session.id ? null : session)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-white">{session.sessionName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {(Number(session.totalOperations) || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {(Number(session.avgGasUsed) || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {(Number(session.avgExecutionTime) || 0).toFixed(2)}ms
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                successRate >= 95 ? 'bg-green-500/20 text-green-400' :
                                successRate >= 80 ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {successRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportToCSV([session], `${session.sessionName}-${session.createdAt ? new Date(session.createdAt).toISOString().split('T')[0] : 'unknown'}.csv`, 'benchmark');
                                }}
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                Export
                              </button>
                            </td>
                          </tr>
                          {selectedBenchmark?.id === session.id && (
                            <tr>
                              <td colSpan={7} className="px-6 py-4 bg-gray-750">
                                <div className="space-y-4">
                                  <h4 className="text-lg font-medium text-white mb-4">Detailed Transaction Information</h4>
                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    <div className="bg-gray-800 rounded-lg border border-gray-600 p-4">
                                      <h5 className="font-medium text-white mb-3">Transaction Summary</h5>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Total Transactions:</span>
                                          <span className="text-white font-mono">{Number(session.results?.transactions?.totalTransactions) || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Successful:</span>
                                          <span className="text-green-400 font-mono">{Number(session.results?.transactions?.successfulTransactions) || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Failed:</span>
                                          <span className="text-red-400 font-mono">{Number(session.results?.transactions?.failedTransactions) || 0}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="bg-gray-800 rounded-lg border border-gray-600 p-4">
                                      <h5 className="font-medium text-white mb-3">Gas Consumption</h5>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Total Gas Used:</span>
                                          <span className="text-white font-mono">{parseInt(session.results?.transactions?.totalGasUsed || '0').toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Average Gas:</span>
                                          <span className="text-blue-400 font-mono">{(Number(session.avgGasUsed) || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Total Fees:</span>
                                          <span className="text-yellow-400 font-mono">{(Number(session.results?.transactions?.totalFees) || 0).toFixed(6)} ETH</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="bg-gray-800 rounded-lg border border-gray-600 p-4">
                                      <h5 className="font-medium text-white mb-3">Performance Metrics</h5>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Avg Execution Time:</span>
                                          <span className="text-white font-mono">{(Number(session.avgExecutionTime) || 0).toFixed(2)}ms</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Total Operations:</span>
                                          <span className="text-purple-400 font-mono">{Number(session.totalOperations) || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Success Rate:</span>
                                          <span className={`font-mono ${
                                            successRate >= 95 ? 'text-green-400' :
                                            successRate >= 80 ? 'text-yellow-400' :
                                            'text-red-400'
                                          }`}>
                                            {successRate.toFixed(2)}%
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}