import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Get the current file's directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Traditional deployment script for TreasuryManager
 * Using Hardhat v3 network API pattern
 */
async function main() {
  // Check for required environment variables
  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY is not set in .env file");
  }
  
  // Get network connection
  const { ethers, networkHelpers } = await hre.network.connect();
  
  // Get network info from the provider
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  // Determine network name from chainId or use a default
  const networkName = getNetworkNameFromChainId(chainId);
  
  console.log("🚀 Starting deployment to", networkName);
  console.log("=".repeat(60));
  
  // Create wallet from private key
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, ethers.provider);
  const deployer = wallet;
  
  console.log("📝 Deployer address:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(balance), "CRO");
  
  // Check if deployer has enough balance
  if (balance === 0n && networkName !== "hardhat" && networkName !== "localhost") {
    console.warn("⚠️  Deployer has zero balance. Make sure to fund the address.");
  }
  
  // Network-specific addresses
  const ADDRESSES: Record<string, { usdc: string; x402Facilitator: string }> = {
    cronosTestnet: {
      usdc: "0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0", // devUSDC.e
      x402Facilitator: process.env.X402_FACILITATOR_ADDRESS || 
        "0x0000000000000000000000000000000000000001",
    },
    cronosMainnet: {
      usdc: "0xc21223249CA28397B4B6541dfFaecC539BfF0c59", // USDC
      x402Facilitator: process.env.X402_FACILITATOR_ADDRESS || 
        "0x0000000000000000000000000000000000000001",
    },
    hardhat: {
      usdc: "",
      x402Facilitator: "0x0000000000000000000000000000000000000001",
    },
    localhost: {
      usdc: "",
      x402Facilitator: "0x0000000000000000000000000000000000000001",
    },
    hardhatMainnet: {
      usdc: "",
      x402Facilitator: "0x0000000000000000000000000000000000000001",
    },
    hardhatOp: {
      usdc: "",
      x402Facilitator: "0x0000000000000000000000000000000000000001",
    },
    sepolia: {
      usdc: "",
      x402Facilitator: "0x0000000000000000000000000000000000000001",
    },
  };
    
  const isTestnet = chainId === 338; // Cronos testnet chain ID
  const isLocal = chainId === 31337 || chainId === 1337; // Hardhat/Localhost chain IDs
  
  // Get addresses for current network
  const addresses = ADDRESSES[networkName] || ADDRESSES.hardhat;
  
  // ==================== DEPLOY MOCK USDC (Local/Testing Only) ====================
  
  let usdcAddress = addresses.usdc;
  let mockUSDC: any = null;
  
  if (isLocal) {
    console.log("\n🛠️  Deploying MockUSDC for local testing...");
    
    const MockUSDC = await ethers.getContractFactory("MockUSDC", deployer);
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    
    usdcAddress = await mockUSDC.getAddress();
    console.log("✅ MockUSDC deployed to:", usdcAddress);
    
    // Mint tokens to deployer
    const mintAmount = ethers.parseUnits("1000000", 6); // 1M USDC
    const tx = await mockUSDC.mint(deployer.address, mintAmount);
    await tx.wait();
    console.log(`✅ Minted ${ethers.formatUnits(mintAmount, 6)} MockUSDC to deployer`);
  }
  
  // ==================== DEPLOY TREASURY MANAGER ====================
  
  console.log("\n🛠️  Deploying TreasuryManager...");
  console.log("📊 Payment Token (USDC):", usdcAddress);
  console.log("🤖 x402 Facilitator:", addresses.x402Facilitator);
  
  const TreasuryManager = await ethers.getContractFactory("TreasuryManager", deployer);
  const treasury = await TreasuryManager.deploy(
    usdcAddress,
    addresses.x402Facilitator
  );
  
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  
  console.log("✅ TreasuryManager deployed to:", treasuryAddress);
  
  // Explorer link
  if (!isLocal && (chainId === 338 || chainId === 25)) {
    const explorerUrl = isTestnet 
      ? `https://explorer.cronos.org/testnet/address/${treasuryAddress}`
      : `https://explorer.cronos.org/address/${treasuryAddress}`;
    console.log("🔗 View on Explorer:", explorerUrl);
  }
  
  // ==================== INITIAL SETUP ====================
  
  console.log("\n⚙️  Performing initial setup...");
  
  // Fund treasury (local/testnet only)
  if (isLocal && mockUSDC) {
    const fundAmount = ethers.parseUnits("100000", 6); // 100k USDC
    console.log("💰 Funding treasury with", ethers.formatUnits(fundAmount, 6), "USDC...");
    
    const mintTx = await mockUSDC.mint(treasuryAddress, fundAmount);
    await mintTx.wait();
    console.log("✅ Treasury funded");
  }
  
  // Add sample payees (local/testnet only)
  if (isLocal || isTestnet) {
    const samplePayees = [
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Hardhat account 1
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Hardhat account 2
    ];
    
    const sampleSalaries = [
      ethers.parseUnits("3000", 6), // 3000 USDC
      ethers.parseUnits("5000", 6), // 5000 USDC
    ];
    
    console.log("👥 Adding sample payees...");
    const addTx = await treasury.addPayees(samplePayees, sampleSalaries);
    await addTx.wait();
    console.log("✅ Added", samplePayees.length, "sample payees");
    
    // Display payee details
    const [payeeAddresses, salaries] = await treasury.getActivePayees();
    console.log("\n📋 Active Payees:");
    payeeAddresses.forEach((addr: string, i: number) => {
      console.log(`  ${i + 1}. ${addr}: ${ethers.formatUnits(salaries[i], 6)} USDC/month`);
    });
  }
  
  // ==================== SAVE DEPLOYMENT INFO ====================
  
  const deploymentInfo = {
    network: networkName,
    chainId: chainId,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      treasuryManager: treasuryAddress,
      paymentToken: usdcAddress,
      x402Facilitator: addresses.x402Facilitator,
      mockUSDC: mockUSDC ? await mockUSDC.getAddress() : null,
    },
    configuration: {
      revenueThreshold: ethers.formatUnits(await treasury.revenueThreshold(), 6),
      totalMonthlyOutflow: ethers.formatUnits(await treasury.totalMonthlyOutflow(), 6),
      activePayeeCount: (await treasury.getActivePayeeCount()).toString(),
    },
  };
  
  // Create deployments directory
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Save deployment info
  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n📁 Deployment info saved to:", deploymentFile);
  
  // ==================== VERIFICATION INSTRUCTIONS ====================
  
  if (!isLocal) {
    console.log("\n🔍 Verification Commands:");
    console.log("\n  Treasury Manager:");
    console.log(`  npx hardhat verify --network ${networkName} ${treasuryAddress} ${usdcAddress} "${addresses.x402Facilitator}"`);
    
    if (mockUSDC) {
      console.log("\n  Mock USDC:");
      console.log(`  npx hardhat verify --network ${networkName} ${await mockUSDC.getAddress()}`);
    }
  }
  
  // ==================== GAS REPORT ====================
  
  const finalBalance = await ethers.provider.getBalance(deployer.address);
  const gasCost = balance - finalBalance;
  
  console.log("\n⛽ Gas Statistics:");
  console.log(`  Total Gas Cost: ${ethers.formatEther(gasCost)} CRO`);
  console.log(`  Remaining Balance: ${ethers.formatEther(finalBalance)} CRO`);
  
  // ==================== FINAL SUMMARY ====================
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📊 Contract Summary:");
  console.log(`  Treasury Manager: ${treasuryAddress}`);
  console.log(`  Payment Token:    ${usdcAddress}`);
  console.log(`  x402 Facilitator: ${addresses.x402Facilitator}`);
  
  if (mockUSDC) {
    console.log(`  Mock USDC:        ${await mockUSDC.getAddress()}`);
  }
  
  console.log("\n🚀 Next Steps:");
  console.log("  1. Fund the treasury with USDC");
  console.log("  2. Update x402 facilitator address when available");
  console.log("  3. Add production payees");
  console.log("  4. Integrate with backend services");
  console.log("  5. Set up monitoring and alerts");
  
  if (!isLocal) {
    console.log("  6. Verify contracts on block explorer");
  }
  
  console.log("\n" + "=".repeat(60));
}

// Helper function to get network name from chainId
function getNetworkNameFromChainId(chainId: number): string {
  const networkMap: Record<number, string> = {
    1: "mainnet",
    11155111: "sepolia",
    25: "cronosMainnet",
    338: "cronosTestnet",
    31337: "hardhat",
    1337: "localhost",
    // Add other chain IDs as needed
  };
  
  return networkMap[chainId] || "unknown";
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });