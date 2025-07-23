'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Play, AlertTriangle } from 'lucide-react';
import { L1FinalityConfig } from './L1FinalityIDE';

interface L1FinalityMonitorTabProps {
  trackingConfig: L1FinalityConfig;
  setTrackingConfig: React.Dispatch<React.SetStateAction<L1FinalityConfig>>;
  isMonitoring: boolean;
  error: string | null;
  startL1FinalityTracking: () => Promise<void>;
  networkOptions: Array<{
    value: string;
    label: string;
    l1: string;
  }>;
}

export default function L1FinalityMonitorTab({
  trackingConfig,
  setTrackingConfig,
  isMonitoring,
  error,
  startL1FinalityTracking,
  networkOptions
}: L1FinalityMonitorTabProps) {
  return (
    <div className="space-y-6">
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-teal-400" />
            <CardTitle className="text-white">L1 Finality Tracking Configuration</CardTitle>
          </div>
          <CardDescription className="text-gray-400">
            Configure monitoring parameters for L2 batch settlement tracking on Ethereum L1
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="l2Network" className="text-gray-300 mb-2 block">
                  L2 Network
                </Label>
                <Select 
                  value={trackingConfig.l2Network} 
                  onValueChange={(value) => setTrackingConfig(prev => ({ ...prev, l2Network: value }))}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select L2 network to monitor" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {networkOptions.map((network) => (
                      <SelectItem key={network.value} value={network.value} className="text-white hover:bg-gray-600">
                        {network.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="l1Network" className="text-gray-300 mb-2 block">
                  L1 Network
                </Label>
                <div className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white">
                  {trackingConfig.l1Network || 'Auto-selected based on L2 network'}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="duration" className="text-gray-300 mb-2 block">
                  Monitoring Duration (hours)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="168"
                  value={trackingConfig.monitoringDurationHours}
                  onChange={(e) => setTrackingConfig(prev => ({ 
                    ...prev, 
                    monitoringDurationHours: parseInt(e.target.value) || 24 
                  }))}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="saveToDatabase"
                  checked={trackingConfig.saveToDatabase}
                  onChange={(e) => setTrackingConfig(prev => ({ 
                    ...prev, 
                    saveToDatabase: e.target.checked 
                  }))}
                  className="rounded border-gray-600 bg-gray-700 text-teal-500 focus:ring-teal-500"
                />
                <Label htmlFor="saveToDatabase" className="text-gray-300">
                  Save results to database
                </Label>
              </div>
            </div>
          </div>

          {trackingConfig.batchPosterAddresses && (
            <div>
              <Label className="text-gray-300 mb-2 block">
                Batch Poster Addresses (Auto-configured)
              </Label>
              <div className="bg-gray-700 border border-gray-600 rounded-md p-3">
                {trackingConfig.batchPosterAddresses.map((address, index) => (
                  <div key={index} className="text-sm text-gray-300 font-mono">
                    {address}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="bg-red-900/20 border-red-700/30">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={startL1FinalityTracking}
            disabled={isMonitoring || !trackingConfig.l2Network}
            className="w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 disabled:opacity-50"
            size="lg"
          >
            {isMonitoring ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Starting L1 Finality Tracking...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start L1 Finality Tracking
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}