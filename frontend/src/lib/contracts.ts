// Update these addresses after deployment
export const CONTRACT_ADDRESSES = {
  BASIC_POOL: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Your deployed BasicPool address
  TOKEN_A: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // Your deployed TokenA address
  TOKEN_B: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9', // Your deployed TokenB address
  MY_NFT: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', // Your deployed MyNFT address
} as const;

// Complete ERC20 ABI for tokens (including mint function)
export const ERC20_ABI = [
{
  "inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
  "name": "approve",
  "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
  "name": "balanceOf",
  "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "address", "name": "spender", "type": "address"}],
  "name": "allowance",
  "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [{"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
  "name": "mint",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
}
] as const;

// Complete Basic Pool ABI
export const BASIC_POOL_ABI = [
{
  "inputs": [],
  "name": "reservoirA",
  "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "reservoirB",
  "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
  "name": "liquidityProvided",
  "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [{"internalType": "uint256", "name": "amountA", "type": "uint256"}, {"internalType": "uint256", "name": "amountB", "type": "uint256"}],
  "name": "addLiquidity",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [{"internalType": "uint256", "name": "amountAIn", "type": "uint256"}, {"internalType": "uint256", "name": "minAmountBOut", "type": "uint256"}],
  "name": "swapAForB",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [{"internalType": "uint256", "name": "amountBIn", "type": "uint256"}, {"internalType": "uint256", "name": "minAmountAOut", "type": "uint256"}],
  "name": "swapBForA",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [],
  "name": "removeLiquidity",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [],
  "name": "claimRewards",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
}
] as const;

// NFT ABI (if needed)
export const NFT_ABI = [
{
  "inputs": [{"internalType": "address", "name": "to", "type": "address"}],
  "name": "safeMint",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [{"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "quantity", "type": "uint256"}],
  "name": "batchMint",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
}
] as const;