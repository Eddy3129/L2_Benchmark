'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Scatter } from 'react-chartjs-2';
import { BenchmarkSession } from '@/lib/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ChartComponentProps {
  sessions: BenchmarkSession[];
  chartType: 'line' | 'bar' | 'scatter';
  metric: 'gasUsed' | 'executionTime' | 'totalFees' | 'operations';
}

export function ChartComponent({ sessions, chartType, metric }: ChartComponentProps) {
  const chartData = useMemo(() => {
    const labels = sessions.map((session, index) => {
      if (session.createdAt) {
        return new Date(session.createdAt).toLocaleDateString();
      }
      return `Session ${index + 1}`;
    });

    let data: number[] = [];
    let label = '';
    let backgroundColor = '';
    let borderColor = '';

    switch (metric) {
      case 'gasUsed':
        data = sessions.map(s => s.avgGasUsed || 0);
        label = 'Average Gas Used';
        backgroundColor = 'rgba(59, 130, 246, 0.1)';
        borderColor = 'rgb(59, 130, 246)';
        break;
      case 'executionTime':
        data = sessions.map(s => s.avgExecutionTime || 0);
        label = 'Average Execution Time (s)';
        backgroundColor = 'rgba(16, 185, 129, 0.1)';
        borderColor = 'rgb(16, 185, 129)';
        break;
      case 'operations':
        data = sessions.map(s => s.totalOperations || 0);
        label = 'Total Operations';
        backgroundColor = 'rgba(139, 92, 246, 0.1)';
        borderColor = 'rgb(139, 92, 246)';
        break;
      case 'totalFees':
        data = sessions.map(s => {
          const fees = s.results?.transactions?.totalFees;
          return fees ? parseFloat(fees) / 1e18 : 0;
        });
        label = 'Total Fees (ETH)';
        backgroundColor = 'rgba(245, 101, 101, 0.1)';
        borderColor = 'rgb(245, 101, 101)';
        break;
    }

    if (chartType === 'scatter') {
      return {
        datasets: [{
          label,
          data: sessions.map((session, index) => ({
            x: index,
            y: data[index]
          })),
          backgroundColor: borderColor,
          borderColor,
        }]
      };
    }

    return {
      labels,
      datasets: [{
        label,
        data,
        backgroundColor,
        borderColor,
        borderWidth: 2,
        fill: chartType === 'line',
        tension: 0.1,
      }]
    };
  }, [sessions, metric, chartType]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${metric.charAt(0).toUpperCase() + metric.slice(1)} Trends`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (sessions.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <span className="text-4xl mb-4 block">📈</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600">Run some benchmarks to see visualizations here.</p>
        </div>
      </div>
    );
  }

  const ChartComponent = chartType === 'line' ? Line : chartType === 'bar' ? Bar : Scatter;

  return (
    <div className="h-96">
      <ChartComponent data={chartData} options={options} />
    </div>
  );
}