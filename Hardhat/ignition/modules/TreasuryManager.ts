import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Hardhat Ignition deployment module for TreasuryManager
 * @see https://hardhat.org/ignition/docs/guides/creating-modules
 */
const TreasuryManagerModule = buildModule("TreasuryManagerModule", (m) => {
  // ==================== PARAMETERS ====================
  
  // USDC addresses for different networks
  const usdcAddresses = {
    cronosTestnet: "0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0", // devUSDC.e
    cronosMainnet: "0xc21223249CA28397B4B6541dfFaecC539BfF0c59", // USDC
  };
  
  // Get network-specific USDC address or deploy mock
  const usdcAddress = m.getParameter(
    "usdcAddress",
    process.env.USDC_ADDRESS || usdcAddresses.cronosTestnet
  );
  
  const x402Facilitator = m.getParameter(
    "x402Facilitator",
    process.env.X402_FACILITATOR_ADDRESS || "0x0000000000000000000000000000000000000001"
  );
  
  // ==================== MOCK USDC (for local/testing) ====================
  
  const mockUSDC = m.contract("MockUSDC", [], {
    id: "MockUSDC",
  });
  
  // Use mock USDC for local networks, otherwise use provided address
  const paymentToken = m.conditionalParameter(
    "paymentToken",
    m.readEventArgument(mockUSDC, "Transfer", "to", 0),
    usdcAddress
  );
  
  // ==================== TREASURY MANAGER ====================
  
  const treasury = m.contract("TreasuryManager", [paymentToken, x402Facilitator], {
    id: "TreasuryManager",
  });
  
  // ==================== INITIAL SETUP ====================
  
  // Add sample payees (only for testnet/local)
  const samplePayees = m.getParameter("samplePayees", [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  ]);
  
  const sampleSalaries = m.getParameter("sampleSalaries", [
    3000n * 10n ** 6n, // 3000 USDC
    5000n * 10n ** 6n, // 5000 USDC
  ]);
  
  // Add sample payees call
  m.call(treasury, "addPayees", [samplePayees, sampleSalaries], {
    id: "AddSamplePayees",
    after: [treasury],
  });
  
  // ==================== FUND TREASURY (for testing) ====================
  
  const fundAmount = m.getParameter("fundAmount", 100000n * 10n ** 6n); // 100k USDC
  
  m.call(mockUSDC, "mint", [treasury, fundAmount], {
    id: "FundTreasury",
    after: [treasury],
  });
  
  // ==================== RETURN DEPLOYED CONTRACTS ====================
  
  return {
    treasury,
    mockUSDC,
    paymentToken,
  };
});

export default TreasuryManagerModule;