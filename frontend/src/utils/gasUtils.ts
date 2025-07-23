import { GasPriceBreakdown } from '@/types/shared';

// Gas price calculation utilities
export const formatGasPrice = (gasPrice: string | number | undefined | null, unit: string = 'gwei'): string => {
  if (gasPrice === null || gasPrice === undefined) return '0';
  const price = typeof gasPrice === 'string' ? parseFloat(gasPrice) : gasPrice;
  if (isNaN(price)) return '0';
  
  return `${price.toFixed(2)} ${unit}`;
};

export const formatCurrency = (amount: number | string | undefined | null, currency: string = 'USD'): string => {
  if (amount === null || amount === undefined) return '$0.00';
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '$0.00';
  
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(numAmount);
  }
  
  return `${numAmount.toFixed(6)} ${currency}`;
};

export const formatPercentage = (value: number | string | undefined | null): string => {
  if (value === null || value === undefined) return '0%';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '0%';
  return `${numValue.toFixed(1)}%`;
};

export const calculateSavingsPercentage = (originalCost: number, newCost: number): number => {
  if (originalCost === 0) return 0;
  return ((originalCost - newCost) / originalCost) * 100;
};

export const getGasPriceFromBreakdown = (breakdown?: GasPriceBreakdown, fallbackGasPrice?: string): string => {
  if (breakdown?.totalFee) {
    return formatGasPrice(breakdown.totalFee);
  }
  if (fallbackGasPrice) {
    return formatGasPrice(fallbackGasPrice);
  }
  return 'N/A';
};

export const parseGasUsed = (gasUsed: string): number => {
  return parseInt(gasUsed.replace(/,/g, ''), 10) || 0;
};

export const formatGasUsed = (gasUsed: string | number): string => {
  const gas = typeof gasUsed === 'string' ? parseGasUsed(gasUsed) : gasUsed;
  return new Intl.NumberFormat('en-US').format(gas);
};

// Gas estimation utilities
export const estimateTransactionCost = (
  gasUsed: number,
  gasPrice: number,
  ethPriceUSD: number
): { costETH: number; costUSD: number } => {
  const costETH = (gasUsed * gasPrice) / 1e18; // Convert from wei to ETH
  const costUSD = costETH * ethPriceUSD;
  
  return { costETH, costUSD };
};

export const compareGasCosts = (
  cost1: number,
  cost2: number
): { difference: number; percentageChange: number; isSavings: boolean } => {
  const difference = Math.abs(cost1 - cost2);
  const percentageChange = cost1 === 0 ? 0 : ((cost2 - cost1) / cost1) * 100;
  const isSavings = cost2 < cost1;
  
  return { difference, percentageChange, isSavings };
};

// Confidence level utilities
export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 90) return 'text-green-600';
  if (confidence >= 70) return 'text-yellow-600';
  return 'text-red-600';
};

export const getConfidenceLabel = (confidence: number): string => {
  if (confidence >= 90) return 'High';
  if (confidence >= 70) return 'Medium';
  return 'Low';
};