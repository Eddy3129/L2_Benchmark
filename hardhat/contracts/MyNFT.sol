// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721, Ownable {
    uint256 private _tokenIdCounter;
    
    constructor(string memory name, string memory symbol) ERC721(name, symbol) Ownable(msg.sender) {}
    
    function safeMint(address to) public onlyOwner {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter += 1;
        _safeMint(to, tokenId);
    }
    
    function batchMint(address to, uint256 quantity) public onlyOwner {
        // Allow zero quantity (test expects this not to revert)
        if (quantity == 0) return;
        
        // Zero address check is handled by _safeMint internally
        for (uint256 i = 0; i < quantity; i++) {
            safeMint(to);
        }
    }
}