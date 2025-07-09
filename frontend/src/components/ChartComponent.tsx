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

    // Group sessions by network
    const networkGroups = sessions.reduce((acc, session) => {
      const network = session.network || 'Unknown';
      if (!acc[network]) {
        acc[network] = [];
      }
      acc[network].push(session);
      return acc;
    }, {} as Record<string, BenchmarkSession[]>);

    // Network colors for dots
    const networkColors = {
      'ethereum': '#627EEA',
      'polygon': '#8247E5',
      'arbitrum': '#28A0F0',
      'optimism': '#FF0420',
      'base': '#0052FF',
      'Unknown': '#6B7280'
    };

    let datasets: any[] = [];
    let label = '';

    switch (metric) {
      case 'gasUsed':
        label = 'Average Gas Used';
        break;
      case 'executionTime':
        label = 'Average Execution Time (s)';
        break;
      case 'operations':
        label = 'Total Operations';
        break;
      case 'totalFees':
        label = 'Total Fees (ETH)';
        break;
    }

    // Create dataset for each network
    Object.entries(networkGroups).forEach(([network, networkSessions]) => {
      let data: number[] = [];
      
      switch (metric) {
        case 'gasUsed':
          data = networkSessions.map(s => s.avgGasUsed || 0);
          break;
        case 'executionTime':
          data = networkSessions.map(s => s.avgExecutionTime || 0);
          break;
        case 'operations':
          data = networkSessions.map(s => s.totalOperations || 0);
          break;
        case 'totalFees':
          data = networkSessions.map(s => {
            const fees = s.results?.transactions?.totalFees;
            return fees ? parseFloat(fees) / 1e18 : 0;
          });
          break;
      }

      const networkColor = networkColors[network as keyof typeof networkColors] || networkColors.Unknown;

      if (chartType === 'scatter') {
        datasets.push({
          label: network,
          data: networkSessions.map((session, index) => ({
            x: sessions.indexOf(session),
            y: data[index]
          })),
          backgroundColor: networkColor,
          borderColor: networkColor,
          pointRadius: 4,
          pointHoverRadius: 6,
        });
      } else {
        datasets.push({
          label: network,
          data: sessions.map(session => {
            const sessionIndex = networkSessions.indexOf(session);
            return sessionIndex >= 0 ? data[sessionIndex] : null;
          }),
          backgroundColor: 'transparent',
          borderColor: '#6B7280', // Consistent gray for all lines
          borderWidth: 1, // Slimmer lines
          fill: false,
          tension: 0.1,
          pointBackgroundColor: networkColor, // Colored dots
          pointBorderColor: networkColor,
          pointRadius: 3,
          pointHoverRadius: 5,
          spanGaps: true,
        });
      }
    });

    return {
      labels,
      datasets
    };
  }, [sessions, metric, chartType]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            family: 'Lekton',
            size: 12,
          },
          color: '#D1D5DB',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
        },
      },
      title: {
        display: true,
        text: `${metric.charAt(0).toUpperCase() + metric.slice(1)} Trends`,
        font: {
          family: 'Funnel Display',
          size: 16,
          weight: '600',
        },
        color: '#F9FAFB',
        padding: 16,
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#F9FAFB',
        bodyColor: '#D1D5DB',
        borderColor: '#374151',
        borderWidth: 1,
        titleFont: {
          family: 'Lekton',
          size: 12,
        },
        bodyFont: {
          family: 'Lekton',
          size: 11,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: '#374151',
          lineWidth: 0.5,
        },
        ticks: {
          color: '#9CA3AF',
          font: {
            family: 'Lekton',
            size: 10,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#374151',
          lineWidth: 0.5,
        },
        ticks: {
          color: '#9CA3AF',
          font: {
            family: 'Lekton',
            size: 10,
          },
        },
      },
    },
  };

  if (sessions.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-800/30 rounded-lg border border-gray-700">
        <div className="text-center">
          <span className="text-3xl mb-3 block">📈</span>
          <h3 className="text-base font-funnel font-medium text-gray-200 mb-2">No Data Available</h3>
          <p className="text-sm text-gray-400 font-lekton">Run some benchmarks to see visualizations here.</p>
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