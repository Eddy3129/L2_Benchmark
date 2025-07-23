import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { parseEther, parseGwei } from "viem";

// --- Configuration for the benchmark experiment ---
const BENCHMARK_RUNS = 45;
// -------------------------------------------------

describe("BasicToken", function () {
  async function deployBasicTokenFixture() {
    const [owner, ...addrs] = await hre.viem.getWalletClients();
    const token = await hre.viem.deployContract("BasicToken", [], {
      maxFeePerGas: parseGwei("20"),
      maxPriorityFeePerGas: parseGwei("2"),
    });
    return { token, owner, addrs };
  }

  // --- ORIGINAL TESTS FOR CORRECTNESS (UNCHANGED) ---
  describe("Transactions", function () {
    it("Should allow the owner to mint tokens", async function () {
      const { token, owner, addrs } = await loadFixture(
        deployBasicTokenFixture
      );
      const mintAmount = parseEther("50000");
      await token.write.mint([addrs[0].account.address, mintAmount], {
        account: owner.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      expect(await token.read.balanceOf([addrs[0].account.address])).to.equal(
        mintAmount
      );
    });

    it("Should fail if a non-owner tries to mint", async function () {
      const { token, addrs } = await loadFixture(deployBasicTokenFixture);
      await expect(
        token.write.mint([addrs[0].account.address, parseEther("1000")], {
          account: addrs[0].account,
          maxFeePerGas: parseGwei("20"),
          maxPriorityFeePerGas: parseGwei("2"),
        })
      ).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    it("Should allow a user to burn their own tokens", async function () {
      const { token, owner } = await loadFixture(deployBasicTokenFixture);
      const initialBalance = await token.read.balanceOf([
        owner.account.address,
      ]);
      const burnAmount = parseEther("10000");
      await token.write.burn([burnAmount], {
        account: owner.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      const finalBalance = await token.read.balanceOf([owner.account.address]);
      expect(finalBalance).to.equal(initialBalance - burnAmount);
    });

    it("Should transfer tokens between accounts", async function () {
      const { token, owner, addrs } = await loadFixture(
        deployBasicTokenFixture
      );
      const transferAmount = parseEther("1000");
      await token.write.transfer([addrs[0].account.address, transferAmount], {
        account: owner.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      expect(await token.read.balanceOf([addrs[0].account.address])).to.equal(
        transferAmount
      );
    });
  });

  // --- NEW Simulation TESTS (LOOPED) ---
  describe("Gas Simulation", function () {
    it(`Should run mint, transfer, and burn for ${BENCHMARK_RUNS} iterations`, async function () {
      const { token, owner, addrs } = await loadFixture(
        deployBasicTokenFixture
      );
      const [sender, receiver] = addrs;

      // Loop for minting
      for (let i = 0; i < BENCHMARK_RUNS; i++) {
        await token.write.mint([sender.account.address, parseEther("100")], {
          account: owner.account,
          maxFeePerGas: parseGwei("20"),
          maxPriorityFeePerGas: parseGwei("2"),
        });
      }

      // Loop for transferring
      for (let i = 0; i < BENCHMARK_RUNS; i++) {
        await token.write.transfer(
          [receiver.account.address, parseEther("1")],
          {
            account: sender.account,
            maxFeePerGas: parseGwei("20"),
            maxPriorityFeePerGas: parseGwei("2"),
          }
        );
      }

      // Loop for burning
      for (let i = 0; i < BENCHMARK_RUNS; i++) {
        await token.write.burn([parseEther("1")], {
          account: sender.account,
          maxFeePerGas: parseGwei("20"),
          maxPriorityFeePerGas: parseGwei("2"),
        });
      }

      expect(await token.read.balanceOf([receiver.account.address])).to.equal(
        parseEther(BENCHMARK_RUNS.toString())
      );
    });
  });
});
