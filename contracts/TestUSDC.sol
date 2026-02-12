// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * Test USDC Token for SKALE Testnet
 * NOT FOR PRODUCTION - Testing purposes only
 */
contract TestUSDC is ERC20 {
    constructor() ERC20("Test USD Coin", "USDC") {
        // Mint 1 million test USDC to deployer
        _mint(msg.sender, 1_000_000 * 10**6);
    }

    function decimals() public pure override returns (uint8) {
        return 6; // USDC uses 6 decimals
    }

    /**
     * Faucet function - anyone can mint test USDC
     * Only for testing, remove in production
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
