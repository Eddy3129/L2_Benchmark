     
# Layer 2 Benchmarking Platform

A comprehensive blockchain application for testing and analyzing decentralized exchange (DEX) pool performance. This project combines smart contracts, a backend API, and a modern web interface to provide automated benchmarking and analysis of DeFi liquidity pool operations.

## 🚀 What This Project Does

### Core Features
- **Smart Contract Pool**: A custom AMM (Automated Market Maker) liquidity pool with reward mechanisms
- **Automated Benchmarking**: Run comprehensive performance tests on pool operations
- **Real-time Analytics**: Track gas usage, execution times, and transaction success rates
- **Data Visualization**: Interactive charts and graphs for performance analysis
- **Historical Analysis**: Store and compare benchmark results over time

### Smart Contracts
- **BasicPool**: Main AMM contract with liquidity provision, token swapping, and reward distribution
- **TokenA & TokenB**: ERC20 test tokens for pool operations
- **MyNFT**: NFT contract for additional testing scenarios

### Technology Stack
- **Frontend**: Next.js 15, React 19, TailwindCSS, Wagmi, Viem
- **Backend**: NestJS, TypeORM, PostgreSQL
- **Blockchain**: Hardhat, Solidity, OpenZeppelin
- **Visualization**: Chart.js, React-ChartJS-2

### Supported Networks
- **Ethereum**: Sepolia Testnet
- **Layer 2 Solutions**:
  - Arbitrum Sepolia
  - Optimism Sepolia
  - Base Sepolia
  - Polygon Amoy
  - Polygon zkEVM
  - zkSync Era Sepolia

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Docker (for PostgreSQL)
- MetaMask or compatible Web3 wallet

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/Eddy3129/L2_Benchmark.git
cd Capstone

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install

# Return to root
cd ..
```

### 2. Start PostgreSQL Database

```bash
# Navigate to backend directory
cd backend

# Start PostgreSQL with Docker
docker-compose up -d

# Verify database is running
docker-compose ps
```

### 3. Deploy Smart Contracts

```bash
# From root directory
# Start local Hardhat network
npx hardhat node

# In a new terminal, deploy contracts
npx hardhat ignition deploy ./ignition/modules/FullDeploy.ts --network localhost
```

### 4. Start Backend API

```bash
# Navigate to backend directory
cd backend

# Start in development mode
npm run start:dev

# Backend will be available at http://localhost:3001
```

### 5. Start Frontend Application

```bash
# Navigate to frontend directory
cd frontend

# Start development server
npm run dev

# Frontend will be available at http://localhost:3000
```

### 6. Configure MetaMask

1. Add local Hardhat network to MetaMask:
   - Network Name: Hardhat Local
   - RPC URL: http://localhost:8545
   - Chain ID: 31337
   - Currency Symbol: ETH

2. Import test accounts from Hardhat node output

## 📊 Usage

### Running Benchmarks

1. **Connect Wallet**: Use the navigation bar to connect your MetaMask wallet
2. **Get Test Tokens**: Use the pool interface to mint test tokens
3. **Approve Tokens**: Approve the pool contract to spend your tokens
4. **Run Benchmark**: Click "Run Comprehensive Benchmark" to start automated testing
5. **View Results**: Check the "Analysis" tab for detailed performance metrics

### Available Operations

- **Add Liquidity**: Provide tokens to the pool and earn LP tokens
- **Remove Liquidity**: Withdraw your tokens from the pool
- **Token Swaps**: Exchange TokenA for TokenB and vice versa
- **Claim Rewards**: Collect accumulated rewards from pool activities

### Analysis Features

- **Performance Metrics**: Gas usage, execution times, success rates
- **Historical Data**: Compare benchmark runs over time
- **Data Export**: Export results to CSV for external analysis
- **Interactive Charts**: Visualize trends and patterns

## 🗄️ Database Access

Access the PostgreSQL database:

```bash
# Using psql command line
psql -h localhost -p 5432 -U postgres -d benchmark_db
# Password: YOUR_PASSWORD

```

## 🧪 Testing

```bash
# Test smart contracts
npx hardhat test

# Test with gas reporting
REPORT_GAS=true npx hardhat test

# Test backend
cd backend
npm run test

# Test frontend
cd frontend
npm run lint
```

## 📁 Project Structure

```
Capstone/
├── contracts/          # Smart contracts
├── backend/           # NestJS API server
├── frontend/          # Next.js web application
├── test/             # Contract tests
├── ignition/         # Deployment scripts
└── hardhat.config.ts # Hardhat configuration
```

## 🔧 Configuration

- **Database**: Configure in `backend/docker-compose.yml`
- **Smart Contracts**: Update addresses in `frontend/src/lib/contracts.ts`
- **API Endpoints**: Modify in `frontend/src/lib/api.ts`

## 📈 Performance Monitoring

The platform tracks:
- Gas consumption per operation
- Transaction execution times
- Success/failure rates
- Pool state changes
- Reward distributions

All data is stored in PostgreSQL and visualized through the web interface for comprehensive performance analysis.

---

**Note**: This is a development/testing environment. Do not use with real funds or deploy to mainnet without proper security audits.
        