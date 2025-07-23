// Centralized contract ABI and address management
// This file serves as the single source of truth for all contract configurations

import { NetworkConfig } from './networks';

// Standard contract ABIs
export const STANDARD_ABIS = {
  ERC20: [
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
      "inputs": [{"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
      "name": "transfer",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "from", "type": "address"}, {"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
      "name": "transferFrom",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
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
  ],
  
  ERC721: [
    {
      "inputs": [{"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
      "name": "approve",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
      "name": "balanceOf",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
      "name": "ownerOf",
      "outputs": [{"internalType": "address", "name": "", "type": "address"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "from", "type": "address"}, {"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
      "name": "transferFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
      "name": "mint",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ],
  
  MULTISIG: [
    {
      "inputs": [{"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "value", "type": "uint256"}, {"internalType": "bytes", "name": "data", "type": "bytes"}],
      "name": "submitTransaction",
      "outputs": [{"internalType": "uint256", "name": "txIndex", "type": "uint256"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "uint256", "name": "txIndex", "type": "uint256"}],
      "name": "confirmTransaction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "uint256", "name": "txIndex", "type": "uint256"}],
      "name": "executeTransaction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTransactionCount",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    }
  ],
  
  STAKING: [
    {
      "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
      "name": "stake",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
      "name": "unstake",
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
    },
    {
      "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
      "name": "getStakedAmount",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    }
  ]
};

// Function to get a standard ABI by type
export const getContractAbi = (type: 'ERC20' | 'ERC721' | 'MULTISIG' | 'STAKING'): any[] | undefined => {
  return STANDARD_ABIS[type];
};

// Contract deployment addresses per network
export interface ContractDeployment {
  address: string;
  name: string;
  abi: any[];
  type: 'ERC20' | 'ERC721' | 'MULTISIG' | 'STAKING' | 'CUSTOM';
  verified: boolean;
  deploymentBlock?: number;
}

// Test contract deployments for benchmarking
export const TEST_CONTRACTS: Record<string, Record<string, ContractDeployment>> = {
  // Arbitrum Sepolia (Chain ID: 421614)
  '421614': {
    myNFT: {
      address: '0x10025Ae0c53473E68Ff7DaeD5236436CaE604e56', // Actual deployed MyNFT contract
      name: 'MyNFT',
      abi: STANDARD_ABIS.ERC721,
      type: 'ERC721',
      verified: true
    },
    tokenA: {
      address: '0x1234567890123456789012345678901234567890', // Replace with actual deployed address
      name: 'TokenA',
      abi: STANDARD_ABIS.ERC20,
      type: 'ERC20',
      verified: true
    },
    tokenB: {
      address: '0x2345678901234567890123456789012345678901', // Replace with actual deployed address
      name: 'TokenB',
      abi: STANDARD_ABIS.ERC20,
      type: 'ERC20',
      verified: true
    },
    multiSig: {
      address: '0x3456789012345678901234567890123456789012', // Replace with actual deployed address
      name: 'MultiSigWallet',
      abi: STANDARD_ABIS.MULTISIG,
      type: 'MULTISIG',
      verified: true
    }
  },
  // Optimism Sepolia (Chain ID: 11155420)
  '11155420': {
    tokenA: {
      address: '0x4567890123456789012345678901234567890123', // Replace with actual deployed address
      name: 'TokenA',
      abi: STANDARD_ABIS.ERC20,
      type: 'ERC20',
      verified: true
    },
    tokenB: {
      address: '0x5678901234567890123456789012345678901234', // Replace with actual deployed address
      name: 'TokenB',
      abi: STANDARD_ABIS.ERC20,
      type: 'ERC20',
      verified: true
    }
  },
  // Base Sepolia (Chain ID: 84532)
  '84532': {
    tokenA: {
      address: '0x6789012345678901234567890123456789012345', // Replace with actual deployed address
      name: 'TokenA',
      abi: STANDARD_ABIS.ERC20,
      type: 'ERC20',
      verified: true
    },
    nft: {
      address: '0x7890123456789012345678901234567890123456', // Replace with actual deployed address
      name: 'BasicNFT',
      abi: STANDARD_ABIS.ERC721,
      type: 'ERC721',
      verified: true
    }
  },
  // Polygon Amoy (Chain ID: 80002)
  '80002': {
    tokenA: {
      address: '0x8901234567890123456789012345678901234567', // Replace with actual deployed address
      name: 'TokenA',
      abi: STANDARD_ABIS.ERC20,
      type: 'ERC20',
      verified: true
    },
    staking: {
      address: '0x9012345678901234567890123456789012345678', // Replace with actual deployed address
      name: 'SimpleStaking',
      abi: STANDARD_ABIS.STAKING,
      type: 'STAKING',
      verified: true
    }
  }
};

// Function to get a test contract by address and network
export const getTestContract = (address: string, chainId: number): ContractDeployment | undefined => {
  // Look up contracts by both chainId and address to ensure we get the right network
  const networkId = chainId.toString();
  const networkContracts = TEST_CONTRACTS[networkId];
  
  if (!networkContracts) {
    return undefined;
  }
  
  for (const contractKey in networkContracts) {
    const contract = networkContracts[contractKey];
    if (contract.address.toLowerCase() === address.toLowerCase()) {
      return contract;
    }
  }
  
  return undefined;
};

// Contract templates for deployment
export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  contractName: string;
  fileName: string;
  category: string;
  abi: any[];
  bytecode?: string;
  constructorArgs?: any[];
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'basic-erc20',
    name: 'Basic ERC20 Token',
    description: 'A simple ERC20 token with mint and burn functionality',
    contractName: 'BasicToken',
    fileName: 'BasicToken.sol',
    category: 'Token',
    abi: STANDARD_ABIS.ERC20
  },
  {
    id: 'basic-nft',
    name: 'Basic NFT',
    description: 'A simple ERC721 NFT contract with mint functionality',
    contractName: 'BasicNFT',
    fileName: 'BasicNFT.sol',
    category: 'NFT',
    abi: STANDARD_ABIS.ERC721
  },
  {
    id: 'multisig-wallet',
    name: 'MultiSig Wallet',
    description: 'A multi-signature wallet for secure transactions',
    contractName: 'MultiSigWallet',
    fileName: 'MultiSigWallet.sol',
    category: 'Wallet',
    abi: STANDARD_ABIS.MULTISIG
  },
  {
    id: 'simple-staking',
    name: 'Simple Staking',
    description: 'A basic staking contract with rewards',
    contractName: 'SimpleStaking',
    fileName: 'SimpleStaking.sol',
    category: 'DeFi',
    abi: STANDARD_ABIS.STAKING
  }
];

// Utility functions
export const getContractDeployment = (networkId: string, contractId: string): ContractDeployment | undefined => {
  return TEST_CONTRACTS[networkId]?.[contractId];
};

export const getNetworkContracts = (networkId: string): Record<string, ContractDeployment> => {
  return TEST_CONTRACTS[networkId] || {};
};

export const getAllDeployedContracts = (): Array<{ networkId: string; contractId: string; deployment: ContractDeployment }> => {
  const contracts: Array<{ networkId: string; contractId: string; deployment: ContractDeployment }> = [];
  
  Object.entries(TEST_CONTRACTS).forEach(([networkId, networkContracts]) => {
    Object.entries(networkContracts).forEach(([contractId, deployment]) => {
      contracts.push({ networkId, contractId, deployment });
    });
  });
  
  return contracts;
};

export const getContractTemplate = (templateId: string): ContractTemplate | undefined => {
  return CONTRACT_TEMPLATES.find(template => template.id === templateId);
};

export const getContractsByType = (type: ContractDeployment['type']): Array<{ networkId: string; contractId: string; deployment: ContractDeployment }> => {
  return getAllDeployedContracts().filter(({ deployment }) => deployment.type === type);
};

// Function extraction utilities
export interface BenchmarkFunction {
  name: string;
  inputs: any[];
  stateMutability: string;
  type: string;
}

export const extractWritableFunctions = (abi: any[]): BenchmarkFunction[] => {
  return abi
    .filter(item => 
      item.type === 'function' && 
      (item.stateMutability === 'nonpayable' || item.stateMutability === 'payable')
    )
    .map(item => ({
      name: item.name,
      inputs: item.inputs || [],
      stateMutability: item.stateMutability,
      type: item.type
    }));
};

export const extractReadableFunctions = (abi: any[]): BenchmarkFunction[] => {
  return abi
    .filter(item => 
      item.type === 'function' && 
      (item.stateMutability === 'view' || item.stateMutability === 'pure')
    )
    .map(item => ({
      name: item.name,
      inputs: item.inputs || [],
      stateMutability: item.stateMutability,
      type: item.type
    }));
};

export const getDefaultBenchmarkFunctions = (contractType: ContractDeployment['type']): string[] => {
  const functionMap: Record<ContractDeployment['type'], string[]> = {
    ERC20: ['transfer', 'approve', 'mint'],
    ERC721: ['mint', 'approve', 'transferFrom'],
    MULTISIG: ['submitTransaction', 'confirmTransaction'],
    STAKING: ['stake', 'unstake', 'claimRewards'],
    CUSTOM: ['transfer', 'approve'] // Default fallback
  };
  
  return functionMap[contractType] || functionMap.CUSTOM;
};