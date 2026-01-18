# 🚀 DynamixPay: AI-Powered Treasury Automation for Cronos

**Dynamic Payroll & Treasury Management Agent | Cronos x402 Hackathon Submission**

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Hackathon Alignment](#-hackathon-alignment)
- [Demo & Submission](#-demo--submission)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

DynamixPay is an AI-powered treasury automation system built for the **Cronos x402 Hackathon**. It enables DAOs and on-chain businesses to automate payroll, manage treasury assets, and execute intelligent, x402-powered payments—all with minimal human intervention.

### 🎯 Core Value Proposition

- 🤖 **Autonomous Decision-Making**: AI agent analyzes revenue, market conditions, and treasury health
- ⚡ **x402-Powered Payments**: Gasless, automated settlements using Cronos's x402 facilitator
- 📈 **Intelligent Treasury Management**: Dynamic asset allocation based on real-time market data
- 🔗 **Cronos Ecosystem Native**: Deep integration with Cronos EVM and Crypto.com infrastructure

---

## ✨ Features

### 🎭 Multi-Track Submission Ready

This project qualifies for multiple hackathon tracks:

- **Main Track**: x402 Applications (Broad Use Cases)
- **x402 Agentic Finance Track**: Advanced programmatic settlement
- **Crypto.com X Cronos Integration**: Ecosystem connectivity
- **Dev Tooling Track**: AI agent infrastructure

### 🔧 Technical Highlights

| Feature | Implementation | Hackathon Relevance |
|---------|---------------|---------------------|
| x402 Payments | Full EIP-3009 integration with Cronos Facilitator SDK | Core hackathon technology |
| AI Agent | Market-aware decision engine with Cron job automation | AI/Agentic focus |
| Gas Optimization | Efficient Solidity patterns + viaIR compilation | Production-ready |
| Real-time Data | Crypto.com Market Data MCP integration | Ecosystem integration |
| Wallet Support | MetaMask + Crypto.com DeFi Wallet | User accessibility |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────┐    │
│  │ Dashboard  │  │   Payroll   │  │   Treasury Manager   │    │
│  └────────────┘  └─────────────┘  └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Node.js + AI)                      │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────┐    │
│  │ AI Agent   │  │ x402 SDK    │  │  Market Data MCP     │    │
│  └────────────┘  └─────────────┘  └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Cronos Blockchain (Testnet)                    │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────┐     │
│  │ TreasuryManager│  │  x402 Facilitator │  │  MockUSDC  │     │
│  └────────────────┘  └──────────────────┘  └────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Smart Contracts (`/packages/contracts`)

- **Solidity 0.8.20** (with viaIR for gas optimization)
- **Hardhat** (development & testing)
- **OpenZeppelin Contracts**
- **TypeChain** (TypeScript bindings)

### Backend Services (`/packages/backend`)

- **Node.js + TypeScript**
- **Express.js** (REST API)
- **Cronos x402 Facilitator SDK**
- **Crypto.com AI Agent SDK**
- **Market Data MCP Server**

### Frontend (`/packages/frontend`)

- **Next.js 16** (React 18)
- **TypeScript**
- **Tailwind CSS**
- **Wagmi + RainbowKit** (Web3 integration)
- **Recharts** (data visualization)

---

## 🚀 Quick Start

### Prerequisites

```bash
# Node.js 18+ and npm
node --version  # Should show 18.x or higher
npm --version   # Should show 9.x or higher

# MetaMask or Crypto.com DeFi Wallet browser extension
# Testnet tokens from Cronos faucets
```

### Installation & Setup

```bash
# 1. Clone repository
git clone https://github.com/your-username/dynamixpay.git
cd dynamixpay

# 2. Install root dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 4. Install workspace dependencies
npm run bootstrap  # Installs all packages
```

### Development

```bash
# Start all services in development mode
npm run dev

# Or start individually:
npm run dev:contracts  # Compile & test contracts
npm run dev:backend    # Start API server
npm run dev:frontend   # Start Next.js app
```

### Deployment

```bash
# Deploy to Cronos Testnet
cd packages/contracts
npm run deploy:testnet

# Verify contracts
npm run verify:testnet
```

---

## 📁 Project Structure

```
dynamixpay/
├── packages/
│   ├── contracts/          # Solidity smart contracts
│   │   ├── contracts/     # TreasuryManager, MockUSDC
│   │   ├── test/         # Comprehensive test suite
│   │   └── scripts/      # Deployment & verification
│   ├── backend/           # AI Agent & API server
│   │   ├── src/services/ # x402, AI, Market services
│   │   ├── src/api/      # REST endpoints
│   │   └── src/middleware/ # Auth, validation, etc.
│   └── frontend/          # Next.js 16 dashboard
│       ├── app/          # App router pages
│       ├── components/   # Reusable components
│       ├── hooks/        # Custom React hooks
│       └── lib/          # Utilities & configurations
├── docs/                  # Documentation
└── .github/              # CI/CD workflows
```

---

## 🎯 Hackathon Alignment

### ✔️ Submission Requirements Met

- ✅ **GitHub Repository**: Complete monorepo with all source code
- ✅ **On-Chain Component**: TreasuryManager.sol deployed on Cronos Testnet
- ✅ **x402 Integration**: Full EIP-3009 payment flow implementation
- ✅ **Demo Video**: Walkthrough of all features (see `/docs/demo-script.md`)
- ✅ **Functional Prototype**: Fully working end-to-end system

### 🏆 Judging Criteria Excellence

| Criterion | How DynamixPay Excels |
|-----------|----------------------|
| **Innovation** | First AI+x402 treasury automation system on Cronos |
| **Agentic Functionality** | Autonomous decision-making with market awareness |
| **Execution Quality** | Production-ready code with tests & documentation |
| **Ecosystem Value** | Solves real DAO/on-chain business pain points |

---

## 🎥 Demo & Submission

### Live Demo

- **Frontend Dashboard**: [https://dynamixpay.vercel.app](https://dynamixpay.vercel.app) (if deployed)
- **Testnet Contract**: View on Cronos Explorer
- **API Documentation**: `http://localhost:3001/api-docs` (when running locally)

### Demo Video Highlights

1. **Smart Contract Deployment** (2 min)
2. **AI Agent Decision Making** (3 min)
3. **x402 Payment Execution** (2 min)
4. **Dashboard Walkthrough** (3 min)
5. **Market Integration Demo** (2 min)

---

## 🤝 Contributing

This is a hackathon submission, but contributions are welcome! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

```bash
# 1. Create a feature branch
git checkout -b feature/amazing-feature

# 2. Make your changes
# 3. Run tests
npm test

# 4. Commit changes
git commit -m "Add amazing feature"

# 5. Push to branch
git push origin feature/amazing-feature
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🏆 Hackathon Submission Details

- **Team Name**: Your Team Name
- **Track**: Main Track (x402 Applications) + x402 Agentic Finance Track
- **Submission Date**: January 23, 2026
- **Demo Video Link**: [Link to your video]
- **Live Demo**: [Link to deployed application]

---

<div align="center">

**Built with ❤️ for the Cronos x402 Hackathon**

![Cronos Ecosystem](https://img.shields.io/badge/Cronos-Ecosystem-7B3FE4)
![x402 Enabled](https://img.shields.io/badge/x402-Enabled-00D395)
![License MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Next.js 16](https://img.shields.io/badge/Next.js-16-black)

⭐ **Star this repo if you find it useful!** ⭐

</div>