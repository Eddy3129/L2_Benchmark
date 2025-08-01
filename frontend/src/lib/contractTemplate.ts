export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  contractName: string;
  fileName: string;
  category: string;
  constructorArgs?: {
    params: string[];
    defaults: any[];
    descriptions: string[];
  };
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'basic-erc20',
    name: 'Basic ERC20 Token',
    description: 'A simple ERC20 token with mint and burn functionality',
    contractName: 'BasicToken',
    fileName: 'BasicToken.sol',
    category: 'Token',
    constructorArgs: {
      params: [],
      defaults: [],
      descriptions: []
    }
  },
  {
    id: 'advanced-erc20',
    name: 'Advanced ERC20 Token',
    description: 'ERC20 with pausable, burnable, and blacklist features',
    contractName: 'AdvancedToken',
    fileName: 'AdvancedToken.sol',
    category: 'Token',
    constructorArgs: {
      params: [],
      defaults: [],
      descriptions: []
    }
  },
  {
    id: 'basic-nft',
    name: 'Basic NFT Collection',
    description: 'Simple ERC721 NFT with minting functionality',
    contractName: 'BasicNFT',
    fileName: 'BasicNFT.sol',
    category: 'NFT',
    constructorArgs: {
      params: [],
      defaults: [],
      descriptions: []
    }
  },
  {
    id: 'simple-staking',
    name: 'Simple Staking Contract',
    description: 'Basic staking contract with rewards',
    contractName: 'SimpleStaking',
    fileName: 'SimpleStaking.sol',
    category: 'DeFi',
    constructorArgs: {
      params: ['address _stakingToken', 'address _rewardToken'],
      defaults: ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'],
      descriptions: ['Address of the token to be staked', 'Address of the reward token']
    }
  },
  {
    id: 'multisig-wallet',
    name: 'Multi-Signature Wallet',
    description: 'Simple multi-sig wallet requiring multiple confirmations',
    contractName: 'MultiSigWallet',
    fileName: 'MultiSigWallet.sol',
    category: 'Security',
    constructorArgs: {
      params: ['address[] memory _owners', 'uint256 _numConfirmationsRequired'],
      defaults: [['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'], 2],
      descriptions: ['Array of wallet owner addresses', 'Number of confirmations required for transactions']
    }
  },
  {
    id: 'simple-auction',
    name: 'Simple Auction Contract',
    description: 'Basic auction contract with bidding functionality',
    contractName: 'SimpleAuction',
    fileName: 'SimpleAuction.sol',
    category: 'Marketplace',
    constructorArgs: {
      params: ['uint256 biddingTime', 'address payable beneficiaryAddress'],
      defaults: [3600, '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'],
      descriptions: ['Bidding duration in seconds (default: 1 hour)', 'Address that will receive the auction proceeds']
    }
  }
];

// Function to load contract content from file
export async function loadContractTemplate(fileName: string): Promise<string> {
  try {
    const response = await fetch(`/contracts/${fileName}`);
    if (!response.ok) {
      throw new Error(`Failed to load contract: ${fileName}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Error loading contract template:', error);
    return '';
  }
}

export function getContractTemplate(id: string): ContractTemplate | undefined {
  return CONTRACT_TEMPLATES.find(template => template.id === id);
}

export function getContractTemplatesByCategory(category: string): ContractTemplate[] {
  return CONTRACT_TEMPLATES.filter(template => template.category === category);
}

export function getAllCategories(): string[] {
  return Array.from(new Set(CONTRACT_TEMPLATES.map(template => template.category)));
}

export function getConstructorArgsByContractName(contractName: string): any[] {
  const template = CONTRACT_TEMPLATES.find(t => t.contractName === contractName);
  return template?.constructorArgs?.defaults || [];
}

export function getConstructorInfoByContractName(contractName: string): {
  params: string[];
  defaults: any[];
  descriptions: string[];
} | null {
  const template = CONTRACT_TEMPLATES.find(t => t.contractName === contractName);
  return template?.constructorArgs || null;
}

export function detectContractName(contractCode: string): string | null {
  const contractMatch = contractCode.match(/contract\s+(\w+)/);
  return contractMatch ? contractMatch[1] : null;
}