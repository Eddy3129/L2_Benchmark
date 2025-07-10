'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Activity, AlertCircle, Shield, Settings } from 'lucide-react';

interface SequencerTestConfigTabProps {
  config: {
    targetNetwork: string;
    testType: string;
    transactionCount: number;
    minFeePerGas: number;
    maxFeePerGas: number;
  };
  setConfig: (config: any) => void;
  networkOptions: { value: string; label: string }[];
  testTypes: { value: string; label: string }[];
  error: string | null;
  startTest: () => void;
  isRunning: boolean;
  testHistory: any[];
}

export default function SequencerTestConfigTab({
  config,
  setConfig,
  networkOptions,
  testTypes,
  error,
  startTest,
  isRunning,
  testHistory
}: SequencerTestConfigTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <CardTitle className="text-white">Network Selection</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Select 
                value={config.targetNetwork} 
                onValueChange={(value) => setConfig(prev => ({ ...prev, targetNetwork: value }))}
              >
                <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select target network" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {networkOptions.map((network) => (
                    <SelectItem key={network.value} value={network.value}>
                      {network.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-green-400" />
                <CardTitle className="text-white">Test Configuration</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Test Type</label>
                  <Select 
                    value={config.testType} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, testType: value }))}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {testTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Transaction Count</label>
                  <Input
                    type="number"
                    value={config.transactionCount}
                    onChange={(e) => setConfig(prev => ({ ...prev, transactionCount: Number(e.target.value) }))}
                    min="1"
                    max="1000"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Min Fee Per Gas (Gwei)</label>
                  <Input
                    type="number"
                    value={config.minFeePerGas}
                    onChange={(e) => setConfig(prev => ({ ...prev, minFeePerGas: Number(e.target.value) }))}
                    min="1"
                    step="0.1"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Max Fee Per Gas (Gwei)</label>
                  <Input
                    type="number"
                    value={config.maxFeePerGas}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxFeePerGas: Number(e.target.value) }))}
                    min="1"
                    step="0.1"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
              {error && (
                <Alert variant="destructive" className="bg-red-900/20 border-red-700/30">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-300">{error}</AlertDescription>
                </Alert>
              )}
              <Button 
                onClick={startTest} 
                disabled={isRunning || !config.targetNetwork}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Activity className="w-4 h-4 mr-2 animate-pulse" />
                    Running Test...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Sequencer Test
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-white">{testHistory?.length || 0}</div>
                  <div className="text-xs text-gray-400">Tests Run</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white capitalize">{config.targetNetwork || 'None'}</div>
                  <div className="text-xs text-gray-400">Target Network</div>
                </div>
                <div>
                  <Badge variant={isRunning ? "default" : "secondary"}>
                    {isRunning ? 'Running' : 'Idle'}
                  </Badge>
                  <div className="text-xs text-gray-400 mt-1">Status</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}