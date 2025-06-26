'use client';

interface NetworkResult {
  network: string;
  networkName: string;
  deployment: {
    gasUsed: string;
    costETH: string;
    costUSD: number;
  };
  functions: Array<{
    functionName: string;
    gasUsed: string;
    estimatedCostETH: string;
    estimatedCostUSD: number;
  }>;
  gasPrice: string;
  ethPriceUSD: number;
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

export function GasAnalysisResults({ result }: Props) {
  const formatGas = (gas: string) => {
    return parseInt(gas).toLocaleString();
  };

  const formatETH = (eth: string) => {
    return parseFloat(eth).toFixed(6);
  };

  const formatUSD = (usd: number) => {
    return usd.toFixed(2);
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
                    Cost (ETH)
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost (USD)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {result.results.map((networkResult) => (
                  <tr key={networkResult.network}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {networkResult.networkName}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {formatGas(networkResult.deployment.gasUsed)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {formatETH(networkResult.deployment.costETH)} ETH
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      ${formatUSD(networkResult.deployment.costUSD)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Function Costs by Network */}
        {result.results.map((networkResult) => (
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
                        Cost (ETH)
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
                          {formatETH(func.estimatedCostETH)} ETH
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
        ))}

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
              <span className="text-gray-500">ETH Price:</span>
              <span className="ml-2 font-medium">
                ${result.results[0]?.ethPriceUSD.toFixed(2) || 'N/A'}
              </span>
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