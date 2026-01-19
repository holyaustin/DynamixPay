import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Verify deployed contracts on block explorer
 * @see https://hardhat.org/hardhat-runner/docs/guides/verifying
 */
async function main() {
  const network = hre.network.name;
  console.log(`🔍 Verifying contracts on ${network}...`);
  console.log("=".repeat(60));

  // ==================== LOAD DEPLOYMENT INFO ====================
  
  const deploymentFile = path.join(__dirname, `../deployments/${network}.json`);
  
  if (!fs.existsSync(deploymentFile)) {
    console.error(`❌ Deployment file not found: ${deploymentFile}`);
    console.log("💡 Run deployment script first:");
    console.log(`   npx hardhat run scripts/deploy.ts --network ${network}`);
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const { treasuryManager, paymentToken, x402Facilitator, mockUSDC } = deployment.contracts;

  console.log("📋 Contracts to verify:");
  console.log(`  1. TreasuryManager: ${treasuryManager}`);
  if (mockUSDC) {
    console.log(`  2. MockUSDC:        ${mockUSDC}`);
  }
  console.log();

  // ==================== VERIFY TREASURY MANAGER ====================
  
  try {
    console.log("🔧 Verifying TreasuryManager...");
    
    await hre.run("verify:verify", {
      address: treasuryManager,
      constructorArguments: [paymentToken, x402Facilitator],
    });
    
    console.log("✅ TreasuryManager verified successfully!");
    console.log(`   View at: https://explorer.cronos.org/${network === 'cronosTestnet' ? 'testnet/' : ''}address/${treasuryManager}`);
    
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️  TreasuryManager is already verified");
    } else {
      console.error("❌ TreasuryManager verification failed:", error.message);
    }
  }

  // ==================== VERIFY MOCK USDC (if exists) ====================
  
  if (mockUSDC) {
    try {
      console.log("\n🔧 Verifying MockUSDC...");
      
      await hre.run("verify:verify", {
        address: mockUSDC,
        constructorArguments: [],
      });
      
      console.log("✅ MockUSDC verified successfully!");
      console.log(`   View at: https://explorer.cronos.org/${network === 'cronosTestnet' ? 'testnet/' : ''}address/${mockUSDC}`);
      
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("ℹ️  MockUSDC is already verified");
      } else {
        console.error("❌ MockUSDC verification failed:", error.message);
      }
    }
  }

  // ==================== SUMMARY ====================
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Verification process complete!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Verification failed:");
    console.error(error);
    process.exit(1);
  });