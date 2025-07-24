'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Code } from 'lucide-react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  placeholder?: string;
  className?: string;
}

export default function CodeEditor({
  value,
  onChange,
  language = 'solidity',
  placeholder = 'Enter your Solidity code here...',
  className = ''
}: CodeEditorProps) {
  return (
    <Card className={`h-full ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Code className="h-5 w-5" />
          Smart Contract Code
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-96 p-4 bg-gray-900 text-gray-100 font-mono text-sm border-0 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-b-lg"
          spellCheck={false}
        />
      </CardContent>
    </Card>
  );
}