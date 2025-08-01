import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-viem";
import "hardhat-gas-reporter"
const { vars } = require("hardhat/config");

const ALCHEMY_API_KEY = vars.get("ALCHEMY_API_KEY");
const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY");
const COINMARKETCAP_API_KEY = vars.get("COINMARKETCAP_API_KEY");

// Dynamic forking configuration - will be set by the live benchmarker service
const getForkingConfig = () => {
  const forkUrl = process.env.FORK_URL;
  const forkBlockNumber = process.env.FORK_BLOCK_NUMBER;
  
  if (!forkUrl) {
    return undefined;
  }
  
  const config: any = { url: forkUrl };
  if (forkBlockNumber && forkBlockNumber !== 'latest') {
    config.blockNumber = parseInt(forkBlockNumber, 10);
  }
  
  return config;
};

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000
      }
    }
  },
  networks: {
    hardhat: {
      forking: getForkingConfig(),
      accounts: {
        count: 20,
        accountsBalance: "10000000000000000000000" // 10,000 ETH per account
      },
      mining: {
        auto: true,
        interval: 0
      },
      blockGasLimit: 30000000 // Set realistic gas limit (30M) for forked networks
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: "remote"
    }
  },
  gasReporter: {
    enabled: true,
    currency:"USD",
    outputJSONFile: "output/json/gas-report-scroll.json",
    outputFile: "output/markdowns/gas-report-scroll.md",
    outputJSON:true,
    gasPrice:0.0031,
    baseFee:0.7,
    blobBaseFee:1e9,
    token:"ETH",
    tokenPrice:"3720",
    noColors:true,
    coinmarketcap: COINMARKETCAP_API_KEY,
    etherscan: ETHERSCAN_API_KEY,
    currencyDisplayPrecision:8,
    suppressTerminalOutput:true,
    reportFormat:"markdown"
  }
};

export default config;
