// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Gas-optimized Mock USDC token for testing
 * @notice Use devUSDC.e on actual Cronos testnet
 */
contract MockUSDC is ERC20, Ownable {
    /// @dev Immutable decimals for gas savings
    uint8 private constant DECIMALS = 6;
    
    /// @notice Emitted when tokens are minted
    event Minted(address indexed to, uint256 amount);
    
    /// @notice Emitted when tokens are burned
    event Burned(address indexed from, uint256 amount);
    
    error ZeroAddress();
    error ZeroAmount();
    
    constructor() ERC20("Mock USDC", "mUSDC") Ownable(msg.sender) {
        // Mint 1M tokens to deployer
        _mint(msg.sender, 1_000_000 * 10 ** DECIMALS);
    }
    
    /// @inheritdoc ERC20
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    /**
     * @notice Mint tokens for testing
     * @param to Recipient address
     * @param amount Amount with decimals
     */
    function mint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        _mint(to, amount);
        emit Minted(to, amount);
    }
    
    /**
     * @notice Burn tokens
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external onlyOwner {
        if (from == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        _burn(from, amount);
        emit Burned(from, amount);
    }
    
    /**
     * @notice EIP-3009: transferWithAuthorization for x402
     * @dev Simplified implementation for testing
     */
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 /* validAfter */,
        uint256 /* validBefore */,
        bytes32 /* nonce */,
        uint8 /* v */,
        bytes32 /* r */,
        bytes32 /* s */
    ) external returns (bool) {
        // Simplified for testing - production should verify signature
        _transfer(from, to, value);
        return true;
    }
}