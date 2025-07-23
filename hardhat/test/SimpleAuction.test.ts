import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { parseEther, parseGwei } from "viem";

// --- Configuration for the benchmark experiment ---
const BENCHMARK_RUNS = 45;
// -------------------------------------------------

describe("SimpleAuction", function () {
  const BIDDING_TIME = 60 * 60;

  async function deploySimpleAuctionFixture() {
    const [owner, beneficiary, ...bidders] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    const auction = await hre.viem.deployContract("SimpleAuction", [
      BigInt(BIDDING_TIME),
      beneficiary.account.address,
    ], {
      maxFeePerGas: parseGwei("20"),
      maxPriorityFeePerGas: parseGwei("2"),
    });
    return { auction, beneficiary, bidders, owner, publicClient };
  }

  // --- ORIGINAL TESTS FOR CORRECTNESS (UNCHANGED) ---
  describe("Bidding", function () {
    it("Should accept a valid bid and update the highest bidder", async function () {
      const { auction, bidders } = await loadFixture(
        deploySimpleAuctionFixture
      );
      const [bidder1, bidder2] = bidders;
      await auction.write.bid({
        value: parseEther("1.0"),
        account: bidder1.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      expect((await auction.read.highestBidder()).toLowerCase()).to.equal(
        bidder1.account.address.toLowerCase()
      );
      await auction.write.bid({
        value: parseEther("1.5"),
        account: bidder2.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      expect((await auction.read.highestBidder()).toLowerCase()).to.equal(
        bidder2.account.address.toLowerCase()
      );
    });

    it("Should allow an outbid user to withdraw their funds", async function () {
      const { auction, bidders } = await loadFixture(
        deploySimpleAuctionFixture
      );
      const [bidder1, bidder2] = bidders;
      const bid1Amount = parseEther("1.0");
      await auction.write.bid({ value: bid1Amount, account: bidder1.account, maxFeePerGas: parseGwei("20"), maxPriorityFeePerGas: parseGwei("2") });
      await auction.write.bid({
        value: parseEther("2.0"),
        account: bidder2.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      await auction.write.withdraw({ account: bidder1.account, maxFeePerGas: parseGwei("20"), maxPriorityFeePerGas: parseGwei("2") });
      expect(
        await auction.read.pendingReturns([bidder1.account.address])
      ).to.equal(0n);
    });
  });

  describe("Auction End", function () {
    it("Should transfer the highest bid to the beneficiary when ended", async function () {
      const { auction, beneficiary, bidders, owner, publicClient } =
        await loadFixture(deploySimpleAuctionFixture);
      await auction.write.bid({
        value: parseEther("2.5"),
        account: bidders[0].account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      await time.increase(BIDDING_TIME + 1);
      const initialBalance = await publicClient.getBalance({
        address: beneficiary.account.address,
      });
      await auction.write.auctionEnd({ account: owner.account, maxFeePerGas: parseGwei("20"), maxPriorityFeePerGas: parseGwei("2") });
      const finalBalance = await publicClient.getBalance({
        address: beneficiary.account.address,
      });
      expect(finalBalance).to.be.gt(initialBalance);
    });
  });

  // --- NEW Simulation TESTS (LOOPED) ---
  describe("Gas Simulation", function () {
    it(`Should handle a sequence of ${BENCHMARK_RUNS} bids`, async function () {
      const { auction, bidders } = await loadFixture(
        deploySimpleAuctionFixture
      );
      let currentBid = parseEther("0.1");
      for (let i = 0; i < BENCHMARK_RUNS; i++) {
        const bidder = bidders[i % bidders.length];
        await auction.write.bid({ value: currentBid, account: bidder.account, maxFeePerGas: parseGwei("20"), maxPriorityFeePerGas: parseGwei("2") });
        currentBid += parseEther("0.1");
      }
      expect(await auction.read.highestBid()).to.be.gt(0);
    });

    it(`Should handle ${BENCHMARK_RUNS - 1} withdrawals`, async function () {
      const { auction, bidders, owner } = await loadFixture(
        deploySimpleAuctionFixture
      );
      for (let i = 0; i < BENCHMARK_RUNS; i++) {
        // FIX: Use modulo operator to prevent out-of-bounds access
        const bidder = bidders[i % bidders.length];
        await auction.write.bid({
          value: parseEther((i + 1).toString()),
          account: bidder.account,
          maxFeePerGas: parseGwei("20"),
          maxPriorityFeePerGas: parseGwei("2"),
        });
      }
      await time.increase(BIDDING_TIME + 1);
      await auction.write.auctionEnd({ account: owner.account, maxFeePerGas: parseGwei("20"), maxPriorityFeePerGas: parseGwei("2") });

      // All but the winner withdraw
      for (let i = 0; i < BENCHMARK_RUNS - 1; i++) {
        // FIX: Use modulo operator here as well for consistency
        const bidder = bidders[i % bidders.length];
        await auction.write.withdraw({ account: bidder.account, maxFeePerGas: parseGwei("20"), maxPriorityFeePerGas: parseGwei("2") });
      }
    });
  });
});
