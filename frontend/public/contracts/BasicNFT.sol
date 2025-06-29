// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract BasicNFT is ERC721, Ownable {
    using Strings for uint256;
    
    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public totalSupply;
    uint256 public mintPrice = 0.01 ether;
    string public baseTokenURI;
    
    constructor() ERC721("Basic NFT", "BNFT") Ownable(msg.sender) {}
    
    function mint(uint256 quantity) public payable {
        require(quantity > 0 && quantity <= 10, "Invalid quantity");
        require(totalSupply + quantity <= MAX_SUPPLY, "Exceeds max supply");
        require(msg.value >= mintPrice * quantity, "Insufficient payment");
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply + 1;
            _safeMint(msg.sender, tokenId);
            totalSupply++;
        }
    }
    
    function ownerMint(address to, uint256 quantity) public onlyOwner {
        require(totalSupply + quantity <= MAX_SUPPLY, "Exceeds max supply");
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply + 1;
            _safeMint(to, tokenId);
            totalSupply++;
        }
    }
    
    function setBaseURI(string memory baseURI) public onlyOwner {
        baseTokenURI = baseURI;
    }
    
    function setMintPrice(uint256 newPrice) public onlyOwner {
        mintPrice = newPrice;
    }
    
    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return bytes(baseTokenURI).length > 0 
            ? string(abi.encodePacked(baseTokenURI, tokenId.toString(), ".json"))
            : "";
    }
}