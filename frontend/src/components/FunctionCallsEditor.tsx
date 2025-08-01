'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Zap } from 'lucide-react';
import { BenchmarkFunction } from '@/config/contracts';

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

export default function FunctionCallsEditor({
  functionCalls,
  onFunctionCallsChange,
  availableFunctions = [],
  className = ''
}: FunctionCallsEditorProps) {
  
  // Debug: Log when availableFunctions prop changes
  React.useEffect(() => {
    console.log('🎯 FunctionCallsEditor received availableFunctions:', availableFunctions);
    console.log('🎯 Number of available functions:', availableFunctions.length);
  }, [availableFunctions]);
  
  // Debug: Log when functionCalls prop changes
  React.useEffect(() => {
    console.log('🎯 FunctionCallsEditor received functionCalls:', functionCalls);
  }, [functionCalls]);
  const addFunctionCall = () => {
    const newFunctionCall: FunctionCall = {
      functionName: '',
      parameters: []
    };
    onFunctionCallsChange([...functionCalls, newFunctionCall]);
  };

  const removeFunctionCall = (index: number) => {
    const updated = functionCalls.filter((_, i) => i !== index);
    onFunctionCallsChange(updated);
  };

  const updateFunctionCall = (index: number, field: keyof FunctionCall, value: any) => {
    const updated = functionCalls.map((fc, i) => {
      if (i === index) {
        return { ...fc, [field]: value };
      }
      return fc;
    });
    onFunctionCallsChange(updated);
  };

  const updateParameters = (index: number, parametersStr: string) => {
    try {
      const parameters = parametersStr.trim() ? JSON.parse(parametersStr) : [];
      updateFunctionCall(index, 'parameters', parameters);
    } catch (e) {
      // Invalid JSON, keep the string for user to fix
      console.warn('Invalid JSON parameters:', e);
    }
  };

  const getSelectedFunction = (functionName: string) => {
    return availableFunctions.find(func => func.name === functionName);
  };

  const getParameterTypes = (functionName: string) => {
    const func = getSelectedFunction(functionName);
    return func ? func.inputs.map(input => `${input.name}: ${input.type}`).join(', ') : '';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5" />
          Function Calls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {functionCalls.map((functionCall, index) => {
            const selectedFunc = getSelectedFunction(functionCall.functionName);
            const parameterTypes = getParameterTypes(functionCall.functionName);
            return (
              <div key={`${index}-${functionCall.functionName || 'empty'}`} className="flex items-center gap-3 p-3 border border-gray-600 rounded-lg bg-gray-800/50">
                {/* Function Selection */}
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Function</label>
                  {availableFunctions.length > 0 ? (
                    <select
                      value={functionCall.functionName}
                      onChange={(e) => {
                        console.log('🎯 Function selected:', e.target.value);
                        console.log('🎯 Available functions for selection:', availableFunctions.map(f => f.name));
                        updateFunctionCall(index, 'functionName', e.target.value);
                        // Reset parameters when function changes
                        updateFunctionCall(index, 'parameters', []);
                      }}
                      className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select function...</option>
                      {availableFunctions.map((func, funcIndex) => (
                        <option key={`${func.name}-${funcIndex}`} value={func.name}>
                          {func.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={functionCall.functionName}
                      onChange={(e) => updateFunctionCall(index, 'functionName', e.target.value)}
                      placeholder="Function name"
                      className="h-8 text-sm bg-gray-900 border-gray-600 text-gray-100"
                    />
                  )}
                </div>
                
                {/* Parameter Types Display */}
                {parameterTypes && (
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Expected Parameters</label>
                    <div className="px-2 py-1 text-xs bg-gray-900 border border-gray-600 rounded text-gray-300 font-mono">
                      {parameterTypes || 'No parameters'}
                    </div>
                  </div>
                )}
                
                {/* Parameters Input */}
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Parameters {selectedFunc && selectedFunc.inputs.length > 0 && `(${selectedFunc.inputs.map(i => i.type).join(', ')})`}
                  </label>
                  <Input
                    value={JSON.stringify(functionCall.parameters)}
                    onChange={(e) => updateParameters(index, e.target.value)}
                    placeholder={selectedFunc && selectedFunc.inputs.length > 0 
                      ? `[${selectedFunc.inputs.map(input => {
                        switch(input.type) {
                          case 'uint256': case 'uint': case 'int256': case 'int': return '100';
                          case 'address': return '"0x123..."';
                          case 'string': return '"text"';
                          case 'bool': return 'true';
                          case 'bytes': case 'bytes32': return '"0x123..."';
                          default: return '"value"';
                        }
                      }).join(', ')}]`
                      : '[]'
                    }
                    className="h-8 text-sm bg-gray-900 border-gray-600 text-gray-100 font-mono"
                  />
                </div>
                
                {/* Remove Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeFunctionCall(index)}
                  className="h-8 w-8 p-0 text-red-400 hover:text-red-300 border-red-600 hover:border-red-500 flex-shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
          
          <Button
            onClick={addFunctionCall}
            variant="outline"
            className="w-full border-dashed border-gray-600 hover:border-gray-500 text-gray-300 hover:text-gray-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Function Call
          </Button>
          
          {functionCalls.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No function calls configured</p>
              <p className="text-sm">Add function calls to test gas costs</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}