import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

const FullDeploy = buildModule("FullDeploy", (m) => {
  // Get the deployer address as the initial owner
  const initialOwner = m.getAccount(0);
  
  // Deployment parameters
  const initialSupply = m.getParameter("initialSupply", parseEther("1000000")); // 1M tokens
  const initialLiquidityA = m.getParameter("initialLiquidityA", parseEther("10000")); // 10K TokenA
  const initialLiquidityB = m.getParameter("initialLiquidityB", parseEther("10000")); // 10K TokenB
  
  // Deploy tokens first
  const tokenA = m.contract("TokenA", [initialOwner]);
  const tokenB = m.contract("TokenB", [initialOwner]);
  
  // Deploy NFT
  const name = m.getParameter("nftName", "MyNFT");
  const symbol = m.getParameter("nftSymbol", "MNFT");
  const myNFT = m.contract("MyNFT", [name, symbol]);
  
  // Deploy BasicPool
  const basicPool = m.contract("BasicPool", []);
  
  // Mint initial supply to deployer
  const mintA = m.call(tokenA, "mint", [initialOwner, initialSupply]);
  const mintB = m.call(tokenB, "mint", [initialOwner, initialSupply]);
  
  // Set up the pool with tokens (must happen before addLiquidity)
  const setTokenACall = m.call(basicPool, "setTokenA", [tokenA], {
    after: [mintA]
  });
  const setTokenBCall = m.call(basicPool, "setTokenB", [tokenB], {
    after: [mintB]
  });
  
  // Approve tokens for the pool (must happen after minting)
  const approveA = m.call(tokenA, "approve", [basicPool, initialLiquidityA], { 
    from: initialOwner,
    after: [mintA]
  });
  const approveB = m.call(tokenB, "approve", [basicPool, initialLiquidityB], { 
    from: initialOwner,
    after: [mintB]
  });
  
  // Add initial liquidity ONLY after tokens are set and approved
  const addLiquidityCall = m.call(basicPool, "addLiquidity", [initialLiquidityA, initialLiquidityB], { 
    from: initialOwner,
    after: [setTokenACall, setTokenBCall, approveA, approveB]
  });
  
  // Optional: Set a reasonable reward rate (can happen anytime)
  const rewardRate = m.getParameter("rewardRate", 100);
  m.call(basicPool, "setRewardRate", [rewardRate]);
  
  return { tokenA, tokenB, myNFT, basicPool };
});

export default FullDeploy;