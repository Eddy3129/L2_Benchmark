import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { parseGwei } from "viem";

// --- Configuration for the benchmark experiment ---
const BENCHMARK_RUNS = 45;
// -------------------------------------------------

describe("MyNFT", function () {
  async function deployMyNFTFixture() {
    const [owner, ...addrs] = await hre.viem.getWalletClients();
    const nft = await hre.viem.deployContract("MyNFT", [
      "My Gas Test NFT",
      "MGAS",
    ], {
      maxFeePerGas: parseGwei("20"),
      maxPriorityFeePerGas: parseGwei("2"),
    });
    return { nft, owner, addrs };
  }

  // --- ORIGINAL TESTS FOR CORRECTNESS (UNCHANGED) ---
  describe("Minting", function () {
    it("Should allow owner to mint a single NFT", async function () {
      const { nft, owner, addrs } = await loadFixture(deployMyNFTFixture);
      await nft.write.safeMint([addrs[0].account.address], {
        account: owner.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      expect((await nft.read.ownerOf([0n])).toLowerCase()).to.equal(
        addrs[0].account.address
      );
    });

    it("Should allow owner to batch mint multiple NFTs", async function () {
      const { nft, owner, addrs } = await loadFixture(deployMyNFTFixture);
      const quantity = 5n;
      await nft.write.batchMint([addrs[0].account.address, quantity], {
        account: owner.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      expect(await nft.read.balanceOf([addrs[0].account.address])).to.equal(
        quantity
      );
    });
  });

  describe("Transfers and Approvals", function () {
    it("Should allow the owner of an NFT to transfer it", async function () {
      const { nft, owner, addrs } = await loadFixture(deployMyNFTFixture);
      const [addr1, addr2] = addrs;
      await nft.write.safeMint([addr1.account.address], {
        account: owner.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      await nft.write.transferFrom(
        [addr1.account.address, addr2.account.address, 0n],
        { 
          account: addr1.account,
          maxFeePerGas: parseGwei("20"),
          maxPriorityFeePerGas: parseGwei("2"),
        }
      );
      expect((await nft.read.ownerOf([0n])).toLowerCase()).to.equal(
        addr2.account.address
      );
    });

    it("Should allow an approved address to transfer an NFT", async function () {
      const { nft, owner, addrs } = await loadFixture(deployMyNFTFixture);
      const [addr1, addr2] = addrs;
      await nft.write.safeMint([addr1.account.address], {
        account: owner.account,
      });
      await nft.write.approve([addr2.account.address, 0n], {
        account: addr1.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      await nft.write.transferFrom(
        [addr1.account.address, owner.account.address, 0n],
        { 
          account: addr2.account,
          maxFeePerGas: parseGwei("20"),
          maxPriorityFeePerGas: parseGwei("2"),
        }
      );
      expect((await nft.read.ownerOf([0n])).toLowerCase()).to.equal(
        owner.account.address
      );
    });
  });

  // --- NEW Simulation TESTS (LOOPED) ---
  describe("Gas Simulation", function () {
    it(`Should run safeMint ${BENCHMARK_RUNS} times`, async function () {
      const { nft, owner, addrs } = await loadFixture(deployMyNFTFixture);
      for (let i = 0; i < BENCHMARK_RUNS; i++) {
        await nft.write.safeMint([addrs[0].account.address], {
          account: owner.account,
          maxFeePerGas: parseGwei("20"),
          maxPriorityFeePerGas: parseGwei("2"),
        });
      }
      expect(await nft.read.balanceOf([addrs[0].account.address])).to.equal(
        BigInt(BENCHMARK_RUNS)
      );
    });

    it(`Should run approve and transferFrom ${BENCHMARK_RUNS} times`, async function () {
      const { nft, owner, addrs } = await loadFixture(deployMyNFTFixture);
      const [minter, receiver, approver] = addrs;
      for (let i = 0; i < BENCHMARK_RUNS; i++) {
        const tokenId = BigInt(i);
        await nft.write.safeMint([minter.account.address], {
          account: owner.account,
          maxFeePerGas: parseGwei("20"),
          maxPriorityFeePerGas: parseGwei("2"),
        });
        await nft.write.approve([approver.account.address, tokenId], {
          account: minter.account,
          maxFeePerGas: parseGwei("20"),
          maxPriorityFeePerGas: parseGwei("2"),
        });
        await nft.write.transferFrom(
          [minter.account.address, receiver.account.address, tokenId],
          { 
            account: approver.account,
            maxFeePerGas: parseGwei("20"),
            maxPriorityFeePerGas: parseGwei("2"),
          }
        );
      }
      expect(await nft.read.balanceOf([receiver.account.address])).to.equal(
        BigInt(BENCHMARK_RUNS)
      );
    });
  });
});
