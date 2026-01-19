import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Traditional deployment script for TreasuryManager
 * @see https://hardhat.org/hardhat-runner/docs/guides/deploying
 */
async function main() {
  console.log("🚀 Starting deployment to", hre.network.name);
  console.log("=".repeat(60));
  
  // ==================== SETUP ====================
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deployer address:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", hre.ethers.formatEther(balance), "CRO");
  
  // Network-specific addresses
  const ADDRESSES = {
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
  };
  
  const isTestnet = hre.network.name === "cronosTestnet" || hre.network.config.chainId === 338;
  const isLocal = hre.network.name === "hardhat" || hre.network.name === "localhost";
  const addresses = isTestnet ? ADDRESSES.cronosTestnet : ADDRESSES.cronosMainnet;
  
  // ==================== DEPLOY MOCK USDC (Local/Testing Only) ====================
  
  let usdcAddress = addresses.usdc;
  let mockUSDC: any = null;
  
  if (isLocal) {
    console.log("\n🛠️  Deploying MockUSDC for local testing...");
    
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    
    usdcAddress = await mockUSDC.getAddress();
    console.log("✅ MockUSDC deployed to:", usdcAddress);
    
    // Mint tokens to deployer
    const mintAmount = 1_000_000n * 10n ** 6n; // 1M USDC
    await mockUSDC.mint(deployer.address, mintAmount);
    console.log(`✅ Minted ${hre.ethers.formatUnits(mintAmount, 6)} MockUSDC to deployer`);
  }
  
  // ==================== DEPLOY TREASURY MANAGER ====================
  
  console.log("\n🛠️  Deploying TreasuryManager...");
  console.log("📊 Payment Token (USDC):", usdcAddress);
  console.log("🤖 x402 Facilitator:", addresses.x402Facilitator);
  
  const TreasuryManager = await hre.ethers.getContractFactory("TreasuryManager");
  const treasury = await TreasuryManager.deploy(
    usdcAddress,
    addresses.x402Facilitator
  );
  
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  
  console.log("✅ TreasuryManager deployed to:", treasuryAddress);
  
  // Explorer link
  if (!isLocal) {
    const explorerUrl = isTestnet 
      ? `https://explorer.cronos.org/testnet/address/${treasuryAddress}`
      : `https://explorer.cronos.org/address/${treasuryAddress}`;
    console.log("🔗 View on Explorer:", explorerUrl);
  }
  
  // ==================== INITIAL SETUP ====================
  
  console.log("\n⚙️  Performing initial setup...");
  
  // Fund treasury (local/testnet only)
  if (isLocal || isTestnet) {
    if (mockUSDC) {
      const fundAmount = 100_000n * 10n ** 6n; // 100k USDC
      console.log("💰 Funding treasury with", hre.ethers.formatUnits(fundAmount, 6), "USDC...");
      
      await mockUSDC.mint(treasuryAddress, fundAmount);
      console.log("✅ Treasury funded");
    }
  }
  
  // Add sample payees (local/testnet only)
  if (isLocal || isTestnet) {
    const samplePayees = [
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Hardhat account 1
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Hardhat account 2
    ];
    
    const sampleSalaries = [
      3000n * 10n ** 6n, // 3000 USDC
      5000n * 10n ** 6n, // 5000 USDC
    ];
    
    console.log("👥 Adding sample payees...");
    const tx = await treasury.addPayees(samplePayees, sampleSalaries);
    await tx.wait();
    console.log("✅ Added", samplePayees.length, "sample payees");
    
    // Display payee details
    const [addresses, salaries] = await treasury.getActivePayees();
    console.log("\n📋 Active Payees:");
    addresses.forEach((addr: string, i: number) => {
      console.log(`  ${i + 1}. ${addr}: ${hre.ethers.formatUnits(salaries[i], 6)} USDC/month`);
    });
  }
  
  // ==================== SAVE DEPLOYMENT INFO ====================
  
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      treasuryManager: treasuryAddress,
      paymentToken: usdcAddress,
      x402Facilitator: addresses.x402Facilitator,
      mockUSDC: mockUSDC ? await mockUSDC.getAddress() : null,
    },
    configuration: {
      revenueThreshold: hre.ethers.formatUnits(await treasury.revenueThreshold(), 6),
      totalMonthlyOutflow: hre.ethers.formatUnits(await treasury.totalMonthlyOutflow(), 6),
      activePayeeCount: (await treasury.getActivePayeeCount()).toString(),
    },
  };
  
  // Create deployments directory
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Save deployment info
  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n📁 Deployment info saved to:", deploymentFile);
  
  // ==================== VERIFICATION INSTRUCTIONS ====================
  
  if (!isLocal) {
    console.log("\n🔍 Verification Commands:");
    console.log("\n  Treasury Manager:");
    console.log(`  npx hardhat verify --network ${hre.network.name} ${treasuryAddress} ${usdcAddress} ${addresses.x402Facilitator}`);
    
    if (mockUSDC) {
      console.log("\n  Mock USDC:");
      console.log(`  npx hardhat verify --network ${hre.network.name} ${await mockUSDC.getAddress()}`);
    }
  }
  
  // ==================== GAS REPORT ====================
  
  const gasUsed = await hre.ethers.provider.getBalance(deployer.address);
  const gasCost = balance - gasUsed;
  
  console.log("\n⛽ Gas Statistics:");
  console.log(`  Total Gas Cost: ${hre.ethers.formatEther(gasCost)} CRO`);
  console.log(`  Remaining Balance: ${hre.ethers.formatEther(gasUsed)} CRO`);
  
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

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });