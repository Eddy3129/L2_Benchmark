import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Zap, Info, Copy, Play, Settings, ChevronDown, ChevronUp } from 'lucide-react';

interface BenchmarkFunction {
  name: string;
  inputs: {
    name: string;
    type: string;
  }[];
}

interface FunctionCall {
  functionName: string;
  parameters: any[];
}

interface FunctionCallsEditorProps {
  functionCalls: FunctionCall[];
  onFunctionCallsChange: (functionCalls: FunctionCall[]) => void;
  availableFunctions?: BenchmarkFunction[];
  className?: string;
}

const COMMON_ADDRESSES = {
  deployer: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  user1: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  user2: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  zero: '0x0000000000000000000000000000000000000000'
};

const PRESET_VALUES = {
  minimal: { uint: 1, wei: '1000000000000000' }, // 0.001 ETH
  standard: { uint: 100, wei: '100000000000000000' }, // 0.1 ETH
  stress: { uint: 10000, wei: '1000000000000000000' } // 1 ETH
};

const PRESET_DESCRIPTIONS = {
  minimal: 'Minimal gas usage for basic testing',
  standard: 'Standard values for typical operations', 
  stress: 'Large values for stress testing'
};

export default function ImprovedFunctionCallsEditor({
  functionCalls,
  onFunctionCallsChange,
  availableFunctions = [],
  className = ''
}: FunctionCallsEditorProps) {
  
  const [expandedCalls, setExpandedCalls] = useState<Set<number>>(new Set());
  const [presetMode, setPresetMode] = useState<'minimal' | 'standard' | 'stress'>('standard');

  // Auto-expand new function calls
  useEffect(() => {
    if (functionCalls.length > 0) {
      const lastIndex = functionCalls.length - 1;
      setExpandedCalls(prev => new Set([...prev, lastIndex]));
    }
  }, [functionCalls.length]);

  const toggleExpanded = (index: number) => {
    setExpandedCalls(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getDefaultValueForType = (type: string, paramName: string = ''): any => {
    const lowerName = paramName.toLowerCase();
    const lowerType = type.toLowerCase();
    
    // Address types
    if (lowerType.includes('address')) {
      if (lowerName.includes('to') || lowerName.includes('recipient')) {
        return COMMON_ADDRESSES.user1;
      }
      return COMMON_ADDRESSES.deployer;
    }
    
    // Numeric types
    if (lowerType.includes('uint') || lowerType.includes('int')) {
      if (lowerName.includes('amount') || lowerName.includes('value')) {
        return PRESET_VALUES[presetMode].uint;
      }
      if (lowerName.includes('price') || lowerName.includes('wei')) {
        return PRESET_VALUES[presetMode].wei;
      }
      if (lowerName.includes('id') || lowerName.includes('index')) {
        return 1;
      }
      if (lowerName.includes('time') || lowerName.includes('duration')) {
        return 3600; // 1 hour
      }
      return PRESET_VALUES[presetMode].uint;
    }
    
    // Boolean
    if (lowerType === 'bool') {
      return true;
    }
    
    // String
    if (lowerType === 'string') {
      if (lowerName.includes('name')) return 'TestName';
      if (lowerName.includes('symbol')) return 'TEST';
      if (lowerName.includes('uri') || lowerName.includes('url')) return 'https://example.com/metadata';
      return 'test';
    }
    
    // Bytes
    if (lowerType.includes('bytes')) {
      return '0x1234567890abcdef';
    }
    
    return '';
  };

  const addFunctionCall = () => {
    const newFunctionCall: FunctionCall = {
      functionName: '',
      parameters: []
    };
    const newCalls = [...functionCalls, newFunctionCall];
    onFunctionCallsChange(newCalls);
  };

  const removeFunctionCall = (index: number) => {
    const updated = functionCalls.filter((_, i) => i !== index);
    onFunctionCallsChange(updated);
    
    // Clean up expanded state
    setExpandedCalls(prev => {
      const newSet = new Set();
      prev.forEach(i => {
        if (i < index) newSet.add(i);
        else if (i > index) newSet.add(i - 1);
      });
      return newSet;
    });
  };

  const updateFunctionName = (index: number, functionName: string) => {
    const selectedFunc = availableFunctions.find(f => f.name === functionName);
    const defaultParams = selectedFunc ? selectedFunc.inputs.map(input => 
      getDefaultValueForType(input.type, input.name)
    ) : [];
    
    const updated = [...functionCalls];
    updated[index] = {
      functionName,
      parameters: defaultParams
    };
    onFunctionCallsChange(updated);
  };

  const updateParameter = (functionIndex: number, paramIndex: number, value: string) => {
    const updated = [...functionCalls];
    const functionCall = updated[functionIndex];
    const selectedFunc = availableFunctions.find(f => f.name === functionCall.functionName);
    
    if (selectedFunc && selectedFunc.inputs[paramIndex]) {
      const inputType = selectedFunc.inputs[paramIndex].type;
      let parsedValue: any = value;
      
      // Parse based on type
      if (inputType.includes('uint') || inputType.includes('int')) {
        parsedValue = value === '' ? 0 : (isNaN(Number(value)) ? 0 : Number(value));
      } else if (inputType === 'bool') {
        parsedValue = value.toLowerCase() === 'true' || value === '1' || value === 'yes';
      } else if (inputType === 'address') {
        parsedValue = value.startsWith('0x') ? value : (value ? `0x${value}` : value);
      } else {
        parsedValue = value; // string, bytes, etc.
      }
      
      functionCall.parameters[paramIndex] = parsedValue;
      onFunctionCallsChange(updated);
    }
  };

  const duplicateFunctionCall = (index: number) => {
    const callToDuplicate = functionCalls[index];
    const duplicated = {
      ...callToDuplicate,
      parameters: [...callToDuplicate.parameters]
    };
    const updated = [...functionCalls];
    updated.splice(index + 1, 0, duplicated);
    onFunctionCallsChange(updated);
  };

  const getPlaceholder = (inputType: string, inputName: string) => {
    const defaultValue = getDefaultValueForType(inputType, inputName);
    switch(inputType) {
      case 'uint256': case 'uint': case 'int256': case 'int': 
        return `${defaultValue} (number)`;
      case 'address': 
        return `${defaultValue} (wallet address)`;
      case 'string': 
        return `"${defaultValue}" (text)`;
      case 'bool': 
        return `${defaultValue} (true/false)`;
      case 'bytes': case 'bytes32': 
        return `${defaultValue} (hex data)`;
      default: 
        return `Enter ${inputType} value`;
    }
  };

  const getTypeIcon = (inputType: string) => {
    switch(inputType) {
      case 'uint256': case 'uint': case 'int256': case 'int': 
        return '🔢';
      case 'address': 
        return '📍';
      case 'string': 
        return '📝';
      case 'bool': 
        return '✅';
      case 'bytes': case 'bytes32': 
        return '🔗';
      default: 
        return '📋';
    }
  };

  const formatPreview = (functionCall: FunctionCall) => {
    if (!functionCall.functionName) return '';
    
    const formattedParams = functionCall.parameters.map((param, i) => {
      if (typeof param === 'string' && !param.startsWith('0x') && param !== 'true' && param !== 'false') {
        return `"${param}"`;
      }
      return String(param);
    }).join(', ');
    
    return `${functionCall.functionName}(${formattedParams})`;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-purple-400" />
            Function Calls
            {functionCalls.length > 0 && (
              <span className="text-sm font-normal text-gray-400">
                ({functionCalls.length} configured)
              </span>
            )}
          </CardTitle>
          
          {availableFunctions.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={presetMode}
                onChange={(e) => setPresetMode(e.target.value as any)}
                className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded text-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                title={PRESET_DESCRIPTIONS[presetMode]}
              >
                <option value="minimal">Minimal</option>
                <option value="standard">Standard</option>
                <option value="stress">Stress Test</option>
              </select>
            
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {functionCalls.map((functionCall, index) => {
            const selectedFunc = availableFunctions.find(f => f.name === functionCall.functionName);
            const isExpanded = expandedCalls.has(index);
            
            return (
              <div key={index} className="border border-gray-600 rounded-lg bg-gray-800/30 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(index)}
                      className="p-1 h-8 w-8"
                    >
                      {isExpanded ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                      }
                    </Button>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-gray-400">#{index + 1}</span>
                        {availableFunctions.length > 0 ? (
                          <select
                            value={functionCall.functionName}
                            onChange={(e) => updateFunctionName(index, e.target.value)}
                            className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">Choose function...</option>
                            {availableFunctions.map((func, index) => {
                              // Create unique key by combining function name with parameter types
                              const paramTypes = func.inputs.map(input => input.type).join(',');
                              const uniqueKey = `${func.name}-${paramTypes}-${index}`;
                              
                              return (
                                <option key={uniqueKey} value={func.name}>
                                  {func.name}({func.inputs.length} params)
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <div className="px-2 py-1 bg-gray-900 border border-gray-600 rounded text-gray-400 text-sm">
                            Deploy contract first
                          </div>
                        )}
                      </div>
                      
                      {functionCall.functionName && (
                        <div className="font-mono text-xs text-green-400 bg-gray-900/50 px-2 py-1 rounded">
                          {formatPreview(functionCall)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateFunctionCall(index)}
                        className="p-1 h-8 w-8 text-blue-400 hover:text-blue-300"
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFunctionCall(index)}
                        className="p-1 h-8 w-8 text-red-400 hover:text-red-300"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Parameters (expandable) */}
                {isExpanded && selectedFunc && selectedFunc.inputs.length > 0 && (
                  <div className="p-4 space-y-3 bg-gray-800/20">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                      <Info className="h-4 w-4" />
                      <span>Configure {selectedFunc.inputs.length} parameter{selectedFunc.inputs.length !== 1 ? 's' : ''}:</span>
                    </div>
                    
                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedFunc.inputs.map((input, paramIndex) => (
                        <div key={paramIndex} className="space-y-1">
                          <label className="block text-sm font-medium text-gray-300">
                            <span className="mr-2">{getTypeIcon(input.type)}</span>
                            {input.name || `param${paramIndex + 1}`}
                            <span className="text-xs text-gray-500 ml-2">({input.type})</span>
                          </label>
                          
                          <div className="relative">
                            <Input
                              value={functionCall.parameters[paramIndex] ?? ''}
                              onChange={(e) => updateParameter(index, paramIndex, e.target.value)}
                              placeholder={getPlaceholder(input.type, input.name)}
                              className="bg-gray-900 border-gray-600 text-gray-100 focus:ring-purple-500 focus:border-purple-500 pr-10"
                            />
                            
                            {/* Quick preset buttons for common types */}
                            {(input.type === 'address') && (
                              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                <select
                                  onChange={(e) => updateParameter(index, paramIndex, e.target.value)}
                                  className="bg-transparent text-xs text-gray-400 border-none outline-none cursor-pointer"
                                  defaultValue=""
                                >
                                  <option value="">🎯</option>
                                  <option value={COMMON_ADDRESSES.deployer}>Deployer</option>
                                  <option value={COMMON_ADDRESSES.user1}>User1</option>
                                  <option value={COMMON_ADDRESSES.user2}>User2</option>
                                  <option value={COMMON_ADDRESSES.zero}>Zero</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {isExpanded && selectedFunc && selectedFunc.inputs.length === 0 && (
                  <div className="p-4 text-center text-gray-400 text-sm bg-gray-800/20">
                    <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    This function takes no parameters - ready to execute!
                  </div>
                )}
              </div>
            );
          })}
          
          <Button
            onClick={addFunctionCall}
            variant="outline"
            className="w-full border-dashed border-gray-600 hover:border-purple-500 text-gray-300 hover:text-purple-300 py-8"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Function Call
          </Button>
          
          {functionCalls.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Zap className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">No Function Calls Yet</h3>
              <p className="text-sm mb-4">Add function calls to test gas costs and execution</p>
              <div className="text-xs text-gray-500 space-y-1 max-w-md mx-auto">
                <p>💡 Deploy a contract first, then functions will appear automatically</p>
                <p>🚀 Smart defaults will be filled based on parameter names and types</p>
                <p>⚡ Use presets to quickly add common function combinations</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}