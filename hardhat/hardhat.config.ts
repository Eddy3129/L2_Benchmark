import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-viem";
import "hardhat-gas-reporter"
const { vars } = require("hardhat/config");

const ALCHEMY_API_KEY = vars.get("ALCHEMY_API_KEY");
const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY");
const COINMARKETCAP_API_KEY = vars.get("COINMARKETCAP_API_KEY");

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
//   networks: {
//   hardhat: {
//     forking: {
//       url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
//     },
//   }
// },
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
