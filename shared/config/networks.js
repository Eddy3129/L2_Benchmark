"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isL2Network = exports.isTestnetNetwork = exports.isValidNetwork = exports.CHART_COLORS = exports.getNetworkColor = exports.getNetworkDisplayName = exports.createNetworkConfig = exports.getNetworkByChainId = exports.getNetworksByCategory = exports.getL2Networks = exports.getMainnetNetworks = exports.getTestnetNetworks = exports.getNetworkConfig = exports.ALL_NETWORKS = exports.MAINNET_NETWORKS = exports.TESTNET_NETWORKS = void 0;
const getRpcUrl = (envKey, fallback) => {
    return process.env[envKey] || fallback;
};
exports.TESTNET_NETWORKS = {
    arbitrumSepolia: {
        id: 'arbitrumSepolia',
        name: 'arbitrum-sepolia',
        displayName: 'Arbitrum Sepolia',
        chainId: 421614,
        rpcUrl: getRpcUrl('ARBITRUM_SEPOLIA_RPC_URL', 'https://sepolia-rollup.arbitrum.io/rpc'),
        explorerUrl: 'https://sepolia.arbiscan.io',
        explorerApiUrl: 'https://api-sepolia.arbiscan.io/api',
        explorerApiKey: process.env.ARBISCAN_API_KEY,
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        },
        type: 'l2',
        category: 'arbitrum',
        color: '#2563eb',
        blockTime: 1,
        gasLimit: 32000000,
        finalityBlocks: 1,
        parentChain: 'sepolia',
        isTestnet: true,
        isL2: true
    },
    optimismSepolia: {
        id: 'optimismSepolia',
        name: 'optimism-sepolia',
        displayName: 'Optimism Sepolia',
        chainId: 11155420,
        rpcUrl: getRpcUrl('OPTIMISM_SEPOLIA_RPC_URL', 'https://sepolia.optimism.io'),
        explorerUrl: 'https://sepolia-optimism.etherscan.io',
        explorerApiUrl: 'https://api-sepolia-optimism.etherscan.io/api',
        explorerApiKey: process.env.OPTIMISM_ETHERSCAN_API_KEY,
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        },
        type: 'l2',
        category: 'optimism',
        color: '#dc2626',
        blockTime: 2,
        gasLimit: 30000000,
        finalityBlocks: 1,
        parentChain: 'sepolia',
        isTestnet: true,
        isL2: true
    },
    baseSepolia: {
        id: 'baseSepolia',
        name: 'base-sepolia',
        displayName: 'Base Sepolia',
        chainId: 84532,
        rpcUrl: getRpcUrl('BASE_SEPOLIA_RPC_URL', 'https://sepolia.base.org'),
        explorerUrl: 'https://sepolia.basescan.org',
        explorerApiUrl: 'https://api-sepolia.basescan.org/api',
        explorerApiKey: process.env.BASESCAN_API_KEY,
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        },
        type: 'l2',
        category: 'base',
        color: '#1d4ed8',
        blockTime: 2,
        gasLimit: 30000000,
        finalityBlocks: 1,
        parentChain: 'sepolia',
        isTestnet: true,
        isL2: true
    },
    polygonAmoy: {
        id: 'polygonAmoy',
        name: 'polygon-amoy',
        displayName: 'Polygon Amoy',
        chainId: 80002,
        rpcUrl: getRpcUrl('POLYGON_AMOY_RPC_URL', 'https://rpc-amoy.polygon.technology'),
        explorerUrl: 'https://amoy.polygonscan.com',
        explorerApiUrl: 'https://api-amoy.polygonscan.com/api',
        explorerApiKey: process.env.POLYGONSCAN_API_KEY,
        nativeCurrency: {
            name: 'Polygon',
            symbol: 'POL',
            decimals: 18
        },
        type: 'l2',
        category: 'polygon',
        color: '#7c3aed',
        blockTime: 2,
        gasLimit: 30000000,
        finalityBlocks: 128,
        isTestnet: true,
        isL2: true
    },
    sepolia: {
        id: 'sepolia',
        name: 'sepolia',
        displayName: 'Sepolia Testnet',
        chainId: 11155111,
        rpcUrl: getRpcUrl('SEPOLIA_RPC_URL', 'https://eth-sepolia.g.alchemy.com/v2/demo'),
        explorerUrl: 'https://sepolia.etherscan.io',
        explorerApiUrl: 'https://api-sepolia.etherscan.io/api',
        explorerApiKey: process.env.ETHERSCAN_API_KEY,
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        },
        type: 'testnet',
        category: 'ethereum',
        color: '#627EEA',
        blockTime: 12,
        gasLimit: 30000000,
        finalityBlocks: 12,
        isTestnet: true,
        isL2: false
    }
};
exports.MAINNET_NETWORKS = {
    mainnet: {
        id: 'mainnet',
        name: 'mainnet',
        displayName: 'Ethereum Mainnet',
        chainId: 1,
        rpcUrl: getRpcUrl('MAINNET_RPC_URL', 'https://eth-mainnet.g.alchemy.com/v2/demo'),
        explorerUrl: 'https://etherscan.io',
        explorerApiUrl: 'https://api.etherscan.io/api',
        explorerApiKey: process.env.ETHERSCAN_API_KEY,
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        },
        type: 'mainnet',
        category: 'ethereum',
        color: '#627EEA',
        blockTime: 12,
        gasLimit: 30000000,
        finalityBlocks: 12,
        isTestnet: false,
        isL2: false
    },
    arbitrum: {
        id: 'arbitrum',
        name: 'arbitrum',
        displayName: 'Arbitrum One',
        chainId: 42161,
        rpcUrl: getRpcUrl('ARBITRUM_RPC_URL', 'https://arb1.arbitrum.io/rpc'),
        explorerUrl: 'https://arbiscan.io',
        explorerApiUrl: 'https://api.arbiscan.io/api',
        explorerApiKey: process.env.ARBISCAN_API_KEY,
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        },
        type: 'l2',
        category: 'arbitrum',
        color: '#28A0F0',
        blockTime: 1,
        gasLimit: 32000000,
        finalityBlocks: 1,
        parentChain: 'mainnet',
        isTestnet: false,
        isL2: true
    },
    optimism: {
        id: 'optimism',
        name: 'optimism',
        displayName: 'Optimism',
        chainId: 10,
        rpcUrl: getRpcUrl('OPTIMISM_RPC_URL', 'https://mainnet.optimism.io'),
        explorerUrl: 'https://optimistic.etherscan.io',
        explorerApiUrl: 'https://api-optimistic.etherscan.io/api',
        explorerApiKey: process.env.OPTIMISM_ETHERSCAN_API_KEY,
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        },
        type: 'l2',
        category: 'optimism',
        color: '#FF0420',
        blockTime: 2,
        gasLimit: 30000000,
        finalityBlocks: 1,
        parentChain: 'mainnet',
        isTestnet: false,
        isL2: true
    },
    base: {
        id: 'base',
        name: 'base',
        displayName: 'Base',
        chainId: 8453,
        rpcUrl: getRpcUrl('BASE_RPC_URL', 'https://mainnet.base.org'),
        explorerUrl: 'https://basescan.org',
        explorerApiUrl: 'https://api.basescan.org/api',
        explorerApiKey: process.env.BASESCAN_API_KEY,
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        },
        type: 'l2',
        category: 'base',
        color: '#0052FF',
        blockTime: 2,
        gasLimit: 30000000,
        finalityBlocks: 1,
        parentChain: 'mainnet',
        isTestnet: false,
        isL2: true
    },
    polygon: {
        id: 'polygon',
        name: 'polygon',
        displayName: 'Polygon PoS',
        chainId: 137,
        rpcUrl: getRpcUrl('POLYGON_RPC_URL', 'https://polygon-rpc.com'),
        explorerUrl: 'https://polygonscan.com',
        explorerApiUrl: 'https://api.polygonscan.com/api',
        explorerApiKey: process.env.POLYGONSCAN_API_KEY,
        nativeCurrency: {
            name: 'Polygon',
            symbol: 'POL',
            decimals: 18
        },
        type: 'l2',
        category: 'polygon',
        color: '#8247E5',
        blockTime: 2,
        gasLimit: 30000000,
        finalityBlocks: 128,
        isTestnet: false,
        isL2: true
    },
    scroll: {
        id: 'scroll',
        name: 'scroll',
        displayName: 'Scroll',
        chainId: 534352,
        rpcUrl: getRpcUrl('SCROLL_RPC_URL', 'https://rpc.scroll.io'),
        explorerUrl: 'https://scrollscan.com',
        explorerApiUrl: 'https://api.scrollscan.com/api',
        explorerApiKey: process.env.SCROLLSCAN_API_KEY,
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        },
        type: 'l2',
        category: 'scroll',
        color: '#FFEEDA',
        blockTime: 3,
        gasLimit: 30000000,
        finalityBlocks: 1,
        parentChain: 'mainnet',
        isTestnet: false,
        isL2: true
    },
    linea: {
        id: 'linea',
        name: 'linea',
        displayName: 'Linea',
        chainId: 59144,
        rpcUrl: getRpcUrl('LINEA_RPC_URL', 'https://rpc.linea.build'),
        explorerUrl: 'https://lineascan.build',
        explorerApiUrl: 'https://api.lineascan.build/api',
        explorerApiKey: process.env.LINEASCAN_API_KEY,
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        },
        type: 'l2',
        category: 'linea',
        color: '#121212',
        blockTime: 2,
        gasLimit: 30000000,
        finalityBlocks: 1,
        parentChain: 'mainnet',
        isTestnet: false,
        isL2: true
    },
    ink: {
        id: 'ink',
        name: 'ink',
        displayName: 'Ink',
        chainId: 57073,
        rpcUrl: getRpcUrl('INK_RPC_URL', 'https://rpc-gel.inkonchain.com'),
        explorerUrl: 'https://explorer.inkonchain.com',
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        },
        type: 'l2',
        category: 'ink',
        color: '#000000',
        blockTime: 2,
        gasLimit: 30000000,
        finalityBlocks: 1,
        parentChain: 'mainnet',
        isTestnet: false,
        isL2: true
    }
};
exports.ALL_NETWORKS = {
    ...exports.TESTNET_NETWORKS,
    ...exports.MAINNET_NETWORKS
};
const getNetworkConfig = (networkId) => {
    return exports.ALL_NETWORKS[networkId];
};
exports.getNetworkConfig = getNetworkConfig;
const getTestnetNetworks = () => {
    return Object.values(exports.TESTNET_NETWORKS);
};
exports.getTestnetNetworks = getTestnetNetworks;
const getMainnetNetworks = () => {
    return Object.values(exports.MAINNET_NETWORKS);
};
exports.getMainnetNetworks = getMainnetNetworks;
const getL2Networks = () => {
    return Object.values(exports.ALL_NETWORKS).filter(network => network.isL2);
};
exports.getL2Networks = getL2Networks;
const getNetworksByCategory = (category) => {
    return Object.values(exports.ALL_NETWORKS).filter(network => network.category === category);
};
exports.getNetworksByCategory = getNetworksByCategory;
const getNetworkByChainId = (chainId) => {
    return Object.values(exports.ALL_NETWORKS).find(network => network.chainId === chainId);
};
exports.getNetworkByChainId = getNetworkByChainId;
const createNetworkConfig = () => ({
    networks: Object.values(exports.ALL_NETWORKS)
});
exports.createNetworkConfig = createNetworkConfig;
const getNetworkDisplayName = (networkId) => {
    const network = (0, exports.getNetworkConfig)(networkId);
    return network?.displayName || networkId.toUpperCase();
};
exports.getNetworkDisplayName = getNetworkDisplayName;
const getNetworkColor = (networkId) => {
    const network = (0, exports.getNetworkConfig)(networkId);
    return network?.color || '#6b7280';
};
exports.getNetworkColor = getNetworkColor;
exports.CHART_COLORS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];
const isValidNetwork = (networkId) => {
    return networkId in exports.ALL_NETWORKS;
};
exports.isValidNetwork = isValidNetwork;
const isTestnetNetwork = (networkId) => {
    const network = (0, exports.getNetworkConfig)(networkId);
    return network?.isTestnet || false;
};
exports.isTestnetNetwork = isTestnetNetwork;
const isL2Network = (networkId) => {
    const network = (0, exports.getNetworkConfig)(networkId);
    return network?.isL2 || false;
};
exports.isL2Network = isL2Network;
//# sourceMappingURL=networks.js.map