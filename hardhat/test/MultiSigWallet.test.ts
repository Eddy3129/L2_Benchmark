import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { parseEther, parseGwei } from "viem";

// --- Configuration for the benchmark experiment ---
const BENCHMARK_RUNS = 45; // Set how many times to run the full lifecycle
// -------------------------------------------------

describe("MultiSigWallet", function () {
  // Fixture remains the same, used by all tests
  async function deployMultiSigWalletFixture() {
    const [owner1, owner2, owner3, ...recipients] =
      await hre.viem.getWalletClients();
    const owners = [
      owner1.account.address,
      owner2.account.address,
      owner3.account.address,
    ];
    const numConfirmationsRequired = 2n;

    const wallet = await hre.viem.deployContract("MultiSigWallet", [
      owners,
      numConfirmationsRequired,
    ], {
      maxFeePerGas: parseGwei("20"),
      maxPriorityFeePerGas: parseGwei("2"),
    });

    const publicClient = await hre.viem.getPublicClient();
    // Pre-fund the wallet for all tests
    await owner1.sendTransaction({
      to: wallet.address,
      value: parseEther("50"),
      maxFeePerGas: parseGwei("20"),
      maxPriorityFeePerGas: parseGwei("2"),
    });

    return { wallet, owner1, owner2, owner3, recipients, publicClient };
  }

  // --- ORIGINAL TESTS FOR CORRECTNESS (UNCHANGED) ---
  describe("Transaction Submission and Confirmation", function () {
    it("Should allow an owner to submit and confirm a transaction", async function () {
      const { wallet, owner1, recipients } = await loadFixture(
        deployMultiSigWalletFixture
      );
      const to = recipients[0].account.address;
      const value = parseEther("1");
      const data = "0x";

      await wallet.write.submitTransaction([to, value, data], {
        account: owner1.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      const txIndex = 0n;

      await wallet.write.confirmTransaction([txIndex], {
        account: owner1.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });

      const tx = await wallet.read.getTransaction([txIndex]);
      expect(tx[4]).to.equal(1n); // numConfirmations
    });

    it("Should execute a transaction after enough confirmations", async function () {
      const { wallet, owner1, owner2, recipients, publicClient } =
        await loadFixture(deployMultiSigWalletFixture);
      const to = recipients[0].account.address;
      const value = parseEther("1");
      const data = "0x";
      const txIndex = 0n;

      const initialBalance = await publicClient.getBalance({ address: to });

      // Submit and confirm
      await wallet.write.submitTransaction([to, value, data], {
        account: owner1.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      await wallet.write.confirmTransaction([txIndex], {
        account: owner1.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      await wallet.write.confirmTransaction([txIndex], {
        account: owner2.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });

      // Execute
      await wallet.write.executeTransaction([txIndex], {
        account: owner1.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });

      const finalBalance = await publicClient.getBalance({ address: to });
      expect(finalBalance).to.equal(initialBalance + value);

      const tx = await wallet.read.getTransaction([txIndex]);
      expect(tx[3]).to.be.true; // executed
    });

    it("Should allow an owner to revoke a confirmation", async function () {
      const { wallet, owner1, owner2 } = await loadFixture(
        deployMultiSigWalletFixture
      );
      const txIndex = 0n;
      await wallet.write.submitTransaction([owner2.account.address, 0n, "0x"], {
        account: owner1.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });
      await wallet.write.confirmTransaction([txIndex], {
        account: owner1.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });

      let tx = await wallet.read.getTransaction([txIndex]);
      expect(tx[4]).to.equal(1n);

      await wallet.write.revokeConfirmation([txIndex], {
        account: owner1.account,
        maxFeePerGas: parseGwei("20"),
        maxPriorityFeePerGas: parseGwei("2"),
      });

      tx = await wallet.read.getTransaction([txIndex]);
      expect(tx[4]).to.equal(0n);
    });
  });

  // --- NEW Simulation TESTS (LOOPED) ---
  describe("Gas Simulation", function () {
    it(`Should run the full transaction lifecycle ${BENCHMARK_RUNS} times`, async function () {
      const { wallet, owner1, owner2, owner3, recipients, publicClient } =
        await loadFixture(deployMultiSigWalletFixture);

      for (let i = 0; i < BENCHMARK_RUNS; i++) {
        const recipient = recipients[i % recipients.length];
        const value = parseEther("1");
        const txIndex = BigInt(i);

        const initialBalance = await publicClient.getBalance({
          address: recipient.account.address,
        });

        // 1. Submit Transaction
        await wallet.write.submitTransaction(
          [recipient.account.address, value, "0x"],
          { 
            account: owner1.account,
            maxFeePerGas: parseGwei("20"),
            maxPriorityFeePerGas: parseGwei("2"),
          }
        );

        // 2. Confirm Transaction (from two different owners)
        await wallet.write.confirmTransaction([txIndex], {
          account: owner1.account,
          maxFeePerGas: parseGwei("20"),
          maxPriorityFeePerGas: parseGwei("2"),
        });
        await wallet.write.confirmTransaction([txIndex], {
          account: owner2.account,
          maxFeePerGas: parseGwei("20"),
          maxPriorityFeePerGas: parseGwei("2"),
        });

        // 3. (Optional) Revoke one confirmation to test that logic under load
        await wallet.write.revokeConfirmation([txIndex], {
          account: owner2.account,
          maxFeePerGas: parseGwei("20"),
          maxPriorityFeePerGas: parseGwei("2"),
        });

        // 4. Re-confirm to meet the threshold
        await wallet.write.confirmTransaction([txIndex], {
          account: owner3.account,
          maxFeePerGas: parseGwei("20"),
          maxPriorityFeePerGas: parseGwei("2"),
        });

        // 5. Execute Transaction
        await wallet.write.executeTransaction([txIndex], {
          account: owner1.account,
          maxFeePerGas: parseGwei("20"),
          maxPriorityFeePerGas: parseGwei("2"),
        });

        const finalBalance = await publicClient.getBalance({
          address: recipient.account.address,
        });
        expect(finalBalance).to.equal(initialBalance + value);

        const tx = await wallet.read.getTransaction([txIndex]);
        expect(tx[3]).to.be.true; // executed
      }
    });
  });
});
