import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Hardhat Ignition deployment module for TreasuryManager
 * @see https://hardhat.org/ignition/docs/guides/creating-modules
 */
const TreasuryManagerModule = buildModule("TreasuryManagerModule", (m) => {
  // ==================== PARAMETERS ====================
  
  // Get deployment parameters
  const usdcAddress = m.getParameter(
    "usdcAddress",
    "0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0" // Cronos testnet devUSDC.e
  );
  
  const x402Facilitator = m.getParameter(
    "x402Facilitator",
    "0x0000000000000000000000000000000000000001" // Placeholder
  );
  
  const deployMockUSDC = m.getParameter("deployMockUSDC", false);
  
  // ==================== CONDITIONAL MOCK USDC DEPLOYMENT ====================
  
  let mockUSDC: any = null;
  let finalPaymentToken: any = usdcAddress;
  
  // Only deploy MockUSDC if explicitly requested
  if (deployMockUSDC) {
    mockUSDC = m.contract("MockUSDC", [], {
      id: "MockUSDC",
    });
    
    // Use mock USDC as the payment token
    finalPaymentToken = mockUSDC;
  }
  
  // ==================== TREASURY MANAGER ====================
  
  const treasury = m.contract("TreasuryManager", [finalPaymentToken, x402Facilitator], {
    id: "TreasuryManager",
  });
  
  // ==================== RETURN DEPLOYED CONTRACTS ====================
  
  // Return only contract futures
  const result: any = {
    treasury,
  };
  
  // Conditionally include mockUSDC if deployed
  if (mockUSDC) {
    result.mockUSDC = mockUSDC;
  }
  
  return result;
});

export default TreasuryManagerModule;

/**
 * USAGE EXAMPLES:
 * 
 * 1. Deploy with existing USDC (Cronos Testnet):
 *    npx hardhat ignition deploy ignition/modules/TreasuryManager.ts --network cronosTestnet
 * 
 * 2. Deploy with MockUSDC (local testing):
 *    npx hardhat ignition deploy ignition/modules/TreasuryManager.ts \
 *      --parameters '{"deployMockUSDC": true}'
 * 
 * 3. Deploy with custom addresses:
 *    npx hardhat ignition deploy ignition/modules/TreasuryManager.ts \
 *      --parameters '{"usdcAddress": "0x...", "x402Facilitator": "0x..."}'
 */