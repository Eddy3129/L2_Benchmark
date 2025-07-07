'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { TreeChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { Loader2, Play, Code, Zap, TrendingUp, AlertTriangle, CheckCircle, FileText, Cpu, BarChart3, Target, Layers, Activity } from 'lucide-react';

interface ContractAnalysisConfig {
  contractName: string;
  solidityCode: string;
  l2Network: string;
  functionName?: string;
  functionParameters?: string;
  analysisType: 'full_contract' | 'specific_function' | 'gas_optimization';
  saveToDatabase: boolean;
}

interface GasBreakdown {
  functionName: string;
  totalGas: number;
  opcodeBreakdown: {
    opcode: string;
    gasUsed: number;
    count: number;
    percentage: number;
  }[];
  callTrace: {
    depth: number;
    functionName: string;
    gasUsed: number;
    gasRemaining: number;
  }[];
  storageAccess: {
    operation: 'SLOAD' | 'SSTORE';
    slot: string;
    gasUsed: number;
  }[];
}

interface ComplexityMetrics {
  cyclomaticComplexity: number;
  codeSize: number;
  stackDepth: number;
  functionCount: number;
  stateVariableCount: number;
  modifierCount: number;
}

interface OptimizationRecommendation {
  type: 'gas_optimization' | 'security' | 'performance';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  codeLocation: {
    line: number;
    column: number;
    function: string;
  };
  estimatedGasSavings?: number;
  recommendation: string;
}

interface ContractAnalysisResult {
  sessionId: string;
  contractName: string;
  functionName?: string;
  l2Network: string;
  transactionHash?: string;
  gasBreakdown: GasBreakdown;
  complexityMetrics: ComplexityMetrics;
  optimizationRecommendations: OptimizationRecommendation[];
  networkSpecificAnalysis: {
    totalExecutionCostETH: string;
    totalExecutionCostUSD: number;
    gasPrice: string;
    baseFee: string;
    priorityFee: string;
  };
  createdAt: string;
}

interface NetworkComparison {
  network: string;
  gasUsed: number;
  executionCostETH: string;
  executionCostUSD: number;
  gasPrice: string;
  performanceScore: number;
}

const NETWORK_OPTIONS = [
  { value: 'arbitrum-sepolia', label: 'Arbitrum Sepolia' },
  { value: 'optimism-sepolia', label: 'Optimism Sepolia' },
  { value: 'base-sepolia', label: 'Base Sepolia' },
  { value: 'polygon-zkevm-testnet', label: 'Polygon zkEVM Testnet' },
  { value: 'scroll-sepolia', label: 'Scroll Sepolia' },
  { value: 'linea-sepolia', label: 'Linea Sepolia' }
];

const ANALYSIS_TYPES = [
  { value: 'full_contract', label: 'Full Contract Analysis', description: 'Comprehensive analysis of entire contract' },
  { value: 'specific_function', label: 'Function-Specific Analysis', description: 'Deep dive into specific function execution' },
  { value: 'gas_optimization', label: 'Gas Optimization Focus', description: 'Identify gas optimization opportunities' }
];

const SAMPLE_CONTRACTS = {
  'ERC20Token': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;
    
    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
        _totalSupply = 1000000 * 10**18;
        _balances[msg.sender] = _totalSupply;
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        address owner = msg.sender;
        _transfer(owner, to, amount);
        return true;
    }
    
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        
        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
        
        unchecked {
            _balances[from] = fromBalance - amount;
            _balances[to] += amount;
        }
    }
    
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }
}`,
  'SimpleSwap': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleSwap {
    mapping(address => uint256) public tokenABalance;
    mapping(address => uint256) public tokenBBalance;
    
    uint256 public reserveA;
    uint256 public reserveB;
    uint256 public constant FEE = 3; // 0.3%
    
    function addLiquidity(uint256 amountA, uint256 amountB) external {
        tokenABalance[msg.sender] += amountA;
        tokenBBalance[msg.sender] += amountB;
        reserveA += amountA;
        reserveB += amountB;
    }
    
    function swapAForB(uint256 amountAIn) external {
        require(amountAIn > 0, "Amount must be greater than 0");
        require(tokenABalance[msg.sender] >= amountAIn, "Insufficient balance");
        
        uint256 amountAInWithFee = amountAIn * (1000 - FEE);
        uint256 numerator = amountAInWithFee * reserveB;
        uint256 denominator = (reserveA * 1000) + amountAInWithFee;
        uint256 amountBOut = numerator / denominator;
        
        require(amountBOut > 0, "Insufficient output amount");
        require(reserveB >= amountBOut, "Insufficient liquidity");
        
        tokenABalance[msg.sender] -= amountAIn;
        tokenBBalance[msg.sender] += amountBOut;
        
        reserveA += amountAIn;
        reserveB -= amountBOut;
    }
    
    function getAmountOut(uint256 amountIn) external view returns (uint256) {
        require(amountIn > 0, "Amount must be greater than 0");
        
        uint256 amountInWithFee = amountIn * (1000 - FEE);
        uint256 numerator = amountInWithFee * reserveB;
        uint256 denominator = (reserveA * 1000) + amountInWithFee;
        
        return numerator / denominator;
    }
}`
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

export default function ContractProfilingPage() {
  const [analysisConfig, setAnalysisConfig] = useState<ContractAnalysisConfig>({
    contractName: '',
    solidityCode: '',
    l2Network: '',
    functionName: '',
    functionParameters: '',
    analysisType: 'full_contract',
    saveToDatabase: true
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<ContractAnalysisResult | null>(null);
  const [comparisonResults, setComparisonResults] = useState<NetworkComparison[]>([]);
  const [historicalData, setHistoricalData] = useState<ContractAnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState<string>('');

  useEffect(() => {
    fetchHistoricalData();
  }, []);

  const fetchHistoricalData = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/advanced-analysis/contract-complexity/history?limit=20');
      if (response.ok) {
        const data = await response.json();
        setHistoricalData(data);
      }
    } catch (err) {
      console.error('Failed to fetch historical data:', err);
    }
  };

  const loadSampleContract = (sampleName: string) => {
    if (sampleName && SAMPLE_CONTRACTS[sampleName as keyof typeof SAMPLE_CONTRACTS]) {
      setAnalysisConfig(prev => ({
        ...prev,
        contractName: sampleName,
        solidityCode: SAMPLE_CONTRACTS[sampleName as keyof typeof SAMPLE_CONTRACTS]
      }));
      setSelectedSample(sampleName);
    }
  };

  const analyzeContract = async () => {
    if (!analysisConfig.contractName || !analysisConfig.solidityCode || !analysisConfig.l2Network) {
      setError('Please fill in all required fields');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/advanced-analysis/contract-complexity/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisConfig),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze contract');
      }

      const result = await response.json();
      setAnalysisResults(result);
      fetchHistoricalData();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const compareAcrossNetworks = async () => {
    if (!analysisConfig.contractName || !analysisConfig.solidityCode) {
      setError('Please provide contract name and code for comparison');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/advanced-analysis/contract-complexity/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractName: analysisConfig.contractName,
          solidityCode: analysisConfig.solidityCode,
          functionName: analysisConfig.functionName,
          functionParameters: analysisConfig.functionParameters,
          networks: NETWORK_OPTIONS.map(n => n.value)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to compare across networks');
      }

      const result = await response.json();
      setComparisonResults(result);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-500 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-500 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-500 bg-blue-50 border-blue-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'gas_optimization': return <Zap className="w-4 h-4" />;
      case 'security': return <AlertTriangle className="w-4 h-4" />;
      case 'performance': return <TrendingUp className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Smart Contract Complexity Profiling
        </h1>
        <p className="text-gray-400 max-w-3xl mx-auto">
          Deep dive into smart contract gas consumption with line-by-line analysis, 
          opcode profiling, and optimization recommendations for L2 networks.
        </p>
      </div>

      <Tabs defaultValue="analyze" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analyze">Analyze Contract</TabsTrigger>
          <TabsTrigger value="results">Analysis Results</TabsTrigger>
          <TabsTrigger value="compare">Network Comparison</TabsTrigger>
          <TabsTrigger value="history">Analysis History</TabsTrigger>
        </TabsList>

        {/* Analyze Tab */}
        <TabsContent value="analyze" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🔬</span>
                Contract Analysis Configuration
              </CardTitle>
              <CardDescription>
                Configure smart contract complexity analysis parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="contractName">Contract Name</Label>
                  <Input
                    id="contractName"
                    value={analysisConfig.contractName}
                    onChange={(e) => setAnalysisConfig(prev => ({ ...prev, contractName: e.target.value }))}
                    placeholder="e.g., MyToken, SimpleSwap"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="l2Network">L2 Network</Label>
                  <Select
                    value={analysisConfig.l2Network}
                    onValueChange={(value) => setAnalysisConfig(prev => ({ ...prev, l2Network: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select L2 network" />
                    </SelectTrigger>
                    <SelectContent>
                      {NETWORK_OPTIONS.map((network) => (
                        <SelectItem key={network.value} value={network.value}>
                          {network.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="analysisType">Analysis Type</Label>
                  <Select
                    value={analysisConfig.analysisType}
                    onValueChange={(value: any) => setAnalysisConfig(prev => ({ ...prev, analysisType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANALYSIS_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-gray-500">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sampleContract">Load Sample Contract</Label>
                  <Select
                    value={selectedSample}
                    onValueChange={loadSampleContract}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a sample contract" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ERC20Token">ERC20 Token</SelectItem>
                      <SelectItem value="SimpleSwap">Simple Swap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {analysisConfig.analysisType === 'specific_function' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="functionName">Function Name</Label>
                    <Input
                      id="functionName"
                      value={analysisConfig.functionName}
                      onChange={(e) => setAnalysisConfig(prev => ({ ...prev, functionName: e.target.value }))}
                      placeholder="e.g., transfer, swap"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="functionParameters">Function Parameters (JSON)</Label>
                    <Input
                      id="functionParameters"
                      value={analysisConfig.functionParameters}
                      onChange={(e) => setAnalysisConfig(prev => ({ ...prev, functionParameters: e.target.value }))}
                      placeholder='["0x123...", "1000"]'
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="solidityCode">Solidity Code</Label>
                <Textarea
                  id="solidityCode"
                  value={analysisConfig.solidityCode}
                  onChange={(e) => setAnalysisConfig(prev => ({ ...prev, solidityCode: e.target.value }))}
                  placeholder="Paste your Solidity contract code here..."
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={analyzeContract}
                  disabled={isAnalyzing || !analysisConfig.contractName || !analysisConfig.solidityCode || !analysisConfig.l2Network}
                  className="flex-1"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing Contract...
                    </>
                  ) : (
                    <>
                      <Code className="mr-2 h-4 w-4" />
                      Analyze Contract
                    </>
                  )}
                </Button>

                <Button
                  onClick={compareAcrossNetworks}
                  disabled={isAnalyzing || !analysisConfig.contractName || !analysisConfig.solidityCode}
                  variant="outline"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Comparing...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Compare Networks
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          {!analysisResults ? (
            <Card>
              <CardContent className="text-center py-8">
                <Code className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No analysis results yet. Run a contract analysis to see detailed profiling data.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Gas Used</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {analysisResults.gasBreakdown.totalGas.toLocaleString()}
                      </span>
                      <Zap className="w-4 h-4 text-yellow-500" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Gas units consumed
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Execution Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        ${analysisResults.networkSpecificAnalysis.totalExecutionCostUSD.toFixed(4)}
                      </span>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {parseFloat(analysisResults.networkSpecificAnalysis.totalExecutionCostETH).toFixed(6)} ETH
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Complexity Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {analysisResults.complexityMetrics.cyclomaticComplexity}
                      </span>
                      <Cpu className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Cyclomatic complexity
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Optimizations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-orange-500">
                        {analysisResults.optimizationRecommendations.length}
                      </span>
                      <Target className="w-4 h-4 text-orange-500" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Recommendations found
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Gas Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Opcode Gas Breakdown</CardTitle>
                    <CardDescription>Gas consumption by EVM opcodes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analysisResults.gasBreakdown.opcodeBreakdown.slice(0, 8)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ opcode, percentage }) => `${opcode} (${percentage.toFixed(1)}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="gasUsed"
                          >
                            {analysisResults.gasBreakdown.opcodeBreakdown.slice(0, 8).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [value, 'Gas Used']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Storage Access Patterns</CardTitle>
                    <CardDescription>SLOAD and SSTORE operations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          {
                            operation: 'SLOAD',
                            count: analysisResults.gasBreakdown.storageAccess.filter(s => s.operation === 'SLOAD').length,
                            totalGas: analysisResults.gasBreakdown.storageAccess.filter(s => s.operation === 'SLOAD').reduce((sum, s) => sum + s.gasUsed, 0)
                          },
                          {
                            operation: 'SSTORE',
                            count: analysisResults.gasBreakdown.storageAccess.filter(s => s.operation === 'SSTORE').length,
                            totalGas: analysisResults.gasBreakdown.storageAccess.filter(s => s.operation === 'SSTORE').reduce((sum, s) => sum + s.gasUsed, 0)
                          }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="operation" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#3b82f6" name="Operation Count" />
                          <Bar dataKey="totalGas" fill="#10b981" name="Total Gas" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Complexity Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Contract Complexity Metrics</CardTitle>
                  <CardDescription>Detailed complexity analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">
                        {analysisResults.complexityMetrics.cyclomaticComplexity}
                      </div>
                      <div className="text-sm text-gray-500">Cyclomatic Complexity</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        {analysisResults.complexityMetrics.codeSize}
                      </div>
                      <div className="text-sm text-gray-500">Code Size (bytes)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-500">
                        {analysisResults.complexityMetrics.stackDepth}
                      </div>
                      <div className="text-sm text-gray-500">Max Stack Depth</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-500">
                        {analysisResults.complexityMetrics.functionCount}
                      </div>
                      <div className="text-sm text-gray-500">Function Count</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">
                        {analysisResults.complexityMetrics.stateVariableCount}
                      </div>
                      <div className="text-sm text-gray-500">State Variables</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-500">
                        {analysisResults.complexityMetrics.modifierCount}
                      </div>
                      <div className="text-sm text-gray-500">Modifiers</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Optimization Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Optimization Recommendations</CardTitle>
                  <CardDescription>Actionable insights to improve gas efficiency</CardDescription>
                </CardHeader>
                <CardContent>
                  {analysisResults.optimizationRecommendations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      No optimization recommendations found. Your contract is well-optimized!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analysisResults.optimizationRecommendations.map((rec, index) => (
                        <div key={index} className={`border rounded-lg p-4 ${getSeverityColor(rec.severity)}`}>
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              {getTypeIcon(rec.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{rec.title}</h4>
                                <Badge variant="outline" className={getSeverityColor(rec.severity)}>
                                  {rec.severity}
                                </Badge>
                                <Badge variant="secondary">{rec.type}</Badge>
                              </div>
                              <p className="text-sm mb-2">{rec.description}</p>
                              <div className="text-xs text-gray-600 mb-2">
                                Location: {rec.codeLocation.function} (Line {rec.codeLocation.line}, Column {rec.codeLocation.column})
                              </div>
                              <div className="bg-white dark:bg-gray-800 rounded p-2 text-sm">
                                <strong>Recommendation:</strong> {rec.recommendation}
                              </div>
                              {rec.estimatedGasSavings && (
                                <div className="mt-2 text-sm font-medium text-green-600">
                                  Estimated Gas Savings: {rec.estimatedGasSavings.toLocaleString()} gas
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Compare Tab */}
        <TabsContent value="compare" className="space-y-6">
          {comparisonResults.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No comparison data yet. Run a network comparison to see cross-chain analysis.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Network Performance Comparison</CardTitle>
                  <CardDescription>Gas costs and execution efficiency across L2 networks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonResults}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="network" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="gasUsed" fill="#3b82f6" name="Gas Used" />
                        <Bar dataKey="executionCostUSD" fill="#10b981" name="Cost (USD)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {comparisonResults.map((result, index) => (
                  <Card key={result.network}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{NETWORK_OPTIONS.find(n => n.value === result.network)?.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Gas Used:</span>
                        <span className="font-medium">{result.gasUsed.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Cost (ETH):</span>
                        <span className="font-medium">{parseFloat(result.executionCostETH).toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Cost (USD):</span>
                        <span className="font-medium">${result.executionCostUSD.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Gas Price:</span>
                        <span className="font-medium">{parseFloat(result.gasPrice).toFixed(2)} gwei</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Performance:</span>
                        <div className="flex items-center gap-2">
                          <Progress value={result.performanceScore} className="w-16" />
                          <span className="text-sm font-medium">{result.performanceScore}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analysis History</CardTitle>
              <CardDescription>Previous contract complexity analyses</CardDescription>
            </CardHeader>
            <CardContent>
              {historicalData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No historical analysis data available. Complete contract analyses to see history.
                </div>
              ) : (
                <div className="space-y-4">
                  {historicalData.map((analysis) => (
                    <div key={analysis.sessionId} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{analysis.contractName}</Badge>
                            <Badge variant="secondary">{analysis.l2Network}</Badge>
                            {analysis.functionName && (
                              <Badge variant="outline">{analysis.functionName}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(analysis.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            ${analysis.networkSpecificAnalysis.totalExecutionCostUSD.toFixed(4)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {analysis.gasBreakdown.totalGas.toLocaleString()} gas
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Complexity</div>
                          <div>{analysis.complexityMetrics.cyclomaticComplexity}</div>
                        </div>
                        <div>
                          <div className="font-medium">Functions</div>
                          <div>{analysis.complexityMetrics.functionCount}</div>
                        </div>
                        <div>
                          <div className="font-medium">Optimizations</div>
                          <div className="text-orange-500">{analysis.optimizationRecommendations.length}</div>
                        </div>
                        <div>
                          <div className="font-medium">Code Size</div>
                          <div>{analysis.complexityMetrics.codeSize} bytes</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {historicalData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Gas Usage Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historicalData.slice(-10).map((analysis, index) => ({
                      analysis: index + 1,
                      gasUsed: analysis.gasBreakdown.totalGas,
                      costUSD: analysis.networkSpecificAnalysis.totalExecutionCostUSD,
                      complexity: analysis.complexityMetrics.cyclomaticComplexity,
                      optimizations: analysis.optimizationRecommendations.length
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="analysis" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="gasUsed" stroke="#3b82f6" name="Gas Used" />
                      <Line type="monotone" dataKey="costUSD" stroke="#10b981" name="Cost (USD)" />
                      <Line type="monotone" dataKey="complexity" stroke="#f59e0b" name="Complexity" />
                      <Line type="monotone" dataKey="optimizations" stroke="#ef4444" name="Optimizations" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}