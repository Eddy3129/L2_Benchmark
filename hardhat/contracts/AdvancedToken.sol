// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AdvancedToken is ERC20, ERC20Burnable, ERC20Pausable, Ownable {
    uint256 public constant MAX_SUPPLY = 1000000 * 10**18;
    mapping(address => bool) public blacklisted;
    
    event Blacklisted(address indexed account);
    event Unblacklisted(address indexed account);
    
    constructor() ERC20("Advanced Token", "ADV") Ownable(msg.sender) {
        _mint(msg.sender, 100000 * 10**18);
    }
    
    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }
    
    function pause() public onlyOwner {
        _pause();
    }
    
    function unpause() public onlyOwner {
        _unpause();
    }
    
    function blacklist(address account) public onlyOwner {
        blacklisted[account] = true;
        emit Blacklisted(account);
    }
    
    function unblacklist(address account) public onlyOwner {
        blacklisted[account] = false;
        emit Unblacklisted(account);
    }
    
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        require(!blacklisted[from] && !blacklisted[to], "Blacklisted address");
        super._update(from, to, value);
    }
}