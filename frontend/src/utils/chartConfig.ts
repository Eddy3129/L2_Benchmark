import { ChartOptions } from 'chart.js';
import { CHART_COLORS } from './networkConfig';

// Common chart configuration options
export const getBaseChartOptions = (): ChartOptions => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: '#e5e7eb',
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      titleColor: '#f9fafb',
      bodyColor: '#e5e7eb',
      borderColor: '#374151',
      borderWidth: 1
    }
  },
  scales: {
    x: {
      ticks: {
        color: '#9ca3af'
      },
      grid: {
        color: 'rgba(75, 85, 99, 0.3)'
      }
    },
    y: {
      ticks: {
        color: '#9ca3af'
      },
      grid: {
        color: 'rgba(75, 85, 99, 0.3)'
      }
    }
  }
});

export const getLineChartOptions = (title?: string): ChartOptions => ({
  ...getBaseChartOptions(),
  plugins: {
    ...getBaseChartOptions().plugins,
    title: title ? {
      display: true,
      text: title,
      color: '#f9fafb',
      font: {
        size: 16,
        weight: 'bold'
      }
    } : undefined
  }
});

export const getBarChartOptions = (title?: string): ChartOptions => ({
  ...getBaseChartOptions(),
  plugins: {
    ...getBaseChartOptions().plugins,
    title: title ? {
      display: true,
      text: title,
      color: '#f9fafb',
      font: {
        size: 16,
        weight: 'bold'
      }
    } : undefined
  }
});

// Chart data generation utilities
export const createChartDataset = ({
  label,
  data,
  backgroundColor,
  borderColor,
  type = 'line'
}: {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  type?: 'line' | 'bar';
}) => {
  const baseDataset = {
    label,
    data,
    backgroundColor: backgroundColor || CHART_COLORS[0],
    borderColor: borderColor || CHART_COLORS[0]
  };

  if (type === 'line') {
    return {
      ...baseDataset,
      borderWidth: 2,
      pointBackgroundColor: borderColor || CHART_COLORS[0],
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: false
    };
  }

  return {
    ...baseDataset,
    borderWidth: 1
  };
};

export const createMultiDatasetChart = ({
  labels,
  datasets
}: {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
    type?: 'line' | 'bar';
  }>;
}) => {
  return {
    labels,
    datasets: datasets.map((dataset, index) => 
      createChartDataset({
        label: dataset.label,
        data: dataset.data,
        backgroundColor: dataset.color || CHART_COLORS[index % CHART_COLORS.length],
        borderColor: dataset.color || CHART_COLORS[index % CHART_COLORS.length],
        type: dataset.type
      })
    )
  };
};