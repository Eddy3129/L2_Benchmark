import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { parseEther, parseGwei } from "viem";

// --- Configuration for the benchmark experiment ---
const BENCHMARK_RUNS = 45;
// -------------------------------------------------

describe("AdvancedToken", function () {
  async function deployAdvancedTokenFixture() {
    const [owner, ...addrs] = await hre.viem.getWalletClients();
    const token = await hre.viem.deployContract("AdvancedToken", [], {
      maxFeePerGas: parseGwei("20"),
      maxPriorityFeePerGas: parseGwei("2"),
    });
    return { token, owner, addrs };
  }

  // --- ORIGINAL TESTS FOR CORRECTNESS (UNCHANGED) ---
  describe("Pausable Functionality", function () {
    it("Should allow owner to pause and unpause the contract", async function () {
      const { token, owner } = await loadFixture(deployAdvancedTokenFixture);
      await token.write.pause({ 
        account: owner.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      expect(await token.read.paused()).to.be.true;
      await token.write.unpause({ 
        account: owner.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      expect(await token.read.paused()).to.be.false;
    });

    it("Should prevent transfers when paused", async function () {
      const { token, owner, addrs } = await loadFixture(
        deployAdvancedTokenFixture
      );
      await token.write.pause({ 
        account: owner.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      await expect(
        token.write.transfer([addrs[0].account.address, parseEther("100")], {
          account: owner.account,
        })
      ).to.be.rejectedWith("EnforcedPause");
    });
  });

  describe("Blacklist Functionality", function () {
    it("Should allow owner to blacklist and unblacklist an address", async function () {
      const { token, owner, addrs } = await loadFixture(
        deployAdvancedTokenFixture
      );
      await token.write.blacklist([addrs[0].account.address], {
        account: owner.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      expect(await token.read.blacklisted([addrs[0].account.address])).to.be
        .true;
      await token.write.unblacklist([addrs[0].account.address], {
        account: owner.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      expect(await token.read.blacklisted([addrs[0].account.address])).to.be
        .false;
    });

    it("Should prevent a blacklisted address from sending or receiving tokens", async function () {
      const { token, owner, addrs } = await loadFixture(
        deployAdvancedTokenFixture
      );
      await token.write.blacklist([addrs[0].account.address], {
        account: owner.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      await expect(
        token.write.transfer([addrs[0].account.address, parseEther("100")], {
          account: owner.account,
        })
      ).to.be.rejectedWith("Blacklisted address");
    });
  });

  // --- NEW Simulation TESTS (LOOPED) ---
  describe("Gas Simulation", function () {
    it(`Should run admin functions for ${BENCHMARK_RUNS} iterations`, async function () {
      const { token, owner, addrs } = await loadFixture(
        deployAdvancedTokenFixture
      );
      for (let i = 0; i < BENCHMARK_RUNS; i++) {
        const target = addrs[i % addrs.length];
        await token.write.blacklist([target.account.address], {
          account: owner.account,
          maxFeePerGas: parseGwei("20"),
          maxPriorityFeePerGas: parseGwei("2"),
        });
        await token.write.unblacklist([target.account.address], {
          account: owner.account,
          maxFeePerGas: parseGwei("20"),
          maxPriorityFeePerGas: parseGwei("2"),
        });
        await token.write.pause({ 
          account: owner.account,
          maxFeePerGas: parseGwei("20"),
          maxPriorityFeePerGas: parseGwei("2"),
        });
        await token.write.unpause({ 
          account: owner.account,
          maxFeePerGas: parseGwei("20"),
          maxPriorityFeePerGas: parseGwei("2"),
        });
      }
    });
  });
});
