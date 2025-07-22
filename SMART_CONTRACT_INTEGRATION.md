# Smart Contract Integration Guide

## Overview

This guide explains the complete frontend-backend sync workflow for benchmarking smart contracts using Reown AppKit, Wagmi, and our custom ABI service.

## Architecture

```
Frontend (Next.js + Wagmi + Reown AppKit)
    ↓
ABI Service (Frontend)
    ↓
Backend API (NestJS)
    ↓
Block Explorer APIs (Etherscan, Arbiscan, etc.)
```

## Workflow

### 1. Contract Validation (Backend)

**Backend ABI Service** (`/backend/src/abi/abi.service.ts`):
- Fetches contract ABIs from block explorers
- Validates contract verification status
- Caches ABIs for performance
- Supports multiple networks (Sepolia, Arbitrum Sepolia, etc.)

**API Endpoint**: `GET /api/abi?address=0x...&chainId=11155111`

### 2. Frontend Integration

**ABI Service** (`/frontend/src/lib/abiService.ts`):
- Calls backend API to validate contracts
- Checks backend health before requests
- Provides detailed error messages
- Validates contract has writable functions

**BenchmarkConfigTab** (`/frontend/src/components/BenchmarkConfigTab.tsx`):
- Validates contract addresses
- Fetches ABI through backend
- Only adds verified contracts with writable functions
- Shows clear error messages for invalid contracts

### 3. Smart Contract Interaction

**Wagmi Hooks Used**:
- `useReadContract` - For reading contract state (free)
- `useWriteContract` - For writing to contracts (requires gas)
- `useWaitForTransactionReceipt` - For transaction confirmation
- `usePublicClient` - For blockchain interactions

**Benchmark Hook** (`/frontend/src/hooks/useWalletBenchmark.ts`):
- Uses Wagmi hooks for all contract interactions
- Handles network switching with Reown AppKit
- Generates appropriate mock parameters for functions
- Tracks gas usage and execution times
- Provides detailed transaction feedback

## Example: Storage Contract Demo

### Contract Details
- **Address**: `0xEe6D291CC60d7CeD6627fA4cd8506912245c8cA4`
- **Network**: Sepolia Testnet
- **Functions**: `store(uint256)`, `retrieve()`

### Implementation

```typescript
// Reading from contract (free)
const { data, refetch } = useReadContract({
  address: STORAGE_CONTRACT_ADDRESS,
  abi: STORAGE_ABI,
  functionName: 'retrieve',
  query: { enabled: false }
});

// Writing to contract (requires gas)
const { writeContract, data: txHash } = useWriteContract();

const handleWrite = () => {
  writeContract({
    address: STORAGE_CONTRACT_ADDRESS,
    abi: STORAGE_ABI,
    functionName: 'store',
    args: [BigInt(123)]
  });
};

// Wait for confirmation
const { isSuccess } = useWaitForTransactionReceipt({
  hash: txHash
});
```

## Configuration

### Backend Environment (`.env`)
```env
# Required for ABI fetching
ETHERSCAN_API_KEY=your_api_key_here
PORT=3001
NODE_ENV=development
```

### Frontend Environment (`.env.local`)
```env
# Backend connection
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Reown AppKit
NEXT_PUBLIC_PROJECT_ID=your_project_id_here

# Debug logging
NEXT_PUBLIC_DEBUG_LOGS=true
```

## Supported Networks

- **Sepolia Testnet** (11155111)
- **Arbitrum Sepolia** (421614)
- **Optimism Sepolia** (11155420)
- **Base Sepolia** (84532)
- **Polygon Amoy** (80002)
- **Polygon zkEVM Cardona** (2442)
- **zkSync Sepolia** (300)

## Error Handling

### Contract Validation Errors
- **Not Verified**: Contract source code not verified on block explorer
- **No Writable Functions**: Contract has no functions available for benchmarking
- **Invalid Address**: Address format validation failed
- **Network Not Supported**: Chain ID not supported by backend
- **API Rate Limit**: Block explorer API rate limit exceeded

### Transaction Errors
- **User Rejected**: User declined transaction in wallet
- **Insufficient Funds**: Not enough ETH for gas fees
- **Execution Reverted**: Contract function execution failed
- **Network Mismatch**: Wrong network selected in wallet

## Best Practices

### 1. Contract Validation
- Always validate contracts through backend before adding
- Check for writable functions before benchmarking
- Provide clear error messages to users

### 2. Transaction Handling
- Use proper BigInt for uint256 parameters
- Wait for transaction receipts to get gas usage
- Handle all possible error scenarios
- Add delays between transactions to avoid nonce issues

### 3. Network Management
- Use Reown AppKit for network switching
- Validate network before contract interactions
- Handle network switch timeouts gracefully

### 4. User Experience
- Show transaction progress with loading states
- Display transaction hashes for transparency
- Provide helpful instructions and error messages
- Auto-refresh data after successful transactions

## Testing

### 1. Backend Health Check
```bash
curl http://localhost:3001/api/abi/health
```

### 2. ABI Fetching
```bash
curl "http://localhost:3001/api/abi?address=0xEe6D291CC60d7CeD6627fA4cd8506912245c8cA4&chainId=11155111"
```

### 3. Frontend Integration
1. Connect wallet to Sepolia testnet
2. Add storage contract address in benchmark config
3. Verify ABI is fetched successfully
4. Run benchmark with `store` function
5. Check transaction confirmation and gas usage

## Troubleshooting

### Backend Issues
- **API Key Invalid**: Check `ETHERSCAN_API_KEY` in backend `.env`
- **CORS Errors**: Ensure backend allows frontend origin
- **Rate Limits**: Wait before retrying API calls

### Frontend Issues
- **Network Errors**: Check `NEXT_PUBLIC_BACKEND_URL` configuration
- **Wallet Connection**: Ensure Reown AppKit is properly initialized
- **Transaction Failures**: Check gas fees and network selection

### Common Solutions
- Restart both frontend and backend servers
- Clear browser cache and wallet cache
- Check network connectivity
- Verify environment variables are set correctly

## Future Enhancements

1. **Contract Name Resolution**: Fetch contract names from block explorers
2. **Function Parameter UI**: Dynamic UI for complex function parameters
3. **Gas Estimation**: Pre-estimate gas costs before transactions
4. **Batch Transactions**: Support for multiple transactions in one batch
5. **Historical Data**: Store and analyze historical benchmark results

This integration provides a robust foundation for smart contract benchmarking with proper error handling, user feedback, and scalable architecture.