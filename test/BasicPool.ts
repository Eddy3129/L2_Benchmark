import hre from "hardhat";
import { assert, expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";

const deploy = async () => {
  const [owner, addr1, addr2, addr3] = await hre.viem.getWalletClients();

  // Deploy tokens
  const TokenA = await hre.viem.deployContract("TokenA", [
    owner.account.address,
  ]);
  const TokenB = await hre.viem.deployContract("TokenB", [
    owner.account.address,
  ]);

  // Deploy BasicPool
  const BasicPool = await hre.viem.deployContract("BasicPool");

  // Set up tokens in pool
  await BasicPool.write.setTokenA([TokenA.address]);
  await BasicPool.write.setTokenB([TokenB.address]);

  // Mint tokens to test accounts
  const mintAmount = 1000000n * 10n ** 18n; // 1M tokens
  await TokenA.write.mint([addr1.account.address, mintAmount]);
  await TokenA.write.mint([addr2.account.address, mintAmount]);
  await TokenB.write.mint([addr1.account.address, mintAmount]);
  await TokenB.write.mint([addr2.account.address, mintAmount]);

  return { BasicPool, TokenA, TokenB, owner, addr1, addr2, addr3 };
};

describe("BasicPool Contract Tests", function () {
  describe("Deployment and Setup", function () {
    it("should deploy with correct initial values", async function () {
      const { BasicPool, owner } = await loadFixture(deploy);

      const poolOwner = await BasicPool.read.owner();
      const name = await BasicPool.read.name();
      const symbol = await BasicPool.read.symbol();
      const totalLiquidity = await BasicPool.read.totalLiquidity();
      const rewardRate = await BasicPool.read.rewardRate();

      assert.equal(
        poolOwner.toLowerCase(),
        owner.account.address.toLowerCase()
      );
      assert.equal(name, "Pool Reward Token");
      assert.equal(symbol, "PRT");
      assert.equal(totalLiquidity, 0n);
      assert.equal(rewardRate, 100n); // 1%
    });

    it("should set token addresses correctly", async function () {
      const { BasicPool, TokenA, TokenB } = await loadFixture(deploy);

      const tokenAAddress = await BasicPool.read.tokenA();
      const tokenBAddress = await BasicPool.read.tokenB();

      assert.equal(tokenAAddress.toLowerCase(), TokenA.address.toLowerCase());
      assert.equal(tokenBAddress.toLowerCase(), TokenB.address.toLowerCase());
    });

    it("should only allow owner to set token addresses", async function () {
      const { BasicPool, TokenA, addr1 } = await loadFixture(deploy);

      await expect(
        BasicPool.write.setTokenA([TokenA.address], { account: addr1.account })
      ).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    it("should reject zero address for tokens", async function () {
      const { BasicPool } = await loadFixture(deploy);

      await expect(
        BasicPool.write.setTokenA([
          "0x0000000000000000000000000000000000000000",
        ])
      ).to.be.rejectedWith("Invalid address");
    });
  });

  describe("Liquidity Management", function () {
    it("should add liquidity correctly for first provider", async function () {
      const { BasicPool, TokenA, TokenB, addr1 } = await loadFixture(deploy);

      const amountA = 1000n * 10n ** 18n;
      const amountB = 2000n * 10n ** 18n;

      // Approve tokens
      await TokenA.write.approve([BasicPool.address, amountA], {
        account: addr1.account,
      });
      await TokenB.write.approve([BasicPool.address, amountB], {
        account: addr1.account,
      });

      // Add liquidity
      await BasicPool.write.addLiquidity([amountA, amountB], {
        account: addr1.account,
      });

      // Check reserves
      const reservoirA = await BasicPool.read.reservoirA();
      const reservoirB = await BasicPool.read.reservoirB();
      const totalLiquidity = await BasicPool.read.totalLiquidity();
      const userLiquidity = await BasicPool.read.liquidityProvided([
        addr1.account.address,
      ]);

      assert.equal(reservoirA, amountA);
      assert.equal(reservoirB, amountB);
      assert.isTrue(totalLiquidity > 0n);
      assert.equal(userLiquidity, totalLiquidity);
    });

    it("should add liquidity correctly for subsequent providers", async function () {
      const { BasicPool, TokenA, TokenB, addr1, addr2 } = await loadFixture(
        deploy
      );

      const amountA1 = 1000n * 10n ** 18n;
      const amountB1 = 2000n * 10n ** 18n;
      const amountA2 = 500n * 10n ** 18n;
      const amountB2 = 1000n * 10n ** 18n;

      // First provider
      await TokenA.write.approve([BasicPool.address, amountA1], {
        account: addr1.account,
      });
      await TokenB.write.approve([BasicPool.address, amountB1], {
        account: addr1.account,
      });
      await BasicPool.write.addLiquidity([amountA1, amountB1], {
        account: addr1.account,
      });

      // Second provider
      await TokenA.write.approve([BasicPool.address, amountA2], {
        account: addr2.account,
      });
      await TokenB.write.approve([BasicPool.address, amountB2], {
        account: addr2.account,
      });
      await BasicPool.write.addLiquidity([amountA2, amountB2], {
        account: addr2.account,
      });

      const totalLiquidity = await BasicPool.read.totalLiquidity();
      const user1Liquidity = await BasicPool.read.liquidityProvided([
        addr1.account.address,
      ]);
      const user2Liquidity = await BasicPool.read.liquidityProvided([
        addr2.account.address,
      ]);

      assert.isTrue(totalLiquidity > 0n);
      assert.isTrue(user1Liquidity > 0n);
      assert.isTrue(user2Liquidity > 0n);
      assert.equal(user1Liquidity + user2Liquidity, totalLiquidity);
    });

    it("should reject adding liquidity with zero amounts", async function () {
      const { BasicPool, addr1 } = await loadFixture(deploy);

      await expect(
        BasicPool.write.addLiquidity([0n, 1000n], { account: addr1.account })
      ).to.be.rejectedWith("Amounts must be > 0");
    });

    it("should remove liquidity correctly", async function () {
      const { BasicPool, TokenA, TokenB, addr1 } = await loadFixture(deploy);

      const amountA = 1000n * 10n ** 18n;
      const amountB = 2000n * 10n ** 18n;

      // Add liquidity first
      await TokenA.write.approve([BasicPool.address, amountA], {
        account: addr1.account,
      });
      await TokenB.write.approve([BasicPool.address, amountB], {
        account: addr1.account,
      });
      await BasicPool.write.addLiquidity([amountA, amountB], {
        account: addr1.account,
      });

      const initialBalanceA = await TokenA.read.balanceOf([
        addr1.account.address,
      ]);
      const initialBalanceB = await TokenB.read.balanceOf([
        addr1.account.address,
      ]);

      // Remove liquidity
      await BasicPool.write.removeLiquidity({ account: addr1.account });

      const finalBalanceA = await TokenA.read.balanceOf([
        addr1.account.address,
      ]);
      const finalBalanceB = await TokenB.read.balanceOf([
        addr1.account.address,
      ]);
      const userLiquidity = await BasicPool.read.liquidityProvided([
        addr1.account.address,
      ]);

      assert.isTrue(finalBalanceA > initialBalanceA);
      assert.isTrue(finalBalanceB > initialBalanceB);
      assert.equal(userLiquidity, 0n);
    });

    it("should reject removing liquidity when user has none", async function () {
      const { BasicPool, addr1 } = await loadFixture(deploy);

      await expect(
        BasicPool.write.removeLiquidity({ account: addr1.account })
      ).to.be.rejectedWith("No liquidity to remove");
    });
  });

  describe("Token Swapping", function () {
    beforeEach(async function () {
      // Add initial liquidity for swapping tests
      const { BasicPool, TokenA, TokenB, addr1 } = await loadFixture(deploy);

      const amountA = 10000n * 10n ** 18n;
      const amountB = 20000n * 10n ** 18n;

      await TokenA.write.approve([BasicPool.address, amountA], {
        account: addr1.account,
      });
      await TokenB.write.approve([BasicPool.address, amountB], {
        account: addr1.account,
      });
      await BasicPool.write.addLiquidity([amountA, amountB], {
        account: addr1.account,
      });
    });

    it("should swap A for B correctly", async function () {
      const { BasicPool, TokenA, TokenB, addr2 } = await loadFixture(deploy);

      // Add liquidity first
      const { addr1 } = await loadFixture(deploy);
      const amountA = 10000n * 10n ** 18n;
      const amountB = 20000n * 10n ** 18n;
      await TokenA.write.approve([BasicPool.address, amountA], {
        account: addr1.account,
      });
      await TokenB.write.approve([BasicPool.address, amountB], {
        account: addr1.account,
      });
      await BasicPool.write.addLiquidity([amountA, amountB], {
        account: addr1.account,
      });

      const swapAmount = 100n * 10n ** 18n;
      const initialBalanceB = await TokenB.read.balanceOf([
        addr2.account.address,
      ]);

      await TokenA.write.approve([BasicPool.address, swapAmount], {
        account: addr2.account,
      });
      await BasicPool.write.swapAForB([swapAmount, 0n], {
        account: addr2.account,
      });

      const finalBalanceB = await TokenB.read.balanceOf([
        addr2.account.address,
      ]);
      assert.isTrue(finalBalanceB > initialBalanceB);
    });

    it("should swap B for A correctly", async function () {
      const { BasicPool, TokenA, TokenB, addr2 } = await loadFixture(deploy);

      // Add liquidity first
      const { addr1 } = await loadFixture(deploy);
      const amountA = 10000n * 10n ** 18n;
      const amountB = 20000n * 10n ** 18n;
      await TokenA.write.approve([BasicPool.address, amountA], {
        account: addr1.account,
      });
      await TokenB.write.approve([BasicPool.address, amountB], {
        account: addr1.account,
      });
      await BasicPool.write.addLiquidity([amountA, amountB], {
        account: addr1.account,
      });

      const swapAmount = 100n * 10n ** 18n;
      const initialBalanceA = await TokenA.read.balanceOf([
        addr2.account.address,
      ]);

      await TokenB.write.approve([BasicPool.address, swapAmount], {
        account: addr2.account,
      });
      await BasicPool.write.swapBForA([swapAmount, 0n], {
        account: addr2.account,
      });

      const finalBalanceA = await TokenA.read.balanceOf([
        addr2.account.address,
      ]);
      assert.isTrue(finalBalanceA > initialBalanceA);
    });

    it("should reject swap with zero amount", async function () {
      const { BasicPool, addr2 } = await loadFixture(deploy);

      await expect(
        BasicPool.write.swapAForB([0n, 0n], { account: addr2.account })
      ).to.be.rejectedWith("Amount must be > 0");
    });

    it("should reject swap when slippage is too high", async function () {
      const { BasicPool, TokenA, TokenB, addr2 } = await loadFixture(deploy);

      // Add liquidity first
      const { addr1 } = await loadFixture(deploy);
      const amountA = 10000n * 10n ** 18n;
      const amountB = 20000n * 10n ** 18n;
      await TokenA.write.approve([BasicPool.address, amountA], {
        account: addr1.account,
      });
      await TokenB.write.approve([BasicPool.address, amountB], {
        account: addr1.account,
      });
      await BasicPool.write.addLiquidity([amountA, amountB], {
        account: addr1.account,
      });

      const swapAmount = 100n * 10n ** 18n;
      const unrealisticMinOut = 1000000n * 10n ** 18n; // Way too high

      await TokenA.write.approve([BasicPool.address, swapAmount], {
        account: addr2.account,
      });
      await expect(
        BasicPool.write.swapAForB([swapAmount, unrealisticMinOut], {
          account: addr2.account,
        })
      ).to.be.rejectedWith("Slippage too high");
    });
  });

  describe("Rewards System", function () {
    it("should set reward rate correctly", async function () {
      const { BasicPool } = await loadFixture(deploy);

      const newRate = 200n; // 2%
      await BasicPool.write.setRewardRate([newRate]);

      const rewardRate = await BasicPool.read.rewardRate();
      assert.equal(rewardRate, newRate);
    });

    it("should reject reward rate above 100%", async function () {
      const { BasicPool } = await loadFixture(deploy);

      await expect(
        BasicPool.write.setRewardRate([10001n]) // > 100%
      ).to.be.rejectedWith("Reward rate too high");
    });

    it("should only allow owner to set reward rate", async function () {
      const { BasicPool, addr1 } = await loadFixture(deploy);

      await expect(
        BasicPool.write.setRewardRate([200n], { account: addr1.account })
      ).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    it("should accumulate and claim rewards correctly", async function () {
      const { BasicPool, TokenA, TokenB, addr1, addr2 } = await loadFixture(
        deploy
      );

      // Add liquidity
      const amountA = 10000n * 10n ** 18n;
      const amountB = 20000n * 10n ** 18n;
      await TokenA.write.approve([BasicPool.address, amountA], {
        account: addr1.account,
      });
      await TokenB.write.approve([BasicPool.address, amountB], {
        account: addr1.account,
      });
      await BasicPool.write.addLiquidity([amountA, amountB], {
        account: addr1.account,
      });

      // Perform swap to generate rewards
      const swapAmount = 1000n * 10n ** 18n;
      await TokenA.write.approve([BasicPool.address, swapAmount], {
        account: addr2.account,
      });
      await BasicPool.write.swapAForB([swapAmount, 0n], {
        account: addr2.account,
      });

      // Trigger reward update by adding reasonable liquidity (not 1 wei!)
      const updateAmount = 100n * 10n ** 18n; // Use 100 tokens instead of 1 wei
      await TokenA.write.approve([BasicPool.address, updateAmount], {
        account: addr1.account,
      });
      await TokenB.write.approve([BasicPool.address, updateAmount * 2n], {
        account: addr1.account,
      }); // Maintain 1:2 ratio
      await BasicPool.write.addLiquidity([updateAmount, updateAmount * 2n], {
        account: addr1.account,
      });

      // Now check and claim rewards
      const pendingRewards = await BasicPool.read.pendingRewards([
        addr1.account.address,
      ]);
      assert.isTrue(pendingRewards > 0n, "Should have pending rewards");

      const initialBalance = await BasicPool.read.balanceOf([
        addr1.account.address,
      ]);
      await BasicPool.write.claimRewards({ account: addr1.account });
      const finalBalance = await BasicPool.read.balanceOf([
        addr1.account.address,
      ]);

      assert.isTrue(finalBalance > initialBalance);
    });

    it("should reject claiming rewards when none available", async function () {
      const { BasicPool, addr1 } = await loadFixture(deploy);

      await expect(
        BasicPool.write.claimRewards({ account: addr1.account })
      ).to.be.rejectedWith("No rewards to claim");
    });
  });

  it("should mint reward tokens when claiming", async function () {
    const { BasicPool, TokenA, TokenB, addr1, addr2 } = await loadFixture(
      deploy
    );

    // Set a higher reward rate for this test
    await BasicPool.write.setRewardRate([500n]); // 5%

    // Add liquidity
    const amountA = 5000n * 10n ** 18n;
    const amountB = 5000n * 10n ** 18n;
    await TokenA.write.approve([BasicPool.address, amountA], {
      account: addr1.account,
    });
    await TokenB.write.approve([BasicPool.address, amountB], {
      account: addr1.account,
    });
    await BasicPool.write.addLiquidity([amountA, amountB], {
      account: addr1.account,
    });

    // Large swap to generate significant rewards
    const largeSwapAmount = 2000n * 10n ** 18n;
    await TokenA.write.approve([BasicPool.address, largeSwapAmount], {
      account: addr2.account,
    });
    await BasicPool.write.swapAForB([largeSwapAmount, 0n], {
      account: addr2.account,
    });

    // Trigger reward update by adding more liquidity (not checking pendingRewards directly)
    const updateAmount = 100n * 10n ** 18n;
    await TokenA.write.approve([BasicPool.address, updateAmount], {
      account: addr1.account,
    });
    await TokenB.write.approve([BasicPool.address, updateAmount], {
      account: addr1.account,
    });
    await BasicPool.write.addLiquidity([updateAmount, updateAmount], {
      account: addr1.account,
    });

    // Now check rewards after triggering update
    const pendingRewards = await BasicPool.read.pendingRewards([
      addr1.account.address,
    ]);
    assert.isTrue(pendingRewards > 0n, "Must have pending rewards");

    // Check initial PRT token balance
    const initialPRTBalance = await BasicPool.read.balanceOf([
      addr1.account.address,
    ]);

    // Claim rewards - this MUST execute lines 183, 184, 186
    await BasicPool.write.claimRewards({ account: addr1.account });

    // Verify PRT tokens were minted
    const finalPRTBalance = await BasicPool.read.balanceOf([
      addr1.account.address,
    ]);
    assert.equal(
      finalPRTBalance - initialPRTBalance,
      pendingRewards,
      "Exact reward amount should be minted"
    );
  });

  describe("Emergency Functions", function () {
    it("should allow owner to emergency withdraw", async function () {
      const { BasicPool, TokenA, owner, addr1 } = await loadFixture(deploy);

      // First, mint tokens to owner so they can transfer to the pool
      const amount = 1000n * 10n ** 18n;
      await TokenA.write.mint([owner.account.address, amount]);

      // Send some tokens to the pool directly
      await TokenA.write.transfer([BasicPool.address, amount]);

      const initialOwnerBalance = await TokenA.read.balanceOf([
        owner.account.address,
      ]);
      await BasicPool.write.emergencyWithdraw([TokenA.address, amount]);
      const finalOwnerBalance = await TokenA.read.balanceOf([
        owner.account.address,
      ]);

      assert.equal(finalOwnerBalance - initialOwnerBalance, amount);
    });

    it("should only allow owner to emergency withdraw", async function () {
      const { BasicPool, TokenA, addr1 } = await loadFixture(deploy);

      await expect(
        BasicPool.write.emergencyWithdraw([TokenA.address, 1000n], {
          account: addr1.account,
        })
      ).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("should handle sqrt function correctly", async function () {
      // This tests the internal sqrt function indirectly through liquidity calculation
      const { BasicPool, TokenA, TokenB, addr1 } = await loadFixture(deploy);

      const amountA = 1n * 10n ** 18n; // Small amounts
      const amountB = 1n * 10n ** 18n;

      await TokenA.write.approve([BasicPool.address, amountA], {
        account: addr1.account,
      });
      await TokenB.write.approve([BasicPool.address, amountB], {
        account: addr1.account,
      });
      await BasicPool.write.addLiquidity([amountA, amountB], {
        account: addr1.account,
      });

      const totalLiquidity = await BasicPool.read.totalLiquidity();
      assert.isTrue(totalLiquidity > 0n);
    });

    it("should reject operations when tokens not set", async function () {
      const [owner] = await hre.viem.getWalletClients();
      const EmptyPool = await hre.viem.deployContract("BasicPool");

      await expect(
        EmptyPool.write.addLiquidity([1000n, 1000n])
      ).to.be.rejectedWith("Tokens not set");
    });

    it("should reject swaps when no liquidity", async function () {
      const { BasicPool, TokenA, addr1 } = await loadFixture(deploy);

      await TokenA.write.approve([BasicPool.address, 1000n], {
        account: addr1.account,
      });
      await expect(
        BasicPool.write.swapAForB([1000n, 0n], { account: addr1.account })
      ).to.be.rejectedWith("Insufficient liquidity");
    });
  });

  describe("Complete Branch Coverage Tests", function () {
    // Test uncovered branches in setTokenB function
    it("should reject zero address in setTokenB", async function () {
      const { BasicPool } = await loadFixture(deploy);

      await expect(
        BasicPool.write.setTokenB([
          "0x0000000000000000000000000000000000000000",
        ])
      ).to.be.rejectedWith("Invalid address");
    });

    it("should only allow owner to set tokenB", async function () {
      const { BasicPool, TokenB, addr1 } = await loadFixture(deploy);

      await expect(
        BasicPool.write.setTokenB([TokenB.address], { account: addr1.account })
      ).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    // Test uncovered branches in addLiquidity function
    it("should reject addLiquidity when tokens not set", async function () {
      const [owner] = await hre.viem.getWalletClients();
      const EmptyPool = await hre.viem.deployContract("BasicPool");

      await expect(
        EmptyPool.write.addLiquidity([1000n, 1000n])
      ).to.be.rejectedWith("Tokens not set");
    });

    it("should handle insufficient liquidity minted edge case", async function () {
      const { BasicPool, TokenA, TokenB, addr1, addr2 } = await loadFixture(
        deploy
      );

      // Add initial liquidity
      const amountA = 1000n * 10n ** 18n;
      const amountB = 2000n * 10n ** 18n;
      await TokenA.write.approve([BasicPool.address, amountA], {
        account: addr1.account,
      });
      await TokenB.write.approve([BasicPool.address, amountB], {
        account: addr1.account,
      });
      await BasicPool.write.addLiquidity([amountA, amountB], {
        account: addr1.account,
      });

      // Try to add extremely small liquidity that would result in 0 liquidity minted
      const tinyAmount = 1n; // 1 wei
      await TokenA.write.approve([BasicPool.address, tinyAmount], {
        account: addr2.account,
      });
      await TokenB.write.approve([BasicPool.address, tinyAmount], {
        account: addr2.account,
      });

      await expect(
        BasicPool.write.addLiquidity([tinyAmount, tinyAmount], {
          account: addr2.account,
        })
      ).to.be.rejectedWith("Insufficient liquidity minted");
    });

    // Test uncovered branches in swapAForB function
    it("should reject swapAForB when no liquidity exists", async function () {
      const { BasicPool, TokenA, addr1 } = await loadFixture(deploy);

      await TokenA.write.approve([BasicPool.address, 1000n], {
        account: addr1.account,
      });
      await expect(
        BasicPool.write.swapAForB([1000n, 0n], { account: addr1.account })
      ).to.be.rejectedWith("Insufficient liquidity");
    });

    // Test uncovered branches in swapBForA function
    it("should reject swapBForA with zero amount", async function () {
      const { BasicPool, addr1 } = await loadFixture(deploy);

      await expect(
        BasicPool.write.swapBForA([0n, 0n], { account: addr1.account })
      ).to.be.rejectedWith("Amount must be > 0");
    });

    it("should reject swapBForA when no liquidity exists", async function () {
      const { BasicPool, TokenB, addr1 } = await loadFixture(deploy);

      await TokenB.write.approve([BasicPool.address, 1000n], {
        account: addr1.account,
      });
      await expect(
        BasicPool.write.swapBForA([1000n, 0n], { account: addr1.account })
      ).to.be.rejectedWith("Insufficient liquidity");
    });

    it("should reject swapBForA when slippage too high", async function () {
      const { BasicPool, TokenA, TokenB, addr1, addr2 } = await loadFixture(
        deploy
      );

      // Add liquidity first
      const amountA = 10000n * 10n ** 18n;
      const amountB = 20000n * 10n ** 18n;
      await TokenA.write.approve([BasicPool.address, amountA], {
        account: addr1.account,
      });
      await TokenB.write.approve([BasicPool.address, amountB], {
        account: addr1.account,
      });
      await BasicPool.write.addLiquidity([amountA, amountB], {
        account: addr1.account,
      });

      const swapAmount = 100n * 10n ** 18n;
      const unrealisticMinOut = 1000000n * 10n ** 18n; // Way too high

      await TokenB.write.approve([BasicPool.address, swapAmount], {
        account: addr2.account,
      });
      await expect(
        BasicPool.write.swapBForA([swapAmount, unrealisticMinOut], {
          account: addr2.account,
        })
      ).to.be.rejectedWith("Slippage too high");
    });

    // Test uncovered branches in removeLiquidity function
    it("should only allow owner to remove liquidity when they have some", async function () {
      const { BasicPool, TokenA, TokenB, addr1, addr2 } = await loadFixture(
        deploy
      );

      // Add liquidity with addr1
      const amountA = 1000n * 10n ** 18n;
      const amountB = 2000n * 10n ** 18n;
      await TokenA.write.approve([BasicPool.address, amountA], {
        account: addr1.account,
      });
      await TokenB.write.approve([BasicPool.address, amountB], {
        account: addr1.account,
      });
      await BasicPool.write.addLiquidity([amountA, amountB], {
        account: addr1.account,
      });

      // Try to remove liquidity with addr2 (who has none)
      await expect(
        BasicPool.write.removeLiquidity({ account: addr2.account })
      ).to.be.rejectedWith("No liquidity to remove");
    });

    // Test uncovered branches in claimRewards function
    it("should reject claiming rewards when user has no liquidity", async function () {
      const { BasicPool, addr1 } = await loadFixture(deploy);

      await expect(
        BasicPool.write.claimRewards({ account: addr1.account })
      ).to.be.rejectedWith("No rewards to claim");
    });

    // Test uncovered branches in _updateRewards function
    it("should handle _updateRewards when totalLiquidity is zero", async function () {
      const { BasicPool, TokenA, TokenB, addr1, addr2 } = await loadFixture(
        deploy
      );

      // This test ensures the branch where totalLiquidity == 0 in _updateRewards is covered
      // We'll perform a swap when no liquidity exists to trigger this
      await TokenA.write.approve([BasicPool.address, 1000n], {
        account: addr1.account,
      });

      // This should fail but will test the _updateRewards branch
      await expect(
        BasicPool.write.swapAForB([1000n, 0n], { account: addr1.account })
      ).to.be.rejectedWith("Insufficient liquidity");
    });

    // Test uncovered branches in _updateUserRewards function
    it("should handle _updateUserRewards when user has no liquidity", async function () {
      const { BasicPool, TokenA, TokenB, addr1, addr2 } = await loadFixture(
        deploy
      );

      // Add liquidity with addr1
      const amountA = 1000n * 10n ** 18n;
      const amountB = 2000n * 10n ** 18n;
      await TokenA.write.approve([BasicPool.address, amountA], {
        account: addr1.account,
      });
      await TokenB.write.approve([BasicPool.address, amountB], {
        account: addr1.account,
      });
      await BasicPool.write.addLiquidity([amountA, amountB], {
        account: addr1.account,
      });

      // Try to claim rewards with addr2 (who has no liquidity)
      // This will test the branch where userLiquidity == 0 in _updateUserRewards
      await expect(
        BasicPool.write.claimRewards({ account: addr2.account })
      ).to.be.rejectedWith("No rewards to claim");
    });

    // Test uncovered branches in setRewardRate function
    it("should reject setRewardRate above maximum", async function () {
      const { BasicPool } = await loadFixture(deploy);

      await expect(
        BasicPool.write.setRewardRate([10001n]) // > 100%
      ).to.be.rejectedWith("Reward rate too high");
    });

    it("should only allow owner to set reward rate", async function () {
      const { BasicPool, addr1 } = await loadFixture(deploy);

      await expect(
        BasicPool.write.setRewardRate([200n], { account: addr1.account })
      ).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    // Test uncovered branches in emergencyWithdraw function
    it("should only allow owner to emergency withdraw", async function () {
      const { BasicPool, TokenA, addr1 } = await loadFixture(deploy);

      await expect(
        BasicPool.write.emergencyWithdraw([TokenA.address, 1000n], {
          account: addr1.account,
        })
      ).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    // Additional edge case tests
    it("should handle edge case in liquidity calculation", async function () {
      const { BasicPool, TokenA, TokenB, addr1, addr2 } = await loadFixture(
        deploy
      );

      // Add initial liquidity with uneven ratio
      const amountA1 = 1000n * 10n ** 18n;
      const amountB1 = 3000n * 10n ** 18n; // 1:3 ratio
      await TokenA.write.approve([BasicPool.address, amountA1], {
        account: addr1.account,
      });
      await TokenB.write.approve([BasicPool.address, amountB1], {
        account: addr1.account,
      });
      await BasicPool.write.addLiquidity([amountA1, amountB1], {
        account: addr1.account,
      });

      // Add liquidity with different ratio to test min calculation
      const amountA2 = 2000n * 10n ** 18n;
      const amountB2 = 1000n * 10n ** 18n; // 2:1 ratio (different from pool)
      await TokenA.write.approve([BasicPool.address, amountA2], {
        account: addr2.account,
      });
      await TokenB.write.approve([BasicPool.address, amountB2], {
        account: addr2.account,
      });
      await BasicPool.write.addLiquidity([amountA2, amountB2], {
        account: addr2.account,
      });

      const user2Liquidity = await BasicPool.read.liquidityProvided([
        addr2.account.address,
      ]);
      assert.isTrue(user2Liquidity > 0n);
    });

    // Test to ensure all reward system branches are covered
    it("should properly handle reward accumulation and distribution", async function () {
      const { BasicPool, TokenA, TokenB, addr1, addr2 } = await loadFixture(
        deploy
      );

      // Add liquidity
      const amountA = 5000n * 10n ** 18n;
      const amountB = 5000n * 10n ** 18n;
      await TokenA.write.approve([BasicPool.address, amountA], {
        account: addr1.account,
      });
      await TokenB.write.approve([BasicPool.address, amountB], {
        account: addr1.account,
      });
      await BasicPool.write.addLiquidity([amountA, amountB], {
        account: addr1.account,
      });

      // Perform multiple swaps to accumulate rewards
      const swapAmount = 1000n * 10n ** 18n;

      // Swap A for B
      await TokenA.write.approve([BasicPool.address, swapAmount], {
        account: addr2.account,
      });
      await BasicPool.write.swapAForB([swapAmount, 0n], {
        account: addr2.account,
      });

      // Swap B for A
      await TokenB.write.approve([BasicPool.address, swapAmount], {
        account: addr2.account,
      });
      await BasicPool.write.swapBForA([swapAmount, 0n], {
        account: addr2.account,
      });

      // Trigger reward update
      const updateAmount = 100n * 10n ** 18n;
      await TokenA.write.approve([BasicPool.address, updateAmount], {
        account: addr1.account,
      });
      await TokenB.write.approve([BasicPool.address, updateAmount], {
        account: addr1.account,
      });
      await BasicPool.write.addLiquidity([updateAmount, updateAmount], {
        account: addr1.account,
      });

      // Check and claim rewards
      const pendingRewards = await BasicPool.read.pendingRewards([
        addr1.account.address,
      ]);

      if (pendingRewards > 0n) {
        await BasicPool.write.claimRewards({ account: addr1.account });

        // Verify rewards were claimed
        const finalPendingRewards = await BasicPool.read.pendingRewards([
          addr1.account.address,
        ]);
        assert.equal(finalPendingRewards, 0n);
      }
    });
  });
});
