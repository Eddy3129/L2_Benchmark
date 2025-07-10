'use client';

import React from 'react';
import Editor from '@monaco-editor/react';
import { NetworkConfidenceSelector } from './NetworkConfidenceSelector';
import { CONTRACT_TEMPLATES, loadContractTemplate } from '@/lib/contractTemplate';
import {
  Code,
  Settings,
  FileText,
  Save
} from 'lucide-react';
import { AnalysisProgress } from '@/types/shared';

interface AnalysisResult {
  contractName: string;
  compilation: any;
  results: any[];
  timestamp: string;
  totalOperations: number;
  avgGasUsed: number;
  avgExecutionTime: number;
  id?: number;
  createdAt?: string;
}

interface ContractEditorTabProps {
  code: string;
  setCode: (code: string) => void;
  contractName: string;
  setContractName: (name: string) => void;
  selectedTemplate: string;
  setSelectedTemplate: (template: string) => void;
  selectedNetworks: string[];
  onNetworkToggle: (networkId: string) => void;
  confidenceLevel: number;
  setConfidenceLevel: (level: number) => void;
  saveToDatabase: boolean;
  setSaveToDatabase: (save: boolean) => void;
  isLoadingTemplate: boolean;
  setIsLoadingTemplate: (loading: boolean) => void;
  analysisProgress: AnalysisProgress;
  analysisResult: AnalysisResult | null;
  error: string | null;
  compilationError: string | null;
  isAnalyzing: boolean;
  handleTemplateChange: (templateId: string) => void;
  handleAnalyze: () => void;
}

export function ContractEditorTab({
  code,
  setCode,
  contractName,
  setContractName,
  selectedTemplate,
  selectedNetworks,
  onNetworkToggle,
  confidenceLevel,
  setConfidenceLevel,
  saveToDatabase,
  setSaveToDatabase,
  isLoadingTemplate,
  analysisProgress,
  analysisResult,
  error,
  compilationError,
  isAnalyzing,
  handleTemplateChange,
  handleAnalyze
}: ContractEditorTabProps) {
  return (
    <div className="space-y-4">
      {/* Top Section: Network & Confidence Selector */}
      <NetworkConfidenceSelector
        selectedNetwork={selectedNetworks}
        onNetworkChange={onNetworkToggle}
        confidenceLevel={confidenceLevel}
        onConfidenceChange={setConfidenceLevel}
        className=""
        showAdvanced={true}
        error={error}
        isAnalyzing={isAnalyzing}
        analysisProgress={analysisProgress}
        onAnalyze={handleAnalyze}
        isLoadingTemplate={isLoadingTemplate}
      />
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Left Panel: Contract Configuration */}
        <div className="xl:col-span-1 space-y-4">
          {/* Contract Settings */}
          <div className="card card-elevated">
            <div className="p-3 border-b border-gray-700">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white font-lekton">Configuration</h3>
              </div>
            </div>
            
            <div className="p-3 space-y-3">
              {/* Contract Template Selector */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1 font-lekton">
                  <FileText className="w-3 h-3 inline mr-1" />
                  Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  disabled={isLoadingTemplate}
                  className="block w-full px-2 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded text-white font-lekton focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 transition-all"
                >
                  {CONTRACT_TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                {isLoadingTemplate && (
                  <div className="text-xs text-gray-500 flex items-center space-x-1 mt-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-500"></div>
                    <span>Loading...</span>
                  </div>
                )}
              </div>

              {/* Contract Name */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1 font-lekton">
                  Contract Name
                </label>
                <input
                  type="text"
                  value={contractName}
                  onChange={(e) => setContractName(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 font-lekton focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="Enter name"
                />
              </div>

              {/* Save Option */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="saveToDatabase"
                  checked={saveToDatabase}
                  onChange={(e) => setSaveToDatabase(e.target.checked)}
                  className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-1"
                />
                <label htmlFor="saveToDatabase" className="text-xs font-medium text-gray-300 font-lekton flex items-center">
                  <Save className="w-3 h-3 mr-1" />
                  Save to DB
                </label>
              </div>
            </div>
          </div>






        </div>

        {/* Center Panel: Code Editor */}
        <div className="xl:col-span-4">
          <div className="card card-elevated h-full">
            <div className="p-3 border-b border-gray-700">
              <div className="flex items-center space-x-2">
                <Code className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-white font-lekton">Solidity Contract</h2>
                <div className="text-xs text-gray-400 ml-auto">
                  {CONTRACT_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
                </div>
              </div>
            </div>
            
            <div className="p-3">
              <div className="border border-gray-600 rounded-lg overflow-hidden">
                <Editor
                  height="350px"
                  defaultLanguage="solidity"
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 12, bottom: 12 },
                    wordWrap: 'on',
                  }}
                />
              </div>

              {compilationError && (
                <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <h3 className="text-sm font-semibold text-red-400 mb-2">Compilation Error</h3>
                  <pre className="text-xs text-red-300 bg-gray-900 p-2 rounded overflow-x-auto"><code>{compilationError}</code></pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContractEditorTab;