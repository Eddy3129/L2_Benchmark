'use client';

interface FilterState {
  dateRange: 'all' | '7d' | '30d' | '90d';
  sortBy: 'date' | 'gasUsed' | 'executionTime' | 'operations';
  sortOrder: 'asc' | 'desc';
  chartType: 'line' | 'bar' | 'scatter';
  metric: 'gasUsed' | 'executionTime' | 'totalFees' | 'operations';
}

interface FilterControlsProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function FilterControls({ filters, onFiltersChange }: FilterControlsProps) {
  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters & Visualization</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
          <select
            value={filters.dateRange}
            onChange={(e) => updateFilter('dateRange', e.target.value)}
            className="w-full border text-gray-700 border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="w-full border text-gray-700 border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="date">Date</option>
            <option value="gasUsed">Gas Used</option>
            <option value="executionTime">Execution Time</option>
            <option value="operations">Operations</option>
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
          <select
            value={filters.sortOrder}
            onChange={(e) => updateFilter('sortOrder', e.target.value)}
            className="w-full text-gray-700 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        {/* Chart Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
          <select
            value={filters.chartType}
            onChange={(e) => updateFilter('chartType', e.target.value)}
            className="w-full border text-gray-700 border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="scatter">Scatter Plot</option>
          </select>
        </div>

        {/* Metric */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Metric</label>
          <select
            value={filters.metric}
            onChange={(e) => updateFilter('metric', e.target.value)}
            className="w-full text-gray-700 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="gasUsed">Gas Used</option>
            <option value="executionTime">Execution Time</option>
            <option value="totalFees">Total Fees</option>
            <option value="operations">Operations</option>
          </select>
        </div>
      </div>
    </div>
  );
}