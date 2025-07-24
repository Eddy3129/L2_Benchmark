'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Zap } from 'lucide-react';

interface FunctionCall {
  functionName: string;
  parameters: any[];
}

interface FunctionCallsEditorProps {
  functionCalls: FunctionCall[];
  onFunctionCallsChange: (functionCalls: FunctionCall[]) => void;
  className?: string;
}

export default function FunctionCallsEditor({
  functionCalls,
  onFunctionCallsChange,
  className = ''
}: FunctionCallsEditorProps) {
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

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5" />
          Function Calls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {functionCalls.map((functionCall, index) => (
            <div key={index} className="p-4 border border-gray-600 rounded-lg bg-gray-800/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-300">
                  Function Call #{index + 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeFunctionCall(index)}
                  className="text-red-400 hover:text-red-300 border-red-600 hover:border-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Function Name
                  </label>
                  <Input
                    value={functionCall.functionName}
                    onChange={(e) => updateFunctionCall(index, 'functionName', e.target.value)}
                    placeholder="e.g., setValue, transfer, mint"
                    className="bg-gray-900 border-gray-600 text-gray-100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Parameters (JSON Array)
                  </label>
                  <Input
                    value={JSON.stringify(functionCall.parameters)}
                    onChange={(e) => updateParameters(index, e.target.value)}
                    placeholder='e.g., [100, "0x123...", true]'
                    className="bg-gray-900 border-gray-600 text-gray-100 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Enter parameters as a JSON array. Use [] for functions with no parameters.
                  </p>
                </div>
              </div>
            </div>
          ))}
          
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