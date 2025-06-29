'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiService, BenchmarkSession } from '@/lib/api';
import { ChartComponent } from './ChartComponent';
import { ExportButton } from './ExportButton';
import { FilterControls } from './FilterControls';

interface FilterState {
  dateRange: 'all' | '7d' | '30d' | '90d';
  sortBy: 'date' | 'gasUsed' | 'executionTime' | 'operations';
  sortOrder: 'asc' | 'desc';
  chartType: 'line' | 'bar' | 'scatter';
  metric: 'gasUsed' | 'executionTime' | 'totalFees' | 'operations';
}

export function AnalysisDashboard() {
  const [sessions, setSessions] = useState<BenchmarkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'all',
    sortBy: 'date',
    sortOrder: 'desc',
    chartType: 'line',
    metric: 'gasUsed'
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await apiService.getBenchmarkSessions();
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedSessions = useMemo(() => {
    let filtered = [...sessions];

    // Date filtering
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const days = parseInt(filters.dateRange.replace('d', ''));
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(session => 
        session.createdAt && new Date(session.createdAt) >= cutoff
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (filters.sortBy) {
        case 'date':
          aVal = new Date(a.createdAt || 0).getTime();
          bVal = new Date(b.createdAt || 0).getTime();
          break;
        case 'gasUsed':
          aVal = Number(a.avgGasUsed || 0);
          bVal = Number(b.avgGasUsed || 0);
          break;
        case 'executionTime':
          aVal = Number(a.avgExecutionTime || 0);
          bVal = Number(b.avgExecutionTime || 0);
          break;
        case 'operations':
          aVal = a.totalOperations || 0;
          bVal = b.totalOperations || 0;
          break;
        default:
          return 0;
      }
      return filters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [sessions, filters]);

  const summaryStats = useMemo(() => {
    if (filteredAndSortedSessions.length === 0) return null;

    const totalSessions = filteredAndSortedSessions.length;
    const avgGasUsed = filteredAndSortedSessions.reduce((sum, s) => sum + Number(s.avgGasUsed || 0), 0) / totalSessions;
    const avgExecutionTime = filteredAndSortedSessions.reduce((sum, s) => sum + Number(s.avgExecutionTime || 0), 0) / totalSessions;
    const totalOperations = filteredAndSortedSessions.reduce((sum, s) => sum + (s.totalOperations || 0), 0);

    return {
      totalSessions,
      avgGasUsed: Math.round(avgGasUsed),
      avgExecutionTime: Number(avgExecutionTime.toFixed(3)),
      totalOperations
    };
  }, [filteredAndSortedSessions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-700 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-800 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-800 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-6">
            <div className="flex items-center">
              <span className="text-red-400 text-xl mr-3">⚠️</span>
              <div>
                <h3 className="text-red-300 font-medium">Error Loading Analysis Data</h3>
                <p className="text-red-400 text-sm mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={fetchSessions}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Filter Controls */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <FilterControls filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* Summary Statistics */}
        {summaryStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="text-sm font-medium text-gray-400">Total Sessions</div>
              <div className="text-2xl font-bold text-blue-400">{summaryStats.totalSessions}</div>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="text-sm font-medium text-gray-400">Avg Gas Used</div>
              <div className="text-2xl font-bold text-green-400">{summaryStats.avgGasUsed.toLocaleString()}</div>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="text-sm font-medium text-gray-400">Avg Execution Time</div>
              <div className="text-2xl font-bold text-purple-400">{summaryStats.avgExecutionTime}s</div>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="text-sm font-medium text-gray-400">Total Operations</div>
              <div className="text-2xl font-bold text-orange-400">{summaryStats.totalOperations}</div>
            </div>
          </div>
        )}

        {/* Chart Visualization */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Performance Trends</h2>
              <ExportButton sessions={filteredAndSortedSessions} />
            </div>
          </div>
          <div className="p-6">
            <ChartComponent 
              sessions={filteredAndSortedSessions} 
              chartType={filters.chartType}
              metric={filters.metric}
            />
          </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Detailed Results</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Operations</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Avg Gas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Avg Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Success Rate</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {filteredAndSortedSessions.length > 0 ? (
                  filteredAndSortedSessions.map((session, index) => {
                    const successRate = session.results?.transactions ? 
                      ((session.results.transactions.successfulTransactions / session.results.transactions.totalTransactions) * 100).toFixed(1) : 'N/A';
                    
                    return (
                      <tr key={session.id || index} className="hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {session.createdAt ? new Date(session.createdAt).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                          {session.totalOperations || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400 font-mono">
                          {Number(session.avgGasUsed || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400 font-mono">
                          {Number(session.avgExecutionTime || 0).toFixed(3)}s
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            parseFloat(successRate) >= 95 ? 'bg-green-900/50 text-green-300 border border-green-700' :
                            parseFloat(successRate) >= 80 ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' :
                            'bg-red-900/50 text-red-300 border border-red-700'
                          }`}>
                            {successRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="text-gray-400">
                        <svg className="mx-auto h-12 w-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-300 mb-1">No Data Available</h3>
                        <p className="text-sm text-gray-500">Run some benchmark tests to see analysis results here.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}