import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { parseEther, parseGwei } from "viem";

// --- Configuration for the benchmark experiment ---
const BENCHMARK_RUNS = 45;
// -------------------------------------------------

describe("SimpleStaking", function () {
  async function deploySimpleStakingFixture() {
    const [owner, ...stakers] = await hre.viem.getWalletClients();
    const stakingToken = await hre.viem.deployContract("BasicToken", [], {
      maxFeePerGas: parseGwei("20"),
      maxPriorityFeePerGas: parseGwei("2"),
    });
    const rewardToken = await hre.viem.deployContract("BasicToken", [], {
      maxFeePerGas: parseGwei("20"),
      maxPriorityFeePerGas: parseGwei("2"),
    });
    const staking = await hre.viem.deployContract("SimpleStaking", [
      stakingToken.address,
      rewardToken.address,
    ], {
      maxFeePerGas: parseGwei("20"),
      maxPriorityFeePerGas: parseGwei("2"),
    });

    const mainStaker = stakers[0];
    const stakeAmount = parseEther("1000");
    await stakingToken.write.mint([mainStaker.account.address, stakeAmount], {
      maxFeePerGas: parseGwei("20"),
      maxPriorityFeePerGas: parseGwei("2"),
    });
    await stakingToken.write.approve([staking.address, stakeAmount], {
      account: mainStaker.account,
      maxFeePerGas: parseGwei("20"),
      maxPriorityFeePerGas: parseGwei("2"),
    });

    await rewardToken.write.mint([staking.address, parseEther("800000")], {
      maxFeePerGas: parseGwei("20"),
      maxPriorityFeePerGas: parseGwei("2"),
    });

    return {
      staking,
      stakingToken,
      rewardToken,
      owner,
      mainStaker,
      stakers,
      stakeAmount,
    };
  }

  // --- ORIGINAL TESTS FOR CORRECTNESS (UNCHANGED) ---
  describe("Staking and Withdrawing", function () {
    it("Should allow a user to stake and withdraw tokens", async function () {
      const { staking, mainStaker, stakeAmount } = await loadFixture(
        deploySimpleStakingFixture
      );
      await staking.write.stake([stakeAmount], {
        account: mainStaker.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      expect(
        await staking.read.balances([mainStaker.account.address])
      ).to.equal(stakeAmount);
      await staking.write.withdraw([stakeAmount], {
        account: mainStaker.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      expect(
        await staking.read.balances([mainStaker.account.address])
      ).to.equal(0n);
    });
  });

  describe("Reward Logic", function () {
    it("Should allow a user to claim their rewards", async function () {
      const { staking, mainStaker, stakeAmount, rewardToken } =
        await loadFixture(deploySimpleStakingFixture);
      await staking.write.stake([stakeAmount], {
        account: mainStaker.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      await time.increase(24 * 60 * 60); // 1 day
      const initialRewardBalance = await rewardToken.read.balanceOf([
        mainStaker.account.address,
      ]);
      await staking.write.getReward({
        account: mainStaker.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      const finalRewardBalance = await rewardToken.read.balanceOf([
        mainStaker.account.address,
      ]);
      expect(finalRewardBalance).to.be.gt(initialRewardBalance);
    });

    it("Should allow a user to exit (withdraw and claim rewards)", async function () {
      const { staking, mainStaker, stakeAmount, stakingToken, rewardToken } =
        await loadFixture(deploySimpleStakingFixture);
      await staking.write.stake([stakeAmount], {
        account: mainStaker.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      await time.increase(24 * 60 * 60);
      const initialStakingBalance = await stakingToken.read.balanceOf([
        mainStaker.account.address,
      ]);
      const initialRewardBalance = await rewardToken.read.balanceOf([
        mainStaker.account.address,
      ]);
      await staking.write.exit({
        account: mainStaker.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      expect(
        await stakingToken.read.balanceOf([mainStaker.account.address])
      ).to.be.gt(initialStakingBalance);
      expect(
        await rewardToken.read.balanceOf([mainStaker.account.address])
      ).to.be.gt(initialRewardBalance);
    });
  });

  // --- NEW Simulation TESTS (LOOPED) ---
  describe("Gas Simulation", function () {
    it(`Should handle a stake/claim/withdraw cycle for ${BENCHMARK_RUNS} users`, async function () {
      const { staking, stakers, stakingToken, rewardToken } = await loadFixture(
        deploySimpleStakingFixture
      );

      // Prepare multiple stakers
      for (let i = 0; i < BENCHMARK_RUNS; i++) {
        // FIX: Use modulo operator to cycle through the available staker accounts
        const staker = stakers[i % stakers.length];
        const amount = parseEther("500");
        if (
          (await stakingToken.read.totalSupply()) + amount <=
          (await stakingToken.read.MAX_SUPPLY())
        ) {
          await stakingToken.write.mint([staker.account.address, amount], {
            maxFeePerGas: parseGwei("20"),
            maxPriorityFeePerGas: parseGwei("2"),
          });
          await stakingToken.write.approve([staking.address, amount], {
            account: staker.account,
            maxFeePerGas: parseGwei("20"),
            maxPriorityFeePerGas: parseGwei("2"),
          });
        }
      }

      for (let i = 0; i < BENCHMARK_RUNS; i++) {
        // FIX: Use modulo operator here as well to prevent out-of-bounds access
        const staker = stakers[i % stakers.length];
        const amount = parseEther("100");
        if (
          (await stakingToken.read.balanceOf([staker.account.address])) >=
          amount
        ) {
          // 1. Stake
          await staking.write.stake([amount], {
            account: staker.account,
            maxFeePerGas: parseGwei("20"),
            maxPriorityFeePerGas: parseGwei("2"),
          });
          await time.increase(600); // Wait
          // 2. Claim
          await staking.write.getReward({
            account: staker.account,
            maxFeePerGas: parseGwei("20"),
            maxPriorityFeePerGas: parseGwei("2"),
          });
          // 3. Withdraw
          await staking.write.withdraw([amount], {
            account: staker.account,
            maxFeePerGas: parseGwei("20"),
            maxPriorityFeePerGas: parseGwei("2"),
          });
        }
      }
    });
  });
});
