"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultBenchmarkFunctions = exports.extractReadableFunctions = exports.extractWritableFunctions = exports.getContractsByType = exports.getContractTemplate = exports.getAllDeployedContracts = exports.getNetworkContracts = exports.getContractDeployment = exports.CONTRACT_TEMPLATES = exports.TEST_CONTRACTS = exports.STANDARD_ABIS = void 0;
exports.STANDARD_ABIS = {
    ERC20: [
        {
            "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }],
            "name": "approve",
            "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
            "name": "balanceOf",
            "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }],
            "name": "transfer",
            "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }],
            "name": "transferFrom",
            "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "totalSupply",
            "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }],
            "name": "mint",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ],
    ERC721: [
        {
            "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
            "name": "approve",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
            "name": "balanceOf",
            "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
            "name": "ownerOf",
            "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
            "name": "transferFrom",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
            "name": "mint",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ],
    MULTISIG: [
        {
            "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }, { "internalType": "bytes", "name": "data", "type": "bytes" }],
            "name": "submitTransaction",
            "outputs": [{ "internalType": "uint256", "name": "txIndex", "type": "uint256" }],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{ "internalType": "uint256", "name": "txIndex", "type": "uint256" }],
            "name": "confirmTransaction",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{ "internalType": "uint256", "name": "txIndex", "type": "uint256" }],
            "name": "executeTransaction",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getTransactionCount",
            "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
            "stateMutability": "view",
            "type": "function"
        }
    ],
    STAKING: [
        {
            "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
            "name": "stake",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
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
            "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
            "name": "getStakedAmount",
            "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
            "stateMutability": "view",
            "type": "function"
        }
    ]
};
exports.TEST_CONTRACTS = {
    arbitrumSepolia: {
        tokenA: {
            address: '0x1234567890123456789012345678901234567890',
            name: 'TokenA',
            abi: exports.STANDARD_ABIS.ERC20,
            type: 'ERC20',
            verified: true
        },
        tokenB: {
            address: '0x2345678901234567890123456789012345678901',
            name: 'TokenB',
            abi: exports.STANDARD_ABIS.ERC20,
            type: 'ERC20',
            verified: true
        },
        multiSig: {
            address: '0x3456789012345678901234567890123456789012',
            name: 'MultiSigWallet',
            abi: exports.STANDARD_ABIS.MULTISIG,
            type: 'MULTISIG',
            verified: true
        }
    },
    optimismSepolia: {
        tokenA: {
            address: '0x4567890123456789012345678901234567890123',
            name: 'TokenA',
            abi: exports.STANDARD_ABIS.ERC20,
            type: 'ERC20',
            verified: true
        },
        tokenB: {
            address: '0x5678901234567890123456789012345678901234',
            name: 'TokenB',
            abi: exports.STANDARD_ABIS.ERC20,
            type: 'ERC20',
            verified: true
        }
    },
    baseSepolia: {
        tokenA: {
            address: '0x6789012345678901234567890123456789012345',
            name: 'TokenA',
            abi: exports.STANDARD_ABIS.ERC20,
            type: 'ERC20',
            verified: true
        },
        nft: {
            address: '0x7890123456789012345678901234567890123456',
            name: 'BasicNFT',
            abi: exports.STANDARD_ABIS.ERC721,
            type: 'ERC721',
            verified: true
        }
    },
    polygonAmoy: {
        tokenA: {
            address: '0x8901234567890123456789012345678901234567',
            name: 'TokenA',
            abi: exports.STANDARD_ABIS.ERC20,
            type: 'ERC20',
            verified: true
        },
        staking: {
            address: '0x9012345678901234567890123456789012345678',
            name: 'SimpleStaking',
            abi: exports.STANDARD_ABIS.STAKING,
            type: 'STAKING',
            verified: true
        }
    }
};
exports.CONTRACT_TEMPLATES = [
    {
        id: 'basic-erc20',
        name: 'Basic ERC20 Token',
        description: 'A simple ERC20 token with mint and burn functionality',
        contractName: 'BasicToken',
        fileName: 'BasicToken.sol',
        category: 'Token',
        abi: exports.STANDARD_ABIS.ERC20
    },
    {
        id: 'basic-nft',
        name: 'Basic NFT',
        description: 'A simple ERC721 NFT contract with mint functionality',
        contractName: 'BasicNFT',
        fileName: 'BasicNFT.sol',
        category: 'NFT',
        abi: exports.STANDARD_ABIS.ERC721
    },
    {
        id: 'multisig-wallet',
        name: 'MultiSig Wallet',
        description: 'A multi-signature wallet for secure transactions',
        contractName: 'MultiSigWallet',
        fileName: 'MultiSigWallet.sol',
        category: 'Wallet',
        abi: exports.STANDARD_ABIS.MULTISIG
    },
    {
        id: 'simple-staking',
        name: 'Simple Staking',
        description: 'A basic staking contract with rewards',
        contractName: 'SimpleStaking',
        fileName: 'SimpleStaking.sol',
        category: 'DeFi',
        abi: exports.STANDARD_ABIS.STAKING
    }
];
const getContractDeployment = (networkId, contractId) => {
    return exports.TEST_CONTRACTS[networkId]?.[contractId];
};
exports.getContractDeployment = getContractDeployment;
const getNetworkContracts = (networkId) => {
    return exports.TEST_CONTRACTS[networkId] || {};
};
exports.getNetworkContracts = getNetworkContracts;
const getAllDeployedContracts = () => {
    const contracts = [];
    Object.entries(exports.TEST_CONTRACTS).forEach(([networkId, networkContracts]) => {
        Object.entries(networkContracts).forEach(([contractId, deployment]) => {
            contracts.push({ networkId, contractId, deployment });
        });
    });
    return contracts;
};
exports.getAllDeployedContracts = getAllDeployedContracts;
const getContractTemplate = (templateId) => {
    return exports.CONTRACT_TEMPLATES.find(template => template.id === templateId);
};
exports.getContractTemplate = getContractTemplate;
const getContractsByType = (type) => {
    return (0, exports.getAllDeployedContracts)().filter(({ deployment }) => deployment.type === type);
};
exports.getContractsByType = getContractsByType;
const extractWritableFunctions = (abi) => {
    return abi
        .filter(item => item.type === 'function' &&
        (item.stateMutability === 'nonpayable' || item.stateMutability === 'payable'))
        .map(item => ({
        name: item.name,
        inputs: item.inputs || [],
        stateMutability: item.stateMutability,
        type: item.type
    }));
};
exports.extractWritableFunctions = extractWritableFunctions;
const extractReadableFunctions = (abi) => {
    return abi
        .filter(item => item.type === 'function' &&
        (item.stateMutability === 'view' || item.stateMutability === 'pure'))
        .map(item => ({
        name: item.name,
        inputs: item.inputs || [],
        stateMutability: item.stateMutability,
        type: item.type
    }));
};
exports.extractReadableFunctions = extractReadableFunctions;
const getDefaultBenchmarkFunctions = (contractType) => {
    const functionMap = {
        ERC20: ['transfer', 'approve', 'mint'],
        ERC721: ['mint', 'approve', 'transferFrom'],
        MULTISIG: ['submitTransaction', 'confirmTransaction'],
        STAKING: ['stake', 'unstake', 'claimRewards'],
        CUSTOM: ['transfer', 'approve']
    };
    return functionMap[contractType] || functionMap.CUSTOM;
};
exports.getDefaultBenchmarkFunctions = getDefaultBenchmarkFunctions;
//# sourceMappingURL=contracts.js.map