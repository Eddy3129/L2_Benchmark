import hre from "hardhat";
import { assert, expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";

const deploy = async () => {
  const [owner, addr1, addr2] = await hre.viem.getWalletClients();
  const MyNFT = await hre.viem.deployContract("MyNFT", ["MyNFT", "MNFT"]);

  return { MyNFT, owner, addr1, addr2 };
};

describe("MyNFT Contract Tests", function () {
  it("should have correct name and symbol", async function () {
    const { MyNFT } = await loadFixture(deploy);

    const name = await MyNFT.read.name();
    const symbol = await MyNFT.read.symbol();

    assert.equal(name, "MyNFT");
    assert.equal(symbol, "MNFT");
  });

  it("should set the correct owner", async function () {
    const { MyNFT, owner } = await loadFixture(deploy);

    const contractOwner = await MyNFT.read.owner();
    assert.equal(
      contractOwner.toLowerCase(),
      owner.account.address.toLowerCase()
    );
  });

  it("should start with zero total supply", async function () {
    const { MyNFT, addr1 } = await loadFixture(deploy);

    const balance = await MyNFT.read.balanceOf([addr1.account.address]);
    assert.equal(balance, 0n);
  });

  it("should mint NFT correctly", async function () {
    const { MyNFT, owner, addr1 } = await loadFixture(deploy);

    // Mint NFT to addr1
    await MyNFT.write.safeMint([addr1.account.address]);

    // Check balance
    const balance = await MyNFT.read.balanceOf([addr1.account.address]);
    assert.equal(balance, 1n);

    // Check owner of token ID 0
    const tokenOwner = await MyNFT.read.ownerOf([0n]);
    assert.equal(tokenOwner.toLowerCase(), addr1.account.address.toLowerCase());
  });

  it("should mint multiple NFTs with incremental token IDs", async function () {
    const { MyNFT, owner, addr1, addr2 } = await loadFixture(deploy);

    // Mint first NFT
    await MyNFT.write.safeMint([addr1.account.address]);

    // Mint second NFT
    await MyNFT.write.safeMint([addr2.account.address]);

    // Check token IDs
    const owner1 = await MyNFT.read.ownerOf([0n]);
    const owner2 = await MyNFT.read.ownerOf([1n]);

    assert.equal(owner1.toLowerCase(), addr1.account.address.toLowerCase());
    assert.equal(owner2.toLowerCase(), addr2.account.address.toLowerCase());

    // Check balances
    const balance1 = await MyNFT.read.balanceOf([addr1.account.address]);
    const balance2 = await MyNFT.read.balanceOf([addr2.account.address]);

    assert.equal(balance1, 1n);
    assert.equal(balance2, 1n);
  });

  it("should only allow owner to mint", async function () {
    const { MyNFT, addr1 } = await loadFixture(deploy);

    // Try to mint from non-owner account (should fail)
    await expect(
      MyNFT.write.safeMint([addr1.account.address], { account: addr1.account })
    ).to.be.rejectedWith("OwnableUnauthorizedAccount");
  });

  it("should transfer NFT correctly", async function () {
    const { MyNFT, owner, addr1, addr2 } = await loadFixture(deploy);

    // Mint NFT to addr1
    await MyNFT.write.safeMint([addr1.account.address]);

    // Transfer from addr1 to addr2
    await MyNFT.write.transferFrom(
      [addr1.account.address, addr2.account.address, 0n],
      { account: addr1.account }
    );

    // Check new owner
    const newOwner = await MyNFT.read.ownerOf([0n]);
    assert.equal(newOwner.toLowerCase(), addr2.account.address.toLowerCase());

    // Check balances
    const balance1 = await MyNFT.read.balanceOf([addr1.account.address]);
    const balance2 = await MyNFT.read.balanceOf([addr2.account.address]);

    assert.equal(balance1, 0n);
    assert.equal(balance2, 1n);
  });

  it("should approve and transfer from approved account", async function () {
    const { MyNFT, owner, addr1, addr2 } = await loadFixture(deploy);

    // Mint NFT to addr1
    await MyNFT.write.safeMint([addr1.account.address]);

    // Approve addr2 to transfer token 0
    await MyNFT.write.approve([addr2.account.address, 0n], {
      account: addr1.account,
    });

    // Check approval
    const approved = await MyNFT.read.getApproved([0n]);
    assert.equal(approved.toLowerCase(), addr2.account.address.toLowerCase());

    // Transfer from addr2 (approved account)
    await MyNFT.write.transferFrom(
      [addr1.account.address, addr2.account.address, 0n],
      { account: addr2.account }
    );

    // Check new owner
    const newOwner = await MyNFT.read.ownerOf([0n]);
    assert.equal(newOwner.toLowerCase(), addr2.account.address.toLowerCase());
  });

  it("should set approval for all", async function () {
    const { MyNFT, owner, addr1, addr2 } = await loadFixture(deploy);

    // Mint NFT to addr1
    await MyNFT.write.safeMint([addr1.account.address]);

    // Set approval for all
    await MyNFT.write.setApprovalForAll([addr2.account.address, true], {
      account: addr1.account,
    });

    // Check approval for all
    const isApproved = await MyNFT.read.isApprovedForAll([
      addr1.account.address,
      addr2.account.address,
    ]);
    assert.equal(isApproved, true);

    // Transfer using approval for all
    await MyNFT.write.transferFrom(
      [addr1.account.address, addr2.account.address, 0n],
      { account: addr2.account }
    );

    // Check new owner
    const newOwner = await MyNFT.read.ownerOf([0n]);
    assert.equal(newOwner.toLowerCase(), addr2.account.address.toLowerCase());
  });

  it("should revert when querying non-existent token", async function () {
    const { MyNFT } = await loadFixture(deploy);

    // Try to get owner of non-existent token
    await expect(MyNFT.read.ownerOf([999n])).to.be.rejectedWith(
      "ERC721NonexistentToken"
    );
  });

  it("should revert when transferring non-existent token", async function () {
    const { MyNFT, addr1, addr2 } = await loadFixture(deploy);

    // Try to transfer non-existent token
    await expect(
      MyNFT.write.transferFrom(
        [addr1.account.address, addr2.account.address, 999n],
        { account: addr1.account }
      )
    ).to.be.rejectedWith("ERC721NonexistentToken");
  });

  it("should support ERC721 interface", async function () {
    const { MyNFT } = await loadFixture(deploy);

    // ERC721 interface ID: 0x80ac58cd
    const supportsERC721 = await MyNFT.read.supportsInterface(["0x80ac58cd"]);
    assert.equal(supportsERC721, true);
  });

  it("should properly handle batch minting to increase balance", async function () {
    const { MyNFT, owner, addr1 } = await loadFixture(deploy);

    // Use the new batchMint function to mint multiple NFTs at once
    await MyNFT.write.batchMint([addr1.account.address, 3n]);

    // Check that balance increased correctly (this should exercise _increaseBalance)
    const balance = await MyNFT.read.balanceOf([addr1.account.address]);
    assert.equal(balance, 3n);

    // Verify each token is owned by addr1
    const owner0 = await MyNFT.read.ownerOf([0n]);
    const owner1 = await MyNFT.read.ownerOf([1n]);
    const owner2 = await MyNFT.read.ownerOf([2n]);

    assert.equal(owner0.toLowerCase(), addr1.account.address.toLowerCase());
    assert.equal(owner1.toLowerCase(), addr1.account.address.toLowerCase());
    assert.equal(owner2.toLowerCase(), addr1.account.address.toLowerCase());
  });

  // Add this new test specifically for the batchMint function
  it("should batch mint multiple NFTs correctly", async function () {
    const { MyNFT, owner, addr1, addr2 } = await loadFixture(deploy);

    // Batch mint 5 NFTs to addr1
    await MyNFT.write.batchMint([addr1.account.address, 5n]);

    // Batch mint 3 NFTs to addr2
    await MyNFT.write.batchMint([addr2.account.address, 3n]);

    // Check balances
    const balance1 = await MyNFT.read.balanceOf([addr1.account.address]);
    const balance2 = await MyNFT.read.balanceOf([addr2.account.address]);

    assert.equal(balance1, 5n);
    assert.equal(balance2, 3n);

    // Verify token ownership
    for (let i = 0; i < 5; i++) {
      const owner = await MyNFT.read.ownerOf([BigInt(i)]);
      assert.equal(owner.toLowerCase(), addr1.account.address.toLowerCase());
    }

    for (let i = 5; i < 8; i++) {
      const owner = await MyNFT.read.ownerOf([BigInt(i)]);
      assert.equal(owner.toLowerCase(), addr2.account.address.toLowerCase());
    }
  });

  it("should only allow owner to batch mint", async function () {
    const { MyNFT, addr1 } = await loadFixture(deploy);

    // Try to batch mint from non-owner account (should fail)
    await expect(
      MyNFT.write.batchMint([addr1.account.address, 3n], {
        account: addr1.account,
      })
    ).to.be.rejectedWith("OwnableUnauthorizedAccount");
  });

  it("should handle batch minting with zero quantity", async function () {
    const { MyNFT, owner, addr1 } = await loadFixture(deploy);

    // Batch mint 0 NFTs (should not fail but also not mint anything)
    await MyNFT.write.batchMint([addr1.account.address, 0n]);

    // Check that no NFTs were minted
    const balance = await MyNFT.read.balanceOf([addr1.account.address]);
    assert.equal(balance, 0n);
  });

  it("should handle minting to zero address correctly", async function () {
    const { MyNFT, owner } = await loadFixture(deploy);

    // Try to mint to zero address (should fail)
    await expect(
      MyNFT.write.safeMint(["0x0000000000000000000000000000000000000000"])
    ).to.be.rejectedWith("ERC721InvalidReceiver");
  });
});
