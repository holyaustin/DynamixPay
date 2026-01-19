# 🏗️ DynamixPay Smart Contracts

Gas-optimized smart contracts for DynamixPay Treasury Management on Cronos, built with Hardhat v3.

## 📋 Table of Contents

- [Overview](#overview)
- [Contracts](#contracts)
- [Installation](#installation)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Verification](#verification)
- [Gas Optimization](#gas-optimization)

---

## 🌟 Overview

This package contains the core smart contracts for DynamixPay's automated treasury management system:

- **TreasuryManager**: Main contract managing payroll, payments, and x402 integration
- **MockUSDC**: Test token for local development and testing

### Key Features

- ⚡ **Gas Optimized**: Efficient storage patterns, batch operations, and optimized loops
- 🔒 **Secure**: ReentrancyGuard, access control, and comprehensive error handling
- 🧪 **Well Tested**: 100% code coverage with comprehensive test suite
- 📦 **Hardhat v3**: Built with latest Hardhat features and best practices
- 🚀 **x402 Compatible**: Full EIP-3009 support for gasless transactions

---

## 📝 Contracts

### TreasuryManager.sol

Main treasury management contract with the following capabilities:

- **Payee Management**: Add, update, and deactivate payees
- **Automated Payroll**: Revenue-threshold triggered payment requests
- **x402 Integration**: Mark payments as settled via x402 facilitator
- **Gas Efficient**: Batch operations and optimized storage

**Key Functions:**

```solidity
// Add single payee
function addPayee(address payee, uint256 salary) external onlyOwner

// Batch add payees (gas efficient)
function addPayees(address[] payees, uint256[] salaries) external onlyOwner

// Create payment requests when conditions met
function createPaymentRequests() external onlyOwner returns (uint256[] requestIds, uint256 totalAmount)

// Mark payment as settled (x402 facilitator only)
function markPaymentSettled(uint256 requestId, bytes32 x402PaymentId, bytes32 txHash) external
```

### MockUSDC.sol

Test implementation of USDC for local development:

- ERC20 compliant with 6 decimals
- Mint/burn capabilities for testing
- Simplified EIP-3009 `transferWithAuthorization`

---

## 🚀 Installation

### Prerequisites

- Node.js 18+ and npm 9+
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/your-username/dynamixpay.git
cd dynamixpay/packages/contracts

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

Create a `.env` file:

```bash
# Private key for deployment (DO NOT COMMIT)
PRIVATE_KEY=your_private_key_here

# RPC URLs
CRONOS_RPC_URL=https://evm-t3.cronos.org

# x402 Configuration
X402_FACILITATOR_ADDRESS=0x...

# USDC Address (optional, uses default for network)
USDC_ADDRESS=0x...

# Gas reporting (optional)
REPORT_GAS=true
COINMARKETCAP_API_KEY=your_api_key
```

---

## 🛠️ Development

### Compile Contracts

```bash
# Compile with default profile
npm run compile

# Clean and recompile
npm run clean && npm run compile
```

### Local Node

```bash
# Start local Hardhat node
npm run node

# In another terminal, deploy to local node
npm run deploy
```

### Console

```bash
# Interactive Hardhat console
npm run console
```

---

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with gas reporting
npm run test:gas

# Run with coverage
npm run test:coverage

# Watch mode (re-run on file changes)
npm run test:watch
```

### Test Structure

```
test/
├── TreasuryManager.test.ts    # Comprehensive test suite
│   ├── Deployment tests
│   ├── Payee management tests
│   ├── Payroll trigger tests
│   ├── x402 integration tests
│   ├── View function tests
│   ├── Admin function tests
│   ├── Gas optimization tests
│   └── Edge case tests
```

### Coverage Report

```bash
npm run test:coverage
```

Expected output:
```
--------------------|----------|----------|----------|----------|
File                |  % Stmts | % Branch |  % Funcs |  % Lines |
--------------------|----------|----------|----------|----------|
 contracts/         |      100 |      100 |      100 |      100 |
  TreasuryManager   |      100 |      100 |      100 |      100 |
  MockUSDC          |      100 |      100 |      100 |      100 |
--------------------|----------|----------|----------|----------|
```

---

## 🚀 Deployment

### Option 1: Traditional Deployment Script

```bash
# Deploy to local network
npm run deploy

# Deploy to Cronos Testnet
npm run deploy:testnet

# Deploy to Cronos Mainnet
npm run deploy:mainnet
```

### Option 2: Hardhat Ignition (Recommended)

```bash
# Deploy with Ignition to local
npm run deploy:ignition

# Deploy to Cronos Testnet
npm run deploy:ignition:testnet

# Deploy to Cronos Mainnet
npm run deploy:ignition:mainnet
```

**Ignition Benefits:**
- Declarative deployment modules
- Automatic dependency resolution
- Built-in deployment verification
- Idempotent deployments

### Deployment Output

After deployment, contract addresses are saved to `deployments/{network}.json`:

```json
{
  "network": "cronosTestnet",
  "chainId": 338,
  "timestamp": "2026-01-11T...",
  "deployer": "0x...",
  "contracts": {
    "treasuryManager": "0x...",
    "paymentToken": "0x...",
    "x402Facilitator": "0x..."
  }
}
```

---

## 🔍 Verification

Verify deployed contracts on Cronos Explorer:

```bash
# Verify on Cronos Testnet
npm run verify:testnet

# Verify on Cronos Mainnet
npm run verify:mainnet
```

Manual verification:

```bash
npx hardhat verify --network cronosTestnet \
  TREASURY_ADDRESS \
  USDC_ADDRESS \
  X402_FACILITATOR_ADDRESS
```

---

## ⚡ Gas Optimization

### Optimization Techniques Used

1. **Storage Packing**: Packed structs to minimize storage slots
   ```solidity
   struct Payee {
       uint128 salary;      // 16 bytes
       uint64 lastPayment;  // 8 bytes
       uint64 accrued;      // 8 bytes
       bool active;         // 1 byte
   }  // Total: 33 bytes → fits in 2 storage slots
   ```

2. **Immutable Variables**: Use `immutable` for constructor-set values
   ```solidity
   IERC20 public immutable paymentToken;
   ```

3. **Unchecked Math**: Safe overflow prevention where appropriate
   ```solidity
   unchecked { ++i; }
   ```

4. **Batch Operations**: Process multiple items in single transaction
   ```solidity
   function addPayees(address[] calldata, uint256[] calldata)
   ```

5. **View Functions**: Extensive use of view/pure functions

### Gas Reports

Run gas report to see optimization results:

```bash
npm run test:gas
```

Sample output:
```
·----------------------------------------|---------------------------|
|  Methods                               ·              Gas         │
·-----------------|----------------------|-----------|--------------|
|  Contract       ·  Method              ·  Min      ·  Max         │
·-----------------|----------------------|-----------|--------------|
|  Treasury       ·  addPayee            ·   89,234  ·   124,567   │
|  Treasury       ·  addPayees           ·  187,456  ·   543,789   │
|  Treasury       ·  createPayments      ·  234,567  ·   678,901   │
·-----------------|----------------------|-----------|--------------|
```

---

## 📁 Project Structure

```
contracts/
├── contracts/
│   ├── TreasuryManager.sol    # Main treasury contract
│   └── MockUSDC.sol           # Test USDC token
├── test/
│   └── TreasuryManager.test.ts # Comprehensive tests
├── scripts/
│   ├── deploy.ts              # Traditional deployment
│   └── verify.ts              # Contract verification
├── ignition/
│   └── modules/
│       └── TreasuryManager.ts # Ignition deployment module
├── deployments/               # Deployment artifacts (gitignored)
├── artifacts/                 # Compiled contracts (gitignored)
├── cache/                     # Hardhat cache (gitignored)
├── coverage/                  # Coverage reports (gitignored)
├── hardhat.config.ts          # Hardhat configuration
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

---

## 🔧 Troubleshooting

### Common Issues

**Issue**: `Error: Invalid nonce`
```bash
# Solution: Reset Hardhat network
npx hardhat clean
rm -rf cache artifacts
```

**Issue**: `Error: Insufficient funds`
```bash
# Solution: Get testnet CRO from faucet
# Visit: https://cronos.org/faucet
```

**Issue**: `TypeError: Cannot read properties of undefined`
```bash
# Solution: Ensure all dependencies are installed
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Additional Resources

- [Hardhat v3 Documentation](https://hardhat.org/docs)
- [Hardhat Ignition](https://hardhat.org/ignition)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Cronos Documentation](https://docs.cronos.org)
- [x402 Specification](https://docs.cronos.org/x402)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

---

<div align="center">

**Built with ❤️ for the Cronos x402 Hackathon**

⭐ Star this repo if you find it useful! ⭐

</div>