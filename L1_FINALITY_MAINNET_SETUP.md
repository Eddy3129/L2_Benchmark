# L1 Finality Mainnet Setup Guide

## Overview

This guide explains how to set up real L1 finality tracking for mainnet networks using free Alchemy RPC endpoints. The system now supports both testnet and mainnet L1 finality monitoring without requiring wallet transactions or real fees.

## 🚀 Quick Start

### 1. Environment Configuration

Copy the example environment file and configure your RPC URLs:

```bash
cp .env.example .env
```

Edit `.env` with your preferred RPC providers:

```bash
# Mainnet RPC URLs - Using Alchemy Free Tier (2M requests/month)
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY
OPTIMISM_RPC_URL=https://opt-mainnet.g.alchemy.com/v2/YOUR_API_KEY
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
POLYGON_ZKEVM_MAINNET_RPC_URL=https://polygonzkevm-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ZKSYNC_ERA_RPC_URL=https://zksync-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Optimization Settings
L1_FINALITY_POLLING_INTERVAL=60  # Check every 60 seconds (reduced from 15s)
ENABLE_RPC_CACHING=true          # Cache responses for 30 seconds
RPC_CACHE_TTL=30
MAX_CONCURRENT_RPC_REQUESTS=5    # Limit concurrent requests
```

### 2. Get Free Alchemy API Keys

1. Visit [Alchemy.com](https://www.alchemy.com/)
2. Sign up for a free account
3. Create apps for each network you want to monitor
4. Copy the API keys and replace `YOUR_API_KEY` in your `.env` file

**Free Tier Limits:**
- 2M requests per month per app
- No credit card required
- Sufficient for L1 finality tracking

### 3. Start the Application

```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### 4. Access L1 Finality Tracking

Open http://localhost:3000/l1-finality and select a mainnet network:

- **Arbitrum One (Mainnet)** - Real L1 finality tracking
- **Optimism (Mainnet)** - Real L1 finality tracking
- **Base (Mainnet)** - Real L1 finality tracking
- **Polygon zkEVM (Mainnet)** - Real L1 finality tracking
- **zkSync Era (Mainnet)** - Real L1 finality tracking

## 📊 Supported Networks

### Mainnet Networks (Real L1 Finality)

| Network | L1 Network | Batch Poster Addresses | Status |
|---------|------------|------------------------|--------|
| Arbitrum One | Ethereum | `0x1c479675ad559DC151F6Ec7ed3FbF8ceE79582B6`<br>`0x4c6f947Ae67F572afa4ae0730947DE7C874F95Ef` | ✅ Ready |
| Optimism | Ethereum | `0x6887246668a3b87F54DeB3b94Ba47a6f63F32985`<br>`0x473300df21D047806A082244b417f96b32f13A33` | ✅ Ready |
| Base | Ethereum | `0x5050F69a9786F081509234F1a7F4684b5E5b76C9`<br>`0x99199a22125034c808ff20f377d856DE6329D675` | ✅ Ready |
| Polygon zkEVM | Ethereum | `0x148Ee7dAF16574cD020aFa34CC658f8F3fbd2800`<br>`0x5132A183E9F3CB7C848b0AAC5Ae0c4f0491B7aB2` | ✅ Ready |
| zkSync Era | Ethereum | `0x3527439923a63F8C13CF72b8Fe80a77f6e508A06`<br>`0xa0425d71cB1D6fb80E65a5361a04096E0672De03` | ✅ Ready |

### Testnet Networks (For Testing)

| Network | L1 Network | Status |
|---------|------------|--------|
| Arbitrum Sepolia | Sepolia | ✅ Ready |
| Optimism Sepolia | Sepolia | ✅ Ready |
| Base Sepolia | Sepolia | ✅ Ready |
| Polygon zkEVM Testnet | Sepolia | ✅ Ready |

## 🔧 Cost Optimization Features

### 1. Reduced Polling Frequency
- **Default:** 60-second intervals (vs 15-second for testnets)
- **Configurable:** Set `L1_FINALITY_POLLING_INTERVAL` in `.env`
- **Impact:** 75% reduction in API calls

### 2. RPC Response Caching
- **Enabled:** `ENABLE_RPC_CACHING=true`
- **TTL:** 30 seconds (configurable via `RPC_CACHE_TTL`)
- **Impact:** Reduces duplicate requests for same block data

### 3. Concurrent Request Limiting
- **Limit:** 5 concurrent requests (configurable via `MAX_CONCURRENT_RPC_REQUESTS`)
- **Impact:** Prevents rate limiting and improves reliability

### 4. Smart Block Range Monitoring
- **Strategy:** Monitor last 3 blocks instead of 5
- **Impact:** 40% reduction in block queries
- **Reliability:** Still captures all batch transactions

## 📈 Expected Performance

### API Usage Estimates (Per Network, Per Hour)

| Optimization Level | API Calls/Hour | Daily Calls | Monthly Calls |
|-------------------|----------------|-------------|---------------|
| **Optimized (Current)** | 120 | 2,880 | 86,400 |
| Standard | 480 | 11,520 | 345,600 |
| Aggressive | 1,200 | 28,800 | 864,000 |

### Free Tier Capacity
- **Alchemy Free:** 2M requests/month
- **Optimized Setup:** ~86K requests/month per network
- **Capacity:** Monitor up to **23 networks** simultaneously
- **Recommended:** Start with 2-3 networks

## 🛡️ Security & Safety

### ✅ What This Setup Does NOT Require
- ❌ No wallet private keys for mainnet
- ❌ No real ETH or token transactions
- ❌ No gas fees or transaction costs
- ❌ No smart contract interactions
- ❌ No credit card or payment information

### ✅ What This Setup DOES
- ✅ **Read-only** blockchain monitoring
- ✅ Track batch posting transactions
- ✅ Calculate L1 finality metrics
- ✅ Store historical data locally
- ✅ Provide real-time insights

### 🔒 Data Privacy
- All data stored locally in your database
- No sensitive information transmitted
- RPC calls are standard blockchain queries
- No personal or financial data required

## 🚀 Advanced Configuration

### Multi-Network Monitoring

To monitor multiple networks simultaneously:

```bash
# Set different polling intervals per network type
L1_FINALITY_POLLING_INTERVAL=60     # Mainnet (conservative)
TESTNET_POLLING_INTERVAL=30         # Testnet (more frequent)

# Enable advanced caching
ENABLE_RPC_CACHING=true
RPC_CACHE_TTL=60                     # Cache for 1 minute

# Rate limiting
MAX_CONCURRENT_RPC_REQUESTS=3       # Conservative for free tier
RATE_LIMIT_DELAY_MS=1000            # 1 second between batches
```

### Provider Rotation (Coming Soon)

```bash
# Multiple providers for redundancy
ETHEREUM_RPC_URL_PRIMARY=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
ETHEREUM_RPC_URL_SECONDARY=https://mainnet.infura.io/v3/YOUR_KEY
ETHEREUM_RPC_URL_TERTIARY=https://rpc.ankr.com/eth

# Automatic failover
ENABLE_PROVIDER_ROTATION=true
FAILOVER_THRESHOLD=3                 # Switch after 3 failures
```

## 📊 Monitoring Dashboard

### Real-Time Metrics
- **Batch Detection Rate:** Batches found per hour
- **L1 Finality Time:** Average time to finality
- **API Usage:** Requests per hour/day
- **Error Rate:** Failed requests percentage
- **Cost Tracking:** Estimated monthly usage

### Historical Analysis
- **Finality Trends:** Track improvements over time
- **Network Comparison:** Compare L2 performance
- **Peak Usage:** Identify high-activity periods
- **Optimization Impact:** Measure cost savings

## 🔧 Troubleshooting

### Common Issues

1. **Rate Limiting**
   ```bash
   # Increase polling interval
   L1_FINALITY_POLLING_INTERVAL=120
   
   # Reduce concurrent requests
   MAX_CONCURRENT_RPC_REQUESTS=2
   ```

2. **Missing Batches**
   ```bash
   # Increase block range
   BLOCK_RANGE_SIZE=5
   
   # Reduce polling interval
   L1_FINALITY_POLLING_INTERVAL=30
   ```

3. **High API Usage**
   ```bash
   # Enable aggressive caching
   RPC_CACHE_TTL=120
   
   # Monitor fewer networks
   # Focus on 1-2 networks initially
   ```

### Error Codes
- **429:** Rate limited - increase polling interval
- **403:** Invalid API key - check your Alchemy setup
- **500:** RPC provider issue - try different provider

## 🎯 Next Steps

1. **Start Small:** Begin with 1-2 mainnet networks
2. **Monitor Usage:** Track API consumption in first week
3. **Optimize:** Adjust polling intervals based on needs
4. **Scale Up:** Add more networks as comfortable
5. **Upgrade:** Consider paid plans for higher volume

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the application logs
3. Verify your `.env` configuration
4. Test with testnet networks first

---

**🎉 You're now ready to track real L1 finality on mainnet networks without any costs or wallet transactions!**