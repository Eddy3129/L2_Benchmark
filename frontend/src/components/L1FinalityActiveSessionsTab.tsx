'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Eye, Square, Activity } from 'lucide-react';
import { MonitoringSession } from './L1FinalityIDE';

interface L1FinalityActiveSessionsTabProps {
  activeSessions: MonitoringSession[];
  stopL1FinalityTracking: (sessionId: string) => Promise<void>;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => string;
  formatTime: (seconds: number) => string;
}

export default function L1FinalityActiveSessionsTab({
  activeSessions,
  stopL1FinalityTracking,
  getStatusColor,
  getStatusIcon,
  formatTime
}: L1FinalityActiveSessionsTabProps) {
  if (activeSessions.length === 0) {
    return (
      <div className="text-center py-12">
        <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No Active Sessions</h3>
        <p className="text-gray-400 mb-6">
          Start monitoring from the configuration tab to track L1 finality in real-time
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {activeSessions.map((session) => {
          const elapsedTime = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
          
          return (
            <Card key={session.sessionId} className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{getStatusIcon(session.status)}</div>
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        {session.l2Network.charAt(0).toUpperCase() + session.l2Network.slice(1)} → {session.l1Network}
                        <Badge variant="outline" className={`${getStatusColor(session.status)} border-current`}>
                          {session.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Session ID: {session.sessionId}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={() => stopL1FinalityTracking(session.sessionId)}
                    variant="destructive"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Elapsed Time</div>
                      <div className="text-lg font-semibold text-white">
                        {formatTime(elapsedTime)}
                      </div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Progress</div>
                      <div className="text-lg font-semibold text-white">
                        {session.progress}%
                      </div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Status</div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
                        <span className="text-blue-400 font-semibold">Monitoring</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                      <span>Monitoring Progress</span>
                      <span>{session.progress}%</span>
                    </div>
                    <Progress 
                      value={session.progress} 
                      className="h-2 bg-gray-700"
                    />
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Started: {new Date(session.startedAt).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}