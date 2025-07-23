# Hardhat Forking Project

This project contains a collection of Solidity smart contracts with comprehensive test suites.

## Contracts

1. **BasicToken**: A simple ERC20 token with minting and burning capabilities.
2. **AdvancedToken**: An ERC20 token with additional features like pausing and blacklisting.
3. **MultiSigWallet**: A wallet that requires multiple signatures to execute transactions.
4. **SimpleAuction**: A basic auction contract with bidding and withdrawal functionality.
5. **SimpleStaking**: A staking contract that rewards users for staking tokens.

## Setup

```bash
# Install dependencies
npm install
```

## Running Tests

### Run all tests

```bash
npm test
```

### Run tests for specific contracts

```bash
# Test BasicToken
npm run test:basic-token

# Test AdvancedToken
npm run test:advanced-token

# Test MultiSigWallet
npm run test:multi-sig-wallet

# Test SimpleAuction
npm run test:simple-auction

# Test SimpleStaking
npm run test:simple-staking
```

## Environment Variables

Create a `.env` file with the following variables or set them using Hardhat's built-in vars system:

```bash
npx hardhat --vars 'ALCHEMY_API_KEY=your_key,ETHERSCAN_API_KEY=your_key,COINMARKETCAP_API_KEY=your_key' test
```

## Gas Reporting

Gas reports are generated automatically when running tests and saved to `gas-report.txt`.

## Additional Commands

```shell
npx hardhat help
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.ts
```
