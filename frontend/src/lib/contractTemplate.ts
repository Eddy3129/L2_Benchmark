export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  contractName: string;
  fileName: string;
  category: string;
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'basic-erc20',
    name: 'Basic ERC20 Token',
    description: 'A simple ERC20 token with mint and burn functionality',
    contractName: 'BasicToken',
    fileName: 'BasicToken.sol',
    category: 'Token'
  },
  {
    id: 'advanced-erc20',
    name: 'Advanced ERC20 Token',
    description: 'ERC20 with pausable, burnable, and blacklist features',
    contractName: 'AdvancedToken',
    fileName: 'AdvancedToken.sol',
    category: 'Token'
  },
  {
    id: 'basic-nft',
    name: 'Basic NFT Collection',
    description: 'Simple ERC721 NFT with minting functionality',
    contractName: 'BasicNFT',
    fileName: 'BasicNFT.sol',
    category: 'NFT'
  },
  {
    id: 'simple-staking',
    name: 'Simple Staking Contract',
    description: 'Basic staking contract with rewards',
    contractName: 'SimpleStaking',
    fileName: 'SimpleStaking.sol',
    category: 'DeFi'
  },
  {
    id: 'multisig-wallet',
    name: 'Multi-Signature Wallet',
    description: 'Simple multi-sig wallet requiring multiple confirmations',
    contractName: 'MultiSigWallet',
    fileName: 'MultiSigWallet.sol',
    category: 'Security'
  },
  {
    id: 'simple-auction',
    name: 'Simple Auction Contract',
    description: 'Basic auction contract with bidding functionality',
    contractName: 'SimpleAuction',
    fileName: 'SimpleAuction.sol',
    category: 'Marketplace'
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
  return [...new Set(CONTRACT_TEMPLATES.map(template => template.category))];
}