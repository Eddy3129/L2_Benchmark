export const gasTerms = {
  'Base Fee': 'The minimum gas price per unit of gas, determined by the network and burned after a transaction.',
  'Priority Fee': 'An optional "tip" paid directly to validators to incentivize them to include your transaction in the block quickly. It is essential during periods of high network congestion.',
  'Total Gas (Std)': 'The complete gas price for a standard transaction, calculated as: Base Fee + Standard Priority Fee.',
  'Std. Tx Cost (USD)': 'The estimated cost in US Dollars for a standard token transfer (21,000 gas), calculated using the Total Gas price.', 
  'Slow (50%)': 'A gas price with a 50% confidence of being included in the next block. It is cheaper but may take longer.',
  'Standard (80%)': 'A balanced gas price with an 80% confidence of being included in the next block.',
  'Fast (95%)': 'A higher gas price with a 95% confidence of being included in the next block, for faster transaction confirmation.',
  'Block Time': 'The time elapsed since the last block was mined on the network.',
  'Gwei': 'A denomination of Ether (ETH), where 1 Gwei = 0.000000001 ETH. Gas fees are typically measured in Gwei.'
};