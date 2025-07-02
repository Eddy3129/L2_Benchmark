# Etherscan API Key Setup Guide

## Issue Resolution

You're getting the error `API key not configured for chain 421614` because the backend doesn't have an Etherscan API key configured. The ABI service needs this key to fetch contract ABIs from block explorers.

## Quick Fix Steps

### 1. Get a Free Etherscan API Key

1. Go to [Etherscan.io](https://etherscan.io/apis)
2. Create a free account if you don't have one
3. Navigate to "API Keys" section
4. Create a new API key (free tier allows 5 calls/second)
5. Copy your API key

### 2. Configure Your Backend

1. Open `backend/.env` file
2. Replace `your_etherscan_api_key_here` with your actual API key:
   ```env
   ETHERSCAN_API_KEY=YourActualApiKeyHere
   ```

### 3. Restart Your Backend

```bash
cd backend
npm run start:dev
```

## Why This Works

The backend ABI service is configured to:
- Use `ETHERSCAN_API_KEY` for Ethereum chains (1, 11155111, 17000)
- Use `ARBISCAN_API_KEY` OR fallback to `ETHERSCAN_API_KEY` for Arbitrum chains (42161, 421614)
- Use `ETHERSCAN_API_KEY` as the default fallback for all other chains

**For Arbitrum Sepolia (chain 421614):** Since you don't have `ARBISCAN_API_KEY` set, it will automatically use your `ETHERSCAN_API_KEY`, which works perfectly fine!

## Supported Networks

With just your Etherscan API key, you can fetch ABIs from:
- ✅ Ethereum Mainnet (1)
- ✅ Sepolia Testnet (11155111) 
- ✅ Holesky Testnet (17000)
- ✅ Arbitrum One (42161) - uses Etherscan key as fallback
- ✅ Arbitrum Sepolia (421614) - uses Etherscan key as fallback

## Optional: Dedicated Arbitrum API Key

If you want better rate limits for Arbitrum chains, you can also get an Arbiscan API key:

1. Go to [Arbiscan.io](https://arbiscan.io/apis)
2. Get a free API key
3. Add it to your `.env`:
   ```env
   ARBISCAN_API_KEY=YourArbiscanApiKeyHere
   ```

## Testing

After setting up your API key and restarting the backend:

1. Try fetching an ABI again in your frontend
2. Check backend logs for successful API calls
3. The error should be resolved!

## Security Note

- ✅ Your API keys are safely stored in the backend
- ✅ Frontend never exposes API keys
- ✅ No CORS issues with direct API calls
- ✅ Rate limiting and caching handled by backend

Your setup is secure and production-ready! 🚀