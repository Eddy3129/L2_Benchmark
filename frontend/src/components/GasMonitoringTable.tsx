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
} from 'lucide-react';

interface GasMonitoringRecord {
  id: string;
  network: string;
  type: string;
  baseFeeGwei?: string | number;
  priorityFeeGwei?: string | number;
  maxFeeGwei?: string | number;
  txCostUsd?: string | number;
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: {
    chainId?: string | number;
    blockNumber?: number;
    gasLimit?: number;
    [key: string]: any;
  };
}

interface GroupedRecord {
  timestamp: string;
  records: GasMonitoringRecord[];
  networkCount: number;
}

export default function GasMonitoringTable() {
  const [records, setRecords] = useState<GasMonitoringRecord[]>([]);
  const [groupedRecords, setGroupedRecords] = useState<GroupedRecord[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  // Group records by timestamp
  const groupRecordsByTimestamp = (records: GasMonitoringRecord[]): GroupedRecord[] => {
    const grouped = records.reduce((acc, record) => {
      const timestamp = record.timestamp;
      if (!acc[timestamp]) {
        acc[timestamp] = [];
      }
      acc[timestamp].push(record);
      return acc;
    }, {} as Record<string, GasMonitoringRecord[]>);

    return Object.entries(grouped)
      .map(([timestamp, records]) => ({
        timestamp,
        records,
        networkCount: records.length,
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  // Toggle row expansion
  const toggleRowExpansion = (timestamp: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(timestamp)) {
      newExpanded.delete(timestamp);
    } else {
      newExpanded.add(timestamp);
    }
    setExpandedRows(newExpanded);
  };

  // Export specific timestamp data to CSV
  const exportTimestampToCSV = (groupedRecord: GroupedRecord) => {
    const csvContent = [
      'Network,Type,Base Fee (Gwei),Priority Fee (Gwei),Max Fee (Gwei),Tx Cost (USD)',
      ...groupedRecord.records.map(record => 
        `${record.network},${record.type},${record.baseFeeGwei || 0},${record.priorityFeeGwei || 0},${record.maxFeeGwei || 0},${record.txCostUsd || 0}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `gas_monitoring_${new Date(groupedRecord.timestamp).toISOString().replace(/[:.]/g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', '100');
      params.append('sortBy', 'timestamp');
      params.append('sortOrder', 'desc');

      const response = await fetch(`${backendUrl}/api/gas-monitoring/records?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch records: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const fetchedRecords = result.data.records || [];
      setRecords(fetchedRecords);
      setGroupedRecords(groupRecordsByTimestamp(fetchedRecords));
    } catch (err) {
      console.error('Failed to fetch gas monitoring records:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRecords = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${backendUrl}/api/gas-monitoring/records?limit=100&sortBy=timestamp&sortOrder=desc`);
      if (!response.ok) {
        throw new Error(`Failed to fetch all records: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const fetchedRecords = result.data.records || [];
      setRecords(fetchedRecords);
      setGroupedRecords(groupRecordsByTimestamp(fetchedRecords));
    } catch (err) {
      console.error('Failed to fetch all gas monitoring records:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch all records');
    } finally {
      setLoading(false);
    }
  };

  const deleteRecordsByTimestamp = async (timestamp: string) => {
    if (!confirm(`Are you sure you want to delete all records for timestamp ${formatTimestamp(timestamp)}?`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const response = await fetch(`${backendUrl}/api/gas-monitoring/records/timestamp/${encodeURIComponent(timestamp)}`, {
          method: 'DELETE'
        });
      
      if (response.ok) {
        await fetchRecords();
      } else {
        alert('Failed to delete records');
      }
    } catch (error) {
      console.error('Error deleting records:', error);
      alert('Error deleting records');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [startDate, endDate]);

  const formatCurrency = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
      return '—';
    }
    
    const numValue = Number(value);
    
    // For very small values (less than $0.000001), use scientific notation
    if (numValue > 0 && numValue < 0.000001) {
      return `$${numValue.toExponential(2)}`;
    }
    
    // For normal values, use standard currency formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(numValue);
  };

  const formatGwei = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
      return '0.000000 gwei';
    }
    return `${Number(value).toFixed(6)} gwei`;
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getNetworkColor = (network: string): string => {
    const colors: Record<string, string> = {
      'Arbitrum One': '#2D374B',
      'Optimism': '#FF0420',
      'Base': '#0052FF',
      'Polygon PoS': '#8247E5',
      'Linea': '#61DFFF',
      'Scroll': '#FFEEDA',
      'Ink': '#000000',
      'zkSync Era': '#8C8DFC',
    };
    return colors[network] || '#3B82F6';
  };

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (loading && records.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading gas monitoring data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
        <div className="flex gap-2 items-center">
          <div className="flex-shrink-0">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-gray-800/50 border-gray-700 text-gray-300 h-9 w-40 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={thirtyDaysAgo}
            />
          </div>
          <span className="text-gray-500">to</span>
          <div className="flex-shrink-0">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-gray-800/50 border-gray-700 text-gray-300 h-9 w-40 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={today}
            />
          </div>
          <Button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            variant="ghost"
            size="sm"
            className="text-gray-400 h-9"
          >
            Clear
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchRecords}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-gray-600 hover:border-gray-500"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={fetchAllRecords}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-yellow-600 hover:border-yellow-500 text-yellow-400"
          >
            <Database className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Show All
          </Button>
          <Button
            onClick={() => setViewMode(viewMode === 'grouped' ? 'flat' : 'grouped')}
            variant="outline"
            size="sm"
            className="border-purple-600 hover:border-purple-500 text-purple-400"
          >
            <Activity className="w-4 h-4 mr-2" />
            {viewMode === 'grouped' ? 'Flat View' : 'Grouped View'}
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
            <Database className="w-5 h-5 text-blue-400" />
            Gas Monitoring Records
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {(viewMode === 'grouped' ? groupedRecords.length === 0 : records.length === 0) ? (
            <div className="text-center py-8 text-gray-400">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No gas monitoring data found</p>
              <p className="text-sm mt-1">Try adjusting your filters or check if data has been stored</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    {viewMode === 'grouped' && <TableHead className="text-gray-300 w-8"></TableHead>}
                    {viewMode === 'grouped' ? (
                      <>
                        <TableHead className="text-gray-300">Timestamp</TableHead>
                        <TableHead className="text-gray-300">Networks</TableHead>
                        <TableHead className="text-gray-300 text-right">Actions</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="text-gray-300">Network</TableHead>
                        <TableHead className="text-gray-300">Type</TableHead>
                        <TableHead className="text-gray-300 text-right">Base Fee (Gwei)</TableHead>
                        <TableHead className="text-gray-300 text-right">Priority Fee (Gwei)</TableHead>
                        <TableHead className="text-gray-300 text-right">Max Fee (Gwei)</TableHead>
                        <TableHead className="text-gray-300 text-right">Tx Cost (USD)</TableHead>
                        <TableHead className="text-gray-300">Timestamp</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewMode === 'grouped' ? (
                    groupedRecords.map((groupedRecord) => (
                      <React.Fragment key={groupedRecord.timestamp}>
                        <TableRow 
                          className="border-gray-700 hover:bg-gray-700/30 cursor-pointer"
                          onClick={() => toggleRowExpansion(groupedRecord.timestamp)}
                        >
                          <TableCell>
                            <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                              {expandedRows.has(groupedRecord.timestamp) ? '▼' : '▶'}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium text-white">
                            {formatTimestamp(groupedRecord.timestamp)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-gray-600 text-gray-300">
                              {groupedRecord.networkCount} networks
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                             <div className="flex gap-1 justify-end">
                               <Button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   exportTimestampToCSV(groupedRecord);
                                 }}
                                 variant="ghost"
                                 size="sm"
                                 className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                                 title="Export CSV"
                               >
                                 <Download className="w-4 h-4" />
                               </Button>
                               <Button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   deleteRecordsByTimestamp(groupedRecord.timestamp);
                                 }}
                                 variant="ghost"
                                 size="sm"
                                 className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                 disabled={isDeleting}
                                 title="Delete Records"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </Button>
                             </div>
                           </TableCell>
                        </TableRow>
                        {expandedRows.has(groupedRecord.timestamp) && (
                          <TableRow className="border-gray-700">
                            <TableCell colSpan={4} className="p-0">
                              <div className="bg-gray-900/50 p-4">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-gray-600">
                                      <TableHead className="text-gray-400 text-sm">Network</TableHead>
                                      <TableHead className="text-gray-400 text-sm">Type</TableHead>
                                      <TableHead className="text-gray-400 text-sm text-right">Base Fee (Gwei)</TableHead>
                                      <TableHead className="text-gray-400 text-sm text-right">Priority Fee (Gwei)</TableHead>
                                      <TableHead className="text-gray-400 text-sm text-right">Max Fee (Gwei)</TableHead>
                                      <TableHead className="text-gray-400 text-sm text-right">Tx Cost (USD)</TableHead>
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
                                        <TableCell className="text-sm text-gray-300">{record.type}</TableCell>
                                        <TableCell className="text-sm text-right text-gray-300 font-mono">
                                          {formatGwei(record.baseFeeGwei)}
                                        </TableCell>
                                        <TableCell className="text-sm text-right text-gray-300 font-mono">
                                          {formatGwei(record.priorityFeeGwei)}
                                        </TableCell>
                                        <TableCell className="text-sm text-right text-gray-300 font-mono">
                                          {formatGwei(record.maxFeeGwei)}
                                        </TableCell>
                                        <TableCell className="text-sm text-right text-white font-mono">
                                          {formatCurrency(record.txCostUsd)}
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
                      <TableRow key={record.id} className="border-gray-700 hover:bg-gray-700/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: getNetworkColor(record.network) }}
                            />
                            <span className="text-white">{record.network}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">{record.type}</TableCell>
                        <TableCell className="text-right text-gray-300 font-mono">
                          {formatGwei(record.baseFeeGwei)}
                        </TableCell>
                        <TableCell className="text-right text-gray-300 font-mono">
                          {formatGwei(record.priorityFeeGwei)}
                        </TableCell>
                        <TableCell className="text-right text-gray-300 font-mono">
                          {formatGwei(record.maxFeeGwei)}
                        </TableCell>
                        <TableCell className="text-right text-white font-mono">
                          {formatCurrency(record.txCostUsd)}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {formatTimestamp(record.timestamp)}
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