'use client';

import { useState, useEffect } from 'react';
import { apiService, BenchmarkSession } from '@/lib/api';

export function BenchmarkResults() {
  const [sessions, setSessions] = useState<BenchmarkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatGas = (gas: string | number | undefined) => {
    if (gas === undefined || gas === null) return 'N/A';
    const gasNum = typeof gas === 'string' ? parseInt(gas) : gas;
    return isNaN(gasNum) ? 'N/A' : gasNum.toLocaleString();
  };

  const formatEther = (wei: string | undefined) => {
    if (!wei) return 'N/A';
    try {
      const ethValue = parseFloat(wei) / 1e18;
      return isNaN(ethValue) ? 'N/A' : ethValue.toFixed(6);
    } catch {
      return 'N/A';
    }
  };

  const formatExecutionTime = (time: number | null | undefined) => {
    if (typeof time !== 'number' || isNaN(time)) {
      return 'N/A';
    }
    return time.toFixed(2);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <span className="text-red-500 text-xl mr-3">⚠️</span>
            <div>
              <h3 className="text-red-800 font-medium">Error Loading Results</h3>
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
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Benchmark Results History</h1>
        <button
          onClick={fetchSessions}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <span className="text-4xl mb-4 block">📊</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Benchmark Results Yet</h3>
          <p className="text-gray-600">Run your first benchmark to see results here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sessions.map((session, index) => (
            <div key={session.id || index} className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Benchmark Session #{session.id || index + 1}
                  </h3>
                  {session.createdAt && (
                    <p className="text-sm text-gray-500">
                      {formatDate(session.createdAt)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total Operations</div>
                  <div className="text-2xl font-bold text-blue-600">{session.totalOperations || 0}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-800">Avg Gas Used</div>
                  <div className="text-xl font-bold text-blue-900">
                    {formatGas(session.avgGasUsed)}
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-green-800">Avg Execution Time</div>
                  <div className="text-xl font-bold text-green-900">
                    {formatExecutionTime(session.avgExecutionTime)}s
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-purple-800">Total Gas Used</div>
                  <div className="text-xl font-bold text-purple-900">
                    {formatGas(session.results?.transactions?.totalGasUsed)}
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-orange-800">Total Fees (ETH)</div>
                  <div className="text-xl font-bold text-orange-900">
                    {formatEther(session.results?.transactions?.totalFees)}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-600">Total Transactions</div>
                  <div className="text-lg font-bold text-gray-900">
                    {session.results?.transactions?.totalTransactions || 0}
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-green-600">Successful</div>
                  <div className="text-lg font-bold text-green-700">
                    {session.results?.transactions?.successfulTransactions || 0}
                  </div>
                </div>

                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-red-600">Failed</div>
                  <div className="text-lg font-bold text-red-700">
                    {session.results?.transactions?.failedTransactions || 0}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}