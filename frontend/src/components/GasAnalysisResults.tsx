'use client';

interface NetworkResult {
  network: string;
  networkName: string;
  deployment: {
    gasUsed: string;
    costETH: string;  // This represents native token cost, not always ETH
    costUSD: number;
  };
  functions: Array<{
    functionName: string;
    gasUsed: string;
    estimatedCostETH: string;  // This represents native token cost, not always ETH
    estimatedCostUSD: number;
  }>;
  gasPrice: string;
  ethPriceUSD: number;  // This represents the native token price, not always ETH
}

interface AnalysisResult {
  contractName: string;
  compilation: any;
  results: NetworkResult[];
  timestamp: string;
}

interface Props {
  result: AnalysisResult;
}

// Add network configuration mapping
const NETWORK_CONFIG: { [key: string]: { symbol: string, name: string, color: string } } = {
  arbitrumSepolia: { symbol: 'ETH', name: 'Arbitrum Sepolia', color: '#28A0F0' },
  optimismSepolia: { symbol: 'ETH', name: 'Optimism Sepolia', color: '#FF0420' },
  baseSepolia: { symbol: 'ETH', name: 'Base Sepolia', color: '#0052FF' },
  polygonAmoy: { symbol: 'POL', name: 'Polygon Amoy', color: '#8247E5' },
};

export function GasAnalysisResults({ result }: Props) {
  const formatGas = (gas: string) => {
    return parseInt(gas).toLocaleString();
  };

  const formatToken = (tokenAmount: string) => {
    return parseFloat(tokenAmount).toFixed(6);
  };

  const formatUSD = (usd: number) => {
    return usd.toFixed(2);
  };

  const getNetworkSymbol = (networkKey: string) => {
    return NETWORK_CONFIG[networkKey]?.symbol || 'ETH';
  };

  const getTokenPrice = (networkResult: NetworkResult) => {
    return networkResult.ethPriceUSD; // This is actually the native token price
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">
          Analysis Results: {result.contractName}
        </h2>
        <p className="text-sm text-gray-500">
          Analyzed at {new Date(result.timestamp).toLocaleString()}
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Deployment Costs Summary */}
        <div>
          <h3 className="text-md font-semibold text-gray-900 mb-3">Deployment Costs</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Network
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gas Used
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost (Native Token)
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost (USD)
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token Price
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {result.results.map((networkResult) => {
                  const symbol = getNetworkSymbol(networkResult.network);
                  return (
                    <tr key={networkResult.network}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {networkResult.networkName}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {formatGas(networkResult.deployment.gasUsed)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {formatToken(networkResult.deployment.costETH)} {symbol}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        ${formatUSD(networkResult.deployment.costUSD)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        ${getTokenPrice(networkResult).toFixed(2)} {symbol}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Function Costs by Network */}
        {result.results.map((networkResult) => {
          const symbol = getNetworkSymbol(networkResult.network);
          return (
            <div key={networkResult.network}>
              <h3 className="text-md font-semibold text-gray-900 mb-3">
                {networkResult.networkName} - Function Call Costs
              </h3>
              
              {networkResult.functions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Function
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Gas Used
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cost ({symbol})
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cost (USD)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {networkResult.functions.map((func, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {func.functionName}()
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {formatGas(func.gasUsed)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {formatToken(func.estimatedCostETH)} {symbol}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            ${formatUSD(func.estimatedCostUSD)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  No state-changing functions found in this contract.
                </p>
              )}
            </div>
          );
        })}

        {/* Summary Statistics */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-md font-semibold text-gray-900 mb-3">Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total Functions Analyzed:</span>
              <span className="ml-2 font-medium">
                {result.results[0]?.functions.length || 0}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Networks Compared:</span>
              <span className="ml-2 font-medium">{result.results.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Token Prices:</span>
              <div className="ml-2 font-medium">
                {result.results.map((networkResult, index) => {
                  const symbol = getNetworkSymbol(networkResult.network);
                  return (
                    <div key={networkResult.network} className="text-xs">
                      {symbol}: ${getTokenPrice(networkResult).toFixed(2)}
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Compilation:</span>
              <span className="ml-2 font-medium text-green-600">✓ Successful</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}