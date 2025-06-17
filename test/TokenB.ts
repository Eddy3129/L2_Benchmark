import hre from "hardhat";
import { assert, expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";

const deploy = async () => {
  const [owner, addr1] = await hre.viem.getWalletClients();
  const TokenB = await hre.viem.deployContract("TokenB", [
    owner.account.address,
  ]);

  return { TokenB, owner, addr1 };
};

describe("TokenB Contract Tests", function () {
  it("should have correct name and symbol", async function () {
    const { TokenB } = await loadFixture(deploy);

    const name = await TokenB.read.name();
    const symbol = await TokenB.read.symbol();

    assert.equal(name, "Token B");
    assert.equal(symbol, "TB");
  });

  it("should start with zero total supply", async function () {
    const { TokenB } = await loadFixture(deploy);

    const totalSupply = await TokenB.read.totalSupply();
    assert.equal(totalSupply, 0n);
  });

  it("should mint tokens correctly", async function () {
    const { TokenB, addr1 } = await loadFixture(deploy);

    // Mint 1000 tokens to addr1
    await TokenB.write.mint([addr1.account.address, 1000n]);

    // Check total supply
    const totalSupply = await TokenB.read.totalSupply();
    assert.equal(totalSupply, 1000n);

    // Check addr1 balance
    const balance = await TokenB.read.balanceOf([addr1.account.address]);
    assert.equal(balance, 1000n);
  });

  it("should only allow owner to mint", async function () {
    const { TokenB, addr1 } = await loadFixture(deploy);

    // Try to mint from non-owner account (should fail)
    await expect(
      TokenB.write.mint([addr1.account.address, 1000n], {
        account: addr1.account,
      })
    ).to.be.rejectedWith("OwnableUnauthorizedAccount");
  });

  it("should transfer tokens correctly", async function () {
    const { TokenB, owner, addr1 } = await loadFixture(deploy);

    // First mint some tokens to owner
    await TokenB.write.mint([owner.account.address, 1000n]);

    // Transfer 500 tokens to addr1
    await TokenB.write.transfer([addr1.account.address, 500n]);

    // Check balances
    const ownerBalance = await TokenB.read.balanceOf([owner.account.address]);
    const addr1Balance = await TokenB.read.balanceOf([addr1.account.address]);

    assert.equal(ownerBalance, 500n);
    assert.equal(addr1Balance, 500n);
  });
});
