export interface NetworkConfig {
    id: string;
    name: string;
    displayName: string;
    chainId: number;
    rpcUrl: string;
    explorerUrl: string;
    explorerApiUrl?: string;
    explorerApiKey?: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    type: 'mainnet' | 'testnet' | 'l2';
    category: 'ethereum' | 'arbitrum' | 'optimism' | 'polygon' | 'base' | 'zksync' | 'scroll' | 'linea' | 'ink';
    color: string;
    blockTime: number;
    gasLimit: number;
    finalityBlocks: number;
    parentChain?: string;
    bridgeContract?: string;
    sequencerUrl?: string;
    isTestnet: boolean;
    isL2: boolean;
}
export declare const TESTNET_NETWORKS: Record<string, NetworkConfig>;
export declare const MAINNET_NETWORKS: Record<string, NetworkConfig>;
export declare const ALL_NETWORKS: Record<string, NetworkConfig>;
export declare const getNetworkConfig: (networkId: string) => NetworkConfig | undefined;
export declare const getTestnetNetworks: () => NetworkConfig[];
export declare const getMainnetNetworks: () => NetworkConfig[];
export declare const getL2Networks: () => NetworkConfig[];
export declare const getNetworksByCategory: (category: NetworkConfig["category"]) => NetworkConfig[];
export declare const getNetworkByChainId: (chainId: number) => NetworkConfig | undefined;
export declare const createNetworkConfig: () => {
    networks: NetworkConfig[];
};
export declare const getNetworkDisplayName: (networkId: string) => string;
export declare const getNetworkColor: (networkId: string) => string;
export declare const CHART_COLORS: string[];
export declare const isValidNetwork: (networkId: string) => boolean;
export declare const isTestnetNetwork: (networkId: string) => boolean;
export declare const isL2Network: (networkId: string) => boolean;
