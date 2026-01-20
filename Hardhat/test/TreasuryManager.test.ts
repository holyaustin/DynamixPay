import { expect } from "chai";
import { network } from "hardhat";
import type { MockUSDC, TreasuryManager } from "../typechain-types/index.js";
// Get ethers and networkHelpers from the network connection
const { ethers, networkHelpers } = await network.connect();

describe("TreasuryManager", function () {
  // Test constants
  const USDC_DECIMALS = 6;
  const PAYMENT_INTERVAL = 30 * 24 * 60 * 60; // 30 days in seconds
  const INITIAL_THRESHOLD = ethers.parseUnits("10000", USDC_DECIMALS);

  // Define fixture return type
  interface FixtureResult {
    mockUSDC: MockUSDC;
    treasury: TreasuryManager;
    owner: any;
    x402Facilitator: any;
    payee1: any;
    payee2: any;
    nonOwner: any;
    mockUSDCAddress: string;
    treasuryAddress: string;
  }

  async function deployContractsFixture(): Promise<FixtureResult> {
    const [owner, x402Facilitator, payee1, payee2, nonOwner] = await ethers.getSigners();
    
    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    const mockUSDCAddress = await mockUSDC.getAddress();
    
    // Mint USDC to owner
    const mintAmount = ethers.parseUnits("1000000", USDC_DECIMALS);
    await mockUSDC.mint(owner.address, mintAmount);
    
    // Deploy TreasuryManager
    const TreasuryManager = await ethers.getContractFactory("TreasuryManager");
    const treasury = await TreasuryManager.deploy(
      mockUSDCAddress,
      x402Facilitator.address
    );
    await treasury.waitForDeployment();
    const treasuryAddress = await treasury.getAddress();
    
    // Transfer USDC to treasury for testing
    const fundAmount = ethers.parseUnits("100000", USDC_DECIMALS);
    await mockUSDC.transfer(treasuryAddress, fundAmount);
    
    return {
      mockUSDC,
      treasury,
      owner,
      x402Facilitator,
      payee1,
      payee2,
      nonOwner,
      mockUSDCAddress,
      treasuryAddress,
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { treasury, owner } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      expect(await treasury.owner()).to.equal(owner.address);
    });

    it("Should set the right payment token", async function () {
      const { treasury, mockUSDCAddress } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      expect(await treasury.paymentToken()).to.equal(mockUSDCAddress);
    });

    it("Should set the right x402 facilitator", async function () {
      const { treasury, x402Facilitator } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      expect(await treasury.x402Facilitator()).to.equal(x402Facilitator.address);
    });

    it("Should set initial revenue threshold", async function () {
      const { treasury } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      const threshold = await treasury.revenueThreshold();
      expect(threshold).to.equal(INITIAL_THRESHOLD);
    });
  });

  describe("Payee Management", function () {
    it("Should add payee correctly", async function () {
      const { treasury, payee1 } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      const salary = ethers.parseUnits("3000", USDC_DECIMALS);
      await treasury.addPayee(payee1.address, salary);
      
      const [payees, salaries] = await treasury.getActivePayees();
      expect(payees[0]).to.equal(payee1.address);
      expect(salaries[0]).to.equal(salary);
    });

    it("Should batch add payees", async function () {
      const { treasury, payee1, payee2 } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      const salaries = [
        ethers.parseUnits("3000", USDC_DECIMALS),
        ethers.parseUnits("5000", USDC_DECIMALS),
      ];
      
      await treasury.addPayees([payee1.address, payee2.address], salaries);
      
      const [payees, actualSalaries] = await treasury.getActivePayees();
      expect(payees).to.deep.equal([payee1.address, payee2.address]);
      expect(actualSalaries).to.deep.equal(salaries);
    });

    it("Should update payee salary", async function () {
      const { treasury, payee1 } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      const initialSalary = ethers.parseUnits("3000", USDC_DECIMALS);
      const newSalary = ethers.parseUnits("4000", USDC_DECIMALS);
      
      await treasury.addPayee(payee1.address, initialSalary);
      await treasury.updatePayeeSalary(payee1.address, newSalary);
      
      const [, salaries] = await treasury.getActivePayees();
      expect(salaries[0]).to.equal(newSalary);
    });

    it("Should deactivate payee", async function () {
      const { treasury, payee1 } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      const salary = ethers.parseUnits("3000", USDC_DECIMALS);
      await treasury.addPayee(payee1.address, salary);
      
      // Check initial count
      expect(await treasury.getActivePayeeCount()).to.equal(1);
      
      // Deactivate payee
      await treasury.deactivatePayee(payee1.address);
      
      // Check count after deactivation
      expect(await treasury.getActivePayeeCount()).to.equal(0);
    });

    it("Should prevent non-owner from adding payees", async function () {
      const { treasury, payee1, nonOwner } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      const salary = ethers.parseUnits("3000", USDC_DECIMALS);
      
      await expect(
        treasury.connect(nonOwner).addPayee(payee1.address, salary)
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });
  });

  describe("Revenue Threshold", function () {
    it("Should update revenue threshold", async function () {
      const { treasury } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      const newThreshold = ethers.parseUnits("20000", USDC_DECIMALS);
      await treasury.updateRevenueThreshold(newThreshold);
      
      expect(await treasury.revenueThreshold()).to.equal(newThreshold);
    });

    it("Should prevent non-owner from updating threshold", async function () {
      const { treasury, nonOwner } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      const newThreshold = ethers.parseUnits("20000", USDC_DECIMALS);
      
      await expect(
        treasury.connect(nonOwner).updateRevenueThreshold(newThreshold)
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });
  });

  describe("Payroll Processing", function () {
    it("Should create payment requests when due", async function () {
      const { treasury, payee1, payee2 } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      // Add payees
      const salaries = [
        ethers.parseUnits("3000", USDC_DECIMALS),
        ethers.parseUnits("5000", USDC_DECIMALS),
      ];
      
      await treasury.addPayees([payee1.address, payee2.address], salaries);
      
      // Fast forward time past payment interval
      await networkHelpers.time.increase(PAYMENT_INTERVAL + 1);
      
      // Create payment requests
      const [requestIds, totalAmount] = await treasury.createPaymentRequests();
      
      expect(requestIds.length).to.equal(2);
      expect(totalAmount).to.equal(ethers.parseUnits("8000", USDC_DECIMALS));
      
      // Check first payment request
      const paymentRequest = await treasury.getPaymentRequest(requestIds[0]);
      expect(paymentRequest.payee).to.equal(payee1.address);
      expect(paymentRequest.amount).to.equal(salaries[0]);
      expect(paymentRequest.settled).to.be.false;
    });

    it("Should not create payment requests before interval", async function () {
      const { treasury, payee1 } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      const salary = ethers.parseUnits("3000", USDC_DECIMALS);
      await treasury.addPayee(payee1.address, salary);
      
      // Try to create payment requests immediately
      const [requestIds, totalAmount] = await treasury.createPaymentRequests();
      
      expect(requestIds.length).to.equal(0);
      expect(totalAmount).to.equal(0);
    });

    it("Should revert with insufficient balance", async function () {
      const { treasury, payee1 } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      // Add payee with large salary
      const largeSalary = ethers.parseUnits("200000", USDC_DECIMALS);
      await treasury.addPayee(payee1.address, largeSalary);
      
      // Fast forward time
      await networkHelpers.time.increase(PAYMENT_INTERVAL + 1);
      
      // Should revert due to insufficient balance (treasury only has 100k USDC)
      await expect(treasury.createPaymentRequests())
        .to.be.revertedWithCustomError(treasury, "InsufficientBalance");
    });
  });

  describe("x402 Integration", function () {
    it("Should allow x402 facilitator to mark payment settled", async function () {
      const { treasury, payee1, x402Facilitator } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      // Add payee and create payment request
      const salary = ethers.parseUnits("3000", USDC_DECIMALS);
      await treasury.addPayee(payee1.address, salary);
      await networkHelpers.time.increase(PAYMENT_INTERVAL + 1);
      
      const [requestIds] = await treasury.createPaymentRequests();
      
      // Mark as settled by x402 facilitator
      const x402PaymentId = ethers.keccak256(ethers.toUtf8Bytes("test-payment"));
      const txHash = ethers.keccak256(ethers.toUtf8Bytes("test-tx"));
      
      await treasury.connect(x402Facilitator).markPaymentSettled(
        requestIds[0],
        x402PaymentId,
        txHash
      );
      
      // Check payment is settled
      const paymentRequest = await treasury.getPaymentRequest(requestIds[0]);
      expect(paymentRequest.settled).to.be.true;
      expect(paymentRequest.x402Id).to.equal(x402PaymentId);
    });

    it("Should prevent non-x402 from marking payment settled", async function () {
      const { treasury, payee1, nonOwner } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      // Add payee and create payment request
      const salary = ethers.parseUnits("3000", USDC_DECIMALS);
      await treasury.addPayee(payee1.address, salary);
      await networkHelpers.time.increase(PAYMENT_INTERVAL + 1);
      
      const [requestIds] = await treasury.createPaymentRequests();
      
      // Try to mark as settled by non-x402
      const x402PaymentId = ethers.keccak256(ethers.toUtf8Bytes("test-payment"));
      const txHash = ethers.keccak256(ethers.toUtf8Bytes("test-tx"));
      
      await expect(
        treasury.connect(nonOwner).markPaymentSettled(
          requestIds[0],
          x402PaymentId,
          txHash
        )
      ).to.be.revertedWithCustomError(treasury, "OnlyX402Facilitator");
    });

    it("Should prevent marking already settled payment", async function () {
      const { treasury, payee1, x402Facilitator } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      // Add payee and create payment request
      const salary = ethers.parseUnits("3000", USDC_DECIMALS);
      await treasury.addPayee(payee1.address, salary);
      await networkHelpers.time.increase(PAYMENT_INTERVAL + 1);
      
      const [requestIds] = await treasury.createPaymentRequests();
      
      const x402PaymentId = ethers.keccak256(ethers.toUtf8Bytes("test-payment"));
      const txHash = ethers.keccak256(ethers.toUtf8Bytes("test-tx"));
      
      // Settle payment
      await treasury.connect(x402Facilitator).markPaymentSettled(
        requestIds[0],
        x402PaymentId,
        txHash
      );
      
      // Try to settle again
      await expect(
        treasury.connect(x402Facilitator).markPaymentSettled(
          requestIds[0],
          ethers.keccak256(ethers.toUtf8Bytes("another-payment")),
          txHash
        )
      ).to.be.revertedWithCustomError(treasury, "PaymentAlreadySettled");
    });
  });

  describe("View Functions", function () {
    it("Should get active payees with details", async function () {
      const { treasury, payee1, payee2 } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      const salaries = [
        ethers.parseUnits("3000", USDC_DECIMALS),
        ethers.parseUnits("5000", USDC_DECIMALS),
      ];
      
      await treasury.addPayees([payee1.address, payee2.address], salaries);
      
      const [addresses, actualSalaries, lastPayments, accrued] = await treasury.getActivePayees();
      
      expect(addresses).to.deep.equal([payee1.address, payee2.address]);
      expect(actualSalaries).to.deep.equal(salaries);
      expect(lastPayments[0]).to.equal(0);
      expect(accrued[0]).to.equal(0);
    });

    it("Should get payee details", async function () {
      const { treasury, payee1 } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      const salary = ethers.parseUnits("3000", USDC_DECIMALS);
      await treasury.addPayee(payee1.address, salary);
      
      const payeeDetails = await treasury.getPayee(payee1.address);
      
      expect(payeeDetails.salary).to.equal(salary);
      expect(payeeDetails.lastPayment).to.equal(0);
      expect(payeeDetails.accrued).to.equal(0);
      expect(payeeDetails.active).to.be.true;
    });

    it("Should get treasury balance", async function () {
      const { treasury, mockUSDC } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      const treasuryAddress = await treasury.getAddress();
      const expectedBalance = await mockUSDC.balanceOf(treasuryAddress);
      const actualBalance = await treasury.getTreasuryBalance();
      
      expect(actualBalance).to.equal(expectedBalance);
    });

    it("Should check if payroll should trigger", async function () {
      const { treasury } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      // Initially should return false (revenue < threshold)
      let shouldTrigger = await treasury.shouldTriggerPayroll(ethers.parseUnits("5000", USDC_DECIMALS));
      expect(shouldTrigger).to.be.false;
      
      // With enough revenue but not enough time
      shouldTrigger = await treasury.shouldTriggerPayroll(ethers.parseUnits("15000", USDC_DECIMALS));
      expect(shouldTrigger).to.be.false;
      
      // Fast forward time
      await networkHelpers.time.increase(2 * 24 * 60 * 60); // 2 days
      
      // With enough revenue and time
      shouldTrigger = await treasury.shouldTriggerPayroll(ethers.parseUnits("15000", USDC_DECIMALS));
      expect(shouldTrigger).to.be.true;
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to emergency withdraw", async function () {
      const { treasury, owner, mockUSDC, mockUSDCAddress } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      const treasuryAddress = await treasury.getAddress();
      const initialBalance = await mockUSDC.balanceOf(treasuryAddress);
      
      // Emergency withdraw
      const withdrawAmount = initialBalance / 2n;
      await treasury.emergencyWithdraw(mockUSDCAddress, withdrawAmount);
      
      const finalBalance = await mockUSDC.balanceOf(treasuryAddress);
      expect(finalBalance).to.equal(initialBalance - withdrawAmount);
    });

    it("Should allow owner to withdraw payment token directly", async function () {
      const { treasury, owner, mockUSDC } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      const treasuryAddress = await treasury.getAddress();
      const initialBalance = await mockUSDC.balanceOf(treasuryAddress);
      
      // Withdraw payment token
      const withdrawAmount = 1000n * 10n ** 6n;
      await treasury.withdrawPaymentToken(withdrawAmount);
      
      const finalBalance = await mockUSDC.balanceOf(treasuryAddress);
      expect(finalBalance).to.equal(initialBalance - withdrawAmount);
    });

    it("Should prevent non-owner from emergency withdraw", async function () {
      const { treasury, nonOwner, mockUSDCAddress } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      await expect(
        treasury.connect(nonOwner).emergencyWithdraw(mockUSDCAddress, 1000n)
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });

    it("Should update x402 facilitator", async function () {
      const { treasury, owner, payee2 } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      const newFacilitator = payee2.address;
      await treasury.updateX402Facilitator(newFacilitator);
      
      expect(await treasury.x402Facilitator()).to.equal(newFacilitator);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero address checks", async function () {
      const { treasury } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      const salary = ethers.parseUnits("3000", USDC_DECIMALS);
      
      await expect(
        treasury.addPayee(ethers.ZeroAddress, salary)
      ).to.be.revertedWithCustomError(treasury, "InvalidAddress");
    });

    it("Should handle zero amount checks", async function () {
      const { treasury, payee1 } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      await expect(
        treasury.addPayee(payee1.address, 0)
      ).to.be.revertedWithCustomError(treasury, "ZeroAmount");
    });

    it("Should handle duplicate payee", async function () {
      const { treasury, payee1 } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      const salary = ethers.parseUnits("3000", USDC_DECIMALS);
      await treasury.addPayee(payee1.address, salary);
      
      await expect(
        treasury.addPayee(payee1.address, salary)
      ).to.be.revertedWithCustomError(treasury, "PayeeAlreadyExists");
    });

    it("Should handle array length mismatch", async function () {
      const { treasury, payee1, payee2 } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      const salaries = [ethers.parseUnits("3000", USDC_DECIMALS)];
      
      await expect(
        treasury.addPayees([payee1.address, payee2.address], salaries)
      ).to.be.revertedWithCustomError(treasury, "ArrayLengthMismatch");
    });

    it("Should handle invalid request ID", async function () {
      const { treasury } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      await expect(treasury.getPaymentRequest(999))
        .to.be.revertedWithCustomError(treasury, "InvalidRequestId");
    });

    it("Should handle payee not found", async function () {
      const { treasury, payee1 } = await networkHelpers.loadFixture(deployContractsFixture) as FixtureResult;
      
      await expect(
        treasury.updatePayeeSalary(payee1.address, 1000)
      ).to.be.revertedWithCustomError(treasury, "PayeeNotFound");
    });
  });
});