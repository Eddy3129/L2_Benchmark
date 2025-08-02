# LayerTool - Multi-Chain Gas Analysis Platform

![LayerTool Banner](https://img.shields.io/badge/LayerTool-Gas%20Analysis%20Platform-blue?style=for-the-badge)

LayerTool is a comprehensive blockchain gas analysis platform designed for developers, researchers, and DeFi enthusiasts to analyze, compare, and optimize smart contract deployment and execution costs across multiple Layer 2 networks.

## 🚀 Key Features

### 1. **Multi-Chain Gas Estimator**
- **Real-time Cost Analysis**: Compare deployment and execution costs across 9+ networks
- **Supported Networks**: Ethereum, Arbitrum, Optimism, Base, Polygon, zkSync Era, Scroll, Linea, Ink
- **Smart Contract Templates**: Pre-built templates for ERC20, ERC721, MultiSig, Staking, and Auction contracts
- **L1/L2 Cost Breakdown**: Detailed analysis of L1 data costs vs L2 execution costs
- **Confidence Levels**: Adjustable confidence levels (50%-99%) for gas price predictions
- **Export Capabilities**: CSV export for further analysis

### 2. **Live Network Fork Testing**
- **Mainnet Forking**: Real-time testing using Hardhat network forking with live gas prices
- **Empirical Analysis**: Deploy and execute contracts on forked mainnet environments
- **Real Gas Metrics**: Actual gas consumption measurement with current network conditions
- **Function Execution Testing**: Test multiple function calls with parameter customization
- **Network State Analysis**: Block information, gas limits, and utilization metrics
- **Fee Composition Breakdown**: Base fees, priority fees, and L1 data fees analysis

### 3. **Real-Time Gas Dashboard**
- **Multi-Chain Monitoring**: Live gas price tracking across all supported networks
- **Interactive Charts**: Base fees, priority fees, and transaction costs visualization
- **Network Comparison**: Side-by-side gas price comparisons
- **Historical Data**: Store and analyze gas price trends over time
- **Auto-refresh**: Real-time updates every 30 seconds

### 4. **Comprehensive Analytics & Reports**
- **Historical Data Analysis**: Access stored gas monitoring, estimation, and benchmark data
- **Data Visualization**: Interactive charts and graphs for trend analysis
- **Export Functionality**: CSV exports for all data types
- **Filtering & Search**: Date range filtering and network-specific analysis
- **Statistical Insights**: Average costs, savings calculations, and performance metrics

### 5. **Advanced Data Analysis Tools**
- **Python Analytics**: Automated chart generation and statistical analysis
- **Cost Variability Analysis**: Standard deviation and cost distribution charts
- **Network Performance Metrics**: Deployment cost rankings and efficiency comparisons
- **Trend Analysis**: 30-day averages and historical cost patterns

## 🏗️ Architecture

### Frontend (Next.js 15 + TypeScript)
- **Framework**: Next.js 15 with App Router
- **UI Components**: Custom components with Tailwind CSS and Radix UI
- **Charts**: Chart.js and Recharts for data visualization
- **State Management**: React hooks and context
- **API Integration**: Axios for backend communication

### Backend (NestJS + TypeScript)
- **Framework**: NestJS with modular architecture
- **Database**: PostgreSQL with TypeORM
- **Blockchain Integration**: Ethers.js for smart contract interactions
- **Network Forking**: Hardhat for mainnet forking capabilities
- **Gas Price APIs**: Blocknative and CoinGecko integration
- **Data Export**: CSV generation and file management

### Smart Contracts (Solidity)
- **Development**: Hardhat framework with OpenZeppelin contracts
- **Templates**: 6 pre-built contract templates
- **Testing**: Comprehensive test suites for all contracts
- **Gas Reporting**: Built-in gas usage analysis

### Data Analysis (Python)
- **Libraries**: Pandas, Matplotlib, Seaborn
- **Visualizations**: Cost comparison charts, trend analysis
- **Statistical Analysis**: Average costs, variability metrics
- **Export Formats**: PNG charts and CSV data

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 17+
- Python 3.8+ (for data analysis)
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Capstone
```

### 2. Database Setup
```bash
# Start PostgreSQL with Docker
cd backend
docker-compose up -d

# Or install PostgreSQL manually and create database
createdb benchmark_db
```

### 3. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration:
# - Database credentials
# - API keys (Alchemy, Etherscan, Blocknative, CoinGecko)
# - RPC URLs for networks

# Start the backend server
npm run start:dev
```

### 4. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 5. Hardhat Setup (Optional)
```bash
cd hardhat

# Install dependencies
npm install

# Configure Hardhat variables
npx hardhat vars set ALCHEMY_API_KEY your_alchemy_key
npx hardhat vars set ETHERSCAN_API_KEY your_etherscan_key

# Run tests
npm test
```

### 6. Data Analysis Setup (Optional)
```bash
cd data_analysis

# Install Python dependencies
pip install pandas matplotlib seaborn

# Run analysis scripts
python avg_cost.py
python deployment.py
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=benchmark_db

# API Keys
ALCHEMY_API_KEY=your_alchemy_key
ETHERSCAN_API_KEY=your_etherscan_key
BLOCKNATIVE_API_KEY=your_blocknative_key
COINGECKO_API_KEY=your_coingecko_key

# Application
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

#### Frontend
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
```

### Network Configuration
The platform supports the following networks out of the box:
- **Ethereum Mainnet** (Chain ID: 1)
- **Arbitrum One** (Chain ID: 42161)
- **Optimism** (Chain ID: 10)
- **Base** (Chain ID: 8453)
- **Polygon PoS** (Chain ID: 137)
- **zkSync Era** (Chain ID: 324)
- **Scroll** (Chain ID: 534352)
- **Linea** (Chain ID: 59144)
- **Ink** (Chain ID: 57073)

## 📊 Usage Examples

### 1. Gas Estimation Analysis
1. Navigate to `/estimator`
2. Select or write a smart contract
3. Choose target networks for analysis
4. Set confidence level for gas price predictions
5. Run analysis and view detailed cost breakdowns
6. Export results to CSV for further analysis

### 2. Live Network Fork Testing
1. Navigate to `/network-fork`
2. Set up network forking configuration
3. Deploy contracts on forked mainnet
4. Execute function calls with real parameters
5. Analyze actual gas consumption and costs
6. View detailed network metrics and fee breakdowns

### 3. Real-Time Gas Monitoring
1. Navigate to `/` (Dashboard)
2. Monitor live gas prices across networks
3. Store current data for historical analysis
4. View interactive charts and comparisons
5. Export monitoring data

### 4. Historical Data Analysis
1. Navigate to `/analysis`
2. Filter data by date range and network
3. View stored gas monitoring, estimation, and benchmark data
4. Export filtered data for external analysis
5. Generate reports and insights

## 🧪 Smart Contract Templates

The platform includes 6 pre-built smart contract templates:

1. **Basic ERC20 Token** - Simple token with mint/burn functionality
2. **Advanced ERC20 Token** - Token with pause, blacklist, and ownership features
3. **ERC721 NFT** - Basic NFT contract with minting capabilities
4. **MultiSig Wallet** - Multi-signature wallet for secure transactions
5. **Simple Staking** - Basic staking contract with rewards
6. **Simple Auction** - Auction contract with bidding and withdrawal

## 📈 Data Analysis Features

### Automated Chart Generation
- Cost comparison bar charts
- Network performance rankings
- Historical trend analysis
- Cost variability metrics

### Statistical Analysis
- Average deployment costs by network
- Cost savings calculations vs Ethereum
- Standard deviation analysis
- Performance benchmarking

### Export Capabilities
- CSV data exports
- High-resolution chart images
- Comprehensive statistical reports