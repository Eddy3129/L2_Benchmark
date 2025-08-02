'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  RefreshCw,
  Database,
  Activity,
  AlertCircle,
  Download,
  Trash2,
  Zap,
} from 'lucide-react';

interface LiveNetworkForkRecord {
  id: string;
  network: string;
  contractName: string;
  functionName: string;
  contractAddress?: string;
  minGasUsed: string;
  maxGasUsed: string;
  avgGasUsed: string;
  l1DataBytes?: string;
  executionCount: number;
  avgCostUsd: string;
  gasPriceGwei: string;
  tokenPriceUsd: string;

  timestamp: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    chainId?: number;
    blockNumber?: number;
    transactionHashes?: string[];
    sessionId?: string;
    executionTime?: number;
    [key: string]: any;
  };
}

interface GroupedBenchmarkRecord {
  timestamp: string;
  records: LiveNetworkForkRecord[];
  networkCount: number;
  contractName: string;
}

export default function LiveNetworkForkTable() {
  const [records, setRecords] = useState<LiveNetworkForkRecord[]>([]);
  const [groupedRecords, setGroupedRecords] = useState<GroupedBenchmarkRecord[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  // Group records by timestamp
  const groupRecordsByTimestamp = (records: LiveNetworkForkRecord[]): GroupedBenchmarkRecord[] => {
    const grouped = records.reduce((acc, record) => {
      const timestamp = record.timestamp;
      if (!acc[timestamp]) {
        acc[timestamp] = [];
      }
      acc[timestamp].push(record);
      return acc;
    }, {} as Record<string, LiveNetworkForkRecord[]>);

    return Object.entries(grouped)
      .map(([timestamp, records]) => ({
        timestamp,
        records,
        networkCount: records.length,
        contractName: records[0]?.contractName || 'Unknown',
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const formatCurrency = (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(num);
  };

  const formatGwei = (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${num.toFixed(4)} gwei`;
  };

  const getNetworkColor = (network: string): string => {
    const colors: Record<string, string> = {
      'ethereum': '#627EEA',
      'arbitrum': '#28A0F0',
      'arbitrum one': '#28A0F0',
      'optimism': '#FF0420',
      'base': '#0052FF',
      'polygon': '#8247E5',
      'zksync': '#8C8DFC',
      'zksync era': '#8C8DFC',
      'scroll': '#FFEEDA',
      'linea': '#121212',
      'ink': '#000000',
    };
    return colors[network.toLowerCase()] || '#6B7280';
  };

  const toggleRowExpansion = (timestamp: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(timestamp)) {
      newExpanded.delete(timestamp);
    } else {
      newExpanded.add(timestamp);
    }
    setExpandedRows(newExpanded);
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `${backendUrl}/api/live-network-fork/records?limit=100&sortBy=timestamp&sortOrder=desc`;
      
      if (startDate) {
        url += `&startDate=${encodeURIComponent(startDate)}`;
      }
      if (endDate) {
        url += `&endDate=${encodeURIComponent(endDate)}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch records: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const fetchedRecords = result.data.records || [];
      setRecords(fetchedRecords);
      setGroupedRecords(groupRecordsByTimestamp(fetchedRecords));
    } catch (err) {
      console.error('Failed to fetch live benchmark records:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRecords = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${backendUrl}/api/live-network-fork/records?limit=100&sortBy=timestamp&sortOrder=desc`);
      if (!response.ok) {
        throw new Error(`Failed to fetch all records: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const fetchedRecords = result.data.records || [];
      setRecords(fetchedRecords);
      setGroupedRecords(groupRecordsByTimestamp(fetchedRecords));
    } catch (err) {
      console.error('Failed to fetch all live benchmark records:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch all records');
    } finally {
      setLoading(false);
    }
  };

  const deleteRecordsByTimestamp = async (timestamp: string) => {
    try {
      setIsDeleting(true);
      const response = await fetch(`${backendUrl}/api/live-network-fork/records/timestamp/${encodeURIComponent(timestamp)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete records: ${response.status} ${response.statusText}`);
      }

      // Refresh the data after deletion
      await fetchAllRecords();
    } catch (err) {
      console.error('Failed to delete records:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete records');
    } finally {
      setIsDeleting(false);
    }
  };

  const exportToCsv = async () => {
    try {
      let url = `${backendUrl}/api/live-network-fork/export`;
      const params = new URLSearchParams();
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to export data: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `live_benchmark_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to export data:', err);
      setError(err instanceof Error ? err.message : 'Failed to export data');
    }
  };

  useEffect(() => {
    fetchAllRecords();
  }, []);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Start Date"
            />
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="End Date"
            />
            <Button
              onClick={fetchRecords}
              disabled={loading}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Filter
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setViewMode(viewMode === 'grouped' ? 'flat' : 'grouped')}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              {viewMode === 'grouped' ? 'Flat View' : 'Grouped View'}
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={fetchAllRecords}
            disabled={loading}
            size="sm"
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={exportToCsv}
            size="sm"
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="bg-red-900/20 border-red-500/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-red-300">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Live Network Fork Records
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {(viewMode === 'grouped' ? groupedRecords.length === 0 : records.length === 0) ? (
            <div className="text-center py-8 text-gray-400">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No live network fork data found</p>
              <p className="text-sm mt-1">Try adjusting your filters or run some live network forks</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    {viewMode === 'grouped' && <TableHead className="text-gray-300 w-8"></TableHead>}
                    {viewMode === 'grouped' ? (
                      <>
                        <TableHead className="text-gray-400 text-sm">Timestamp</TableHead>
                        <TableHead className="text-gray-400 text-sm">Contract</TableHead>
                        <TableHead className="text-gray-400 text-sm text-right">Functions</TableHead>
                        <TableHead className="text-gray-400 text-sm text-right">Networks</TableHead>
                        <TableHead className="text-gray-400 text-sm text-right">Actions</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="text-gray-400 text-sm">Network</TableHead>
                        <TableHead className="text-gray-400 text-sm">Contract</TableHead>
                        <TableHead className="text-gray-400 text-sm">Function</TableHead>
                        <TableHead className="text-gray-400 text-sm text-right">Min Gas</TableHead>
                        <TableHead className="text-gray-400 text-sm text-right">Max Gas</TableHead>
                        <TableHead className="text-gray-400 text-sm text-right">Avg Gas</TableHead>
                        <TableHead className="text-gray-400 text-sm text-right">L1 Data</TableHead>
                        <TableHead className="text-gray-400 text-sm text-right">Executions</TableHead>
                        <TableHead className="text-gray-400 text-sm text-right">Avg Cost</TableHead>
                        <TableHead className="text-gray-400 text-sm text-right">Timestamp</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewMode === 'grouped' ? (
                    groupedRecords.map((groupedRecord) => (
                      <React.Fragment key={groupedRecord.timestamp}>
                        <TableRow className="border-gray-600 hover:bg-gray-800/30 cursor-pointer" onClick={() => toggleRowExpansion(groupedRecord.timestamp)}>
                          <TableCell className="text-sm">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              {expandedRows.has(groupedRecord.timestamp) ? '−' : '+'}
                            </Button>
                          </TableCell>
                          <TableCell className="text-sm text-white font-mono">
                            {new Date(groupedRecord.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm text-white">
                            {groupedRecord.contractName}
                          </TableCell>
                          <TableCell className="text-sm text-right text-gray-300">
                            {groupedRecord.records.length}
                          </TableCell>
                          <TableCell className="text-sm text-right text-gray-300">
                            {groupedRecord.networkCount}
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteRecordsByTimestamp(groupedRecord.timestamp);
                              }}
                              disabled={isDeleting}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedRows.has(groupedRecord.timestamp) && (
                          <TableRow>
                            <TableCell colSpan={6} className="p-0">
                              <div className="bg-gray-900/50 border-t border-gray-600">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-gray-600">
                                      <TableHead className="text-gray-400 text-sm">Network</TableHead>
                                      <TableHead className="text-gray-400 text-sm">Function</TableHead>
                                      <TableHead className="text-gray-400 text-sm text-right">Min Gas</TableHead>
                                      <TableHead className="text-gray-400 text-sm text-right">Max Gas</TableHead>
                                      <TableHead className="text-gray-400 text-sm text-right">Avg Gas</TableHead>
                                      <TableHead className="text-gray-400 text-sm text-right">L1 Data</TableHead>
                                      <TableHead className="text-gray-400 text-sm text-right">Executions</TableHead>
                                      <TableHead className="text-gray-400 text-sm text-right">Avg Cost</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {groupedRecord.records.map((record) => (
                                      <TableRow key={record.id} className="border-gray-600 hover:bg-gray-800/30">
                                        <TableCell className="text-sm">
                                          <div className="flex items-center gap-2">
                                            <div 
                                              className="w-2 h-2 rounded-full" 
                                              style={{ backgroundColor: getNetworkColor(record.network) }}
                                            />
                                            <span className="text-white">{record.network}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-white">
                                          {record.functionName}
                                        </TableCell>
                                        <TableCell className="text-sm text-right text-gray-300 font-mono">
                                          {parseInt(record.minGasUsed).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-sm text-right text-gray-300 font-mono">
                                          {parseInt(record.maxGasUsed).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-sm text-right text-gray-300 font-mono">
                                          {parseInt(record.avgGasUsed).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-sm text-right text-blue-300 font-mono">
                                          {record.l1DataBytes ? parseInt(record.l1DataBytes).toLocaleString() : '—'}
                                        </TableCell>
                                        <TableCell className="text-sm text-right text-purple-300 font-mono">
                                          {record.executionCount}
                                        </TableCell>
                                        <TableCell className="text-sm text-right text-green-300 font-mono">
                                          {formatCurrency(record.avgCostUsd)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    records.map((record) => (
                      <TableRow key={record.id} className="border-gray-600 hover:bg-gray-800/30">
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: getNetworkColor(record.network) }}
                            />
                            <span className="text-white">{record.network}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-white">
                          {record.contractName}
                        </TableCell>
                        <TableCell className="text-sm text-white">
                          {record.functionName}
                        </TableCell>
                        <TableCell className="text-sm text-right text-gray-300 font-mono">
                          {parseInt(record.minGasUsed).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-right text-gray-300 font-mono">
                          {parseInt(record.maxGasUsed).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-right text-gray-300 font-mono">
                          {parseInt(record.avgGasUsed).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-right text-blue-300 font-mono">
                          {record.l1DataBytes ? parseInt(record.l1DataBytes).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-right text-purple-300 font-mono">
                          {record.executionCount}
                        </TableCell>
                        <TableCell className="text-sm text-right text-green-300 font-mono">
                          {formatCurrency(record.avgCostUsd)}
                        </TableCell>
                        <TableCell className="text-sm text-right text-gray-300 font-mono">
                          {new Date(record.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}