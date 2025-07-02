import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-verify";
import 'solidity-coverage';
import { vars } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337,
      gas: 12000000,
      gasPrice: 100000000, // 0.1 gwei (for gas usage testing only)
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        accountsBalance: "10000000000000000000000" // 10000 ETH
      }
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      gas: 12000000,
      gasPrice: 100000000 // 0.1 gwei (for gas usage testing only)
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${vars.get("ALCHEMY_API_KEY", "")}`,
      chainId: 11155111,
      accounts: [`0x${vars.get("PRIVATE_KEY")}`],
    },
    arbitrum_sepolia: {
      url: `https://arb-sepolia.g.alchemy.com/v2/${vars.get("ALCHEMY_API_KEY", "")}`,
      chainId: 421614,
      accounts: [`0x${vars.get("PRIVATE_KEY")}`],
    },
    optimism_sepolia: {
      url: `https://opt-sepolia.g.alchemy.com/v2/${vars.get("ALCHEMY_API_KEY", "")}`,
      chainId: 11155420,
      accounts: [`0x${vars.get("PRIVATE_KEY")}`],
    },
    base_sepolia: {
      url: `https://base-sepolia.g.alchemy.com/v2/${vars.get("ALCHEMY_API_KEY", "")}`,
      chainId: 84532,
      accounts: [`0x${vars.get("PRIVATE_KEY")}`],
    },
    polygon_amoy: {
      url: `https://polygon-amoy.g.alchemy.com/v2/${vars.get("ALCHEMY_API_KEY", "")}`,
      chainId: 80002,
      accounts: [`0x${vars.get("PRIVATE_KEY")}`],
    }
  },
  etherscan: {
    apiKey: vars.get("ETHERSCAN_API_KEY", "")
  },
  sourcify: {
    enabled: true
  }
};

export default config;
