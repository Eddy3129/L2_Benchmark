export declare const STANDARD_ABIS: {
    ERC20: {
        inputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        name: string;
        outputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        stateMutability: string;
        type: string;
    }[];
    ERC721: {
        inputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        name: string;
        outputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        stateMutability: string;
        type: string;
    }[];
    MULTISIG: {
        inputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        name: string;
        outputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        stateMutability: string;
        type: string;
    }[];
    STAKING: {
        inputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        name: string;
        outputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        stateMutability: string;
        type: string;
    }[];
};
export interface ContractDeployment {
    address: string;
    name: string;
    abi: any[];
    type: 'ERC20' | 'ERC721' | 'MULTISIG' | 'STAKING' | 'CUSTOM';
    verified: boolean;
    deploymentBlock?: number;
}
export declare const TEST_CONTRACTS: Record<string, Record<string, ContractDeployment>>;
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
export declare const CONTRACT_TEMPLATES: ContractTemplate[];
export declare const getContractDeployment: (networkId: string, contractId: string) => ContractDeployment | undefined;
export declare const getNetworkContracts: (networkId: string) => Record<string, ContractDeployment>;
export declare const getAllDeployedContracts: () => Array<{
    networkId: string;
    contractId: string;
    deployment: ContractDeployment;
}>;
export declare const getContractTemplate: (templateId: string) => ContractTemplate | undefined;
export declare const getContractsByType: (type: ContractDeployment["type"]) => Array<{
    networkId: string;
    contractId: string;
    deployment: ContractDeployment;
}>;
export interface BenchmarkFunction {
    name: string;
    inputs: any[];
    stateMutability: string;
    type: string;
}
export declare const extractWritableFunctions: (abi: any[]) => BenchmarkFunction[];
export declare const extractReadableFunctions: (abi: any[]) => BenchmarkFunction[];
export declare const getDefaultBenchmarkFunctions: (contractType: ContractDeployment["type"]) => string[];
