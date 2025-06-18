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
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <span className="text-red-500 text-xl mr-3">⚠️</span>
          <div>
            <h3 className="text-red-800 font-medium">Error Loading Analysis Data</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchSessions}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <FilterControls filters={filters} onFiltersChange={setFilters} />

      {/* Summary Statistics */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="text-sm font-medium text-gray-600">Total Sessions</div>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.totalSessions}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="text-sm font-medium text-gray-600">Avg Gas Used</div>
            <div className="text-2xl font-bold text-green-600">{summaryStats.avgGasUsed.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="text-sm font-medium text-gray-600">Avg Execution Time</div>
            <div className="text-2xl font-bold text-purple-600">{summaryStats.avgExecutionTime}s</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="text-sm font-medium text-gray-600">Total Operations</div>
            <div className="text-2xl font-bold text-orange-600">{summaryStats.totalOperations}</div>
          </div>
        </div>
      )}

      {/* Chart Visualization */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Performance Trends</h2>
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
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Detailed Results</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operations</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Gas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedSessions.map((session, index) => {
                const successRate = session.results?.transactions ? 
                  ((session.results.transactions.successfulTransactions / session.results.transactions.totalTransactions) * 100).toFixed(1) : 'N/A';
                
                return (
                  <tr key={session.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.createdAt ? new Date(session.createdAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.totalOperations || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Number(session.avgGasUsed || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Number(session.avgExecutionTime || 0).toFixed(3)}s
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        parseFloat(successRate) >= 95 ? 'bg-green-100 text-green-800' :
                        parseFloat(successRate) >= 80 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {successRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}