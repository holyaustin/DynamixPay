import { expect } from "chai";
import hre from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import type { TreasuryManager, MockUSDC } from "../typechain-types.js";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("TreasuryManager", function () {
  // Type declarations
  let treasury: TreasuryManager;
  let usdc: MockUSDC;
  let owner: HardhatEthersSigner;
  let payee1: HardhatEthersSigner;
  let payee2: HardhatEthersSigner;
  let x402Facilitator: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;

  // Constants
  const USDC_DECIMALS = 6n;
  const ONE_USDC = 10n ** USDC_DECIMALS;
  const THOUSAND_USDC = 1000n * ONE_USDC;
  const TEN_THOUSAND_USDC = 10000n * ONE_USDC;
  const THIRTY_DAYS = 30 * 24 * 60 * 60;

  /**
   * Deployment fixture - optimized for gas efficiency
   */
  async function deployTreasuryFixture() {
    const signers = await hre.ethers.getSigners();
    const [deployer, facilitator, p1, p2, s] = signers;
    
    // Deploy Mock USDC
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    
    // Deploy TreasuryManager
    const TreasuryManager = await hre.ethers.getContractFactory("TreasuryManager");
    const treasuryManager = await TreasuryManager.deploy(
      await mockUSDC.getAddress(),
      facilitator.address
    );
    await treasuryManager.waitForDeployment();
    
    // Fund treasury with USDC
    const treasuryAddress = await treasuryManager.getAddress();
    await mockUSDC.mint(treasuryAddress, TEN_THOUSAND_USDC * 10n);
    
    return {
      treasury: treasuryManager,
      usdc: mockUSDC,
      owner: deployer,
      x402Facilitator: facilitator,
      payee1: p1,
      payee2: p2,
      stranger: s
    };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployTreasuryFixture);
    treasury = fixture.treasury;
    usdc = fixture.usdc;
    owner = fixture.owner;
    x402Facilitator = fixture.x402Facilitator;
    payee1 = fixture.payee1;
    payee2 = fixture.payee2;
    stranger = fixture.stranger;
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await treasury.owner()).to.equal(owner.address);
    });

    it("Should set the correct payment token", async function () {
      expect(await treasury.paymentToken()).to.equal(await usdc.getAddress());
    });

    it("Should set the correct x402 facilitator", async function () {
      expect(await treasury.x402Facilitator()).to.equal(x402Facilitator.address);
    });

    it("Should set initial revenue threshold to 10,000 USDC", async function () {
      expect(await treasury.revenueThreshold()).to.equal(TEN_THOUSAND_USDC);
    });

    it("Should initialize with zero active payees", async function () {
      expect(await treasury.getActivePayeeCount()).to.equal(0);
    });

    it("Should revert deployment with zero address token", async function () {
      const TreasuryManager = await hre.ethers.getContractFactory("TreasuryManager");
      await expect(
        TreasuryManager.deploy(hre.ethers.ZeroAddress, x402Facilitator.address)
      ).to.be.revertedWithCustomError(TreasuryManager, "InvalidAddress");
    });
  });

  describe("Payee Management", function () {
    it("Should add a new payee successfully", async function () {
      await expect(treasury.connect(owner).addPayee(payee1.address, THOUSAND_USDC))
        .to.emit(treasury, "PayeeAdded")
        .withArgs(payee1.address, THOUSAND_USDC);
      
      const [addresses] = await treasury.getActivePayees();
      expect(addresses).to.include(payee1.address);
      expect(await treasury.getActivePayeeCount()).to.equal(1);
    });

    it("Should add multiple payees in batch", async function () {
      const addresses = [payee1.address, payee2.address];
      const salaries = [THOUSAND_USDC, THOUSAND_USDC * 2n];
      
      await treasury.connect(owner).addPayees(addresses, salaries);
      
      const [payeeAddresses, payeeSalaries] = await treasury.getActivePayees();
      expect(payeeAddresses).to.have.lengthOf(2);
      expect(payeeSalaries[0]).to.equal(THOUSAND_USDC);
      expect(payeeSalaries[1]).to.equal(THOUSAND_USDC * 2n);
    });

    it("Should update total monthly outflow when adding payees", async function () {
      await treasury.connect(owner).addPayee(payee1.address, THOUSAND_USDC);
      expect(await treasury.totalMonthlyOutflow()).to.equal(THOUSAND_USDC);
      
      await treasury.connect(owner).addPayee(payee2.address, THOUSAND_USDC * 2n);
      expect(await treasury.totalMonthlyOutflow()).to.equal(THOUSAND_USDC * 3n);
    });

    it("Should reject zero address payee", async function () {
      await expect(
        treasury.connect(owner).addPayee(hre.ethers.ZeroAddress, THOUSAND_USDC)
      ).to.be.revertedWithCustomError(treasury, "InvalidAddress");
    });

    it("Should reject zero salary", async function () {
      await expect(
        treasury.connect(owner).addPayee(payee1.address, 0)
      ).to.be.revertedWithCustomError(treasury, "ZeroAmount");
    });

    it("Should reject duplicate payee", async function () {
      await treasury.connect(owner).addPayee(payee1.address, THOUSAND_USDC);
      
      await expect(
        treasury.connect(owner).addPayee(payee1.address, THOUSAND_USDC)
      ).to.be.revertedWithCustomError(treasury, "PayeeAlreadyExists");
    });

    it("Should reject array length mismatch in batch add", async function () {
      await expect(
        treasury.connect(owner).addPayees(
          [payee1.address, payee2.address],
          [THOUSAND_USDC]
        )
      ).to.be.revertedWithCustomError(treasury, "ArrayLengthMismatch");
    });

    it("Should update payee salary", async function () {
      await treasury.connect(owner).addPayee(payee1.address, THOUSAND_USDC);
      
      await expect(
        treasury.connect(owner).updatePayeeSalary(payee1.address, THOUSAND_USDC * 2n)
      ).to.emit(treasury, "PayeeUpdated")
        .withArgs(payee1.address, THOUSAND_USDC * 2n);
      
      const [, salaries] = await treasury.getActivePayees();
      expect(salaries[0]).to.equal(THOUSAND_USDC * 2n);
    });

    it("Should update total monthly outflow when updating salary", async function () {
      await treasury.connect(owner).addPayee(payee1.address, THOUSAND_USDC);
      expect(await treasury.totalMonthlyOutflow()).to.equal(THOUSAND_USDC);
      
      await treasury.connect(owner).updatePayeeSalary(payee1.address, THOUSAND_USDC * 3n);
      expect(await treasury.totalMonthlyOutflow()).to.equal(THOUSAND_USDC * 3n);
    });

    it("Should reject updating non-existent payee", async function () {
      await expect(
        treasury.connect(owner).updatePayeeSalary(payee1.address, THOUSAND_USDC)
      ).to.be.revertedWithCustomError(treasury, "PayeeNotFound");
    });

    it("Should deactivate payee", async function () {
      await treasury.connect(owner).addPayee(payee1.address, THOUSAND_USDC);
      
      await expect(treasury.connect(owner).deactivatePayee(payee1.address))
        .to.emit(treasury, "PayeeDeactivated")
        .withArgs(payee1.address);
      
      const [addresses] = await treasury.getActivePayees();
      expect(addresses).to.have.lengthOf(0);
      expect(await treasury.totalMonthlyOutflow()).to.equal(0);
    });

    it("Should reject deactivating non-existent payee", async function () {
      await expect(
        treasury.connect(owner).deactivatePayee(payee1.address)
      ).to.be.revertedWithCustomError(treasury, "PayeeNotFound");
    });

    it("Should reject non-owner adding payees", async function () {
      await expect(
        treasury.connect(stranger).addPayee(payee1.address, THOUSAND_USDC)
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });
  });

  describe("Payroll Triggers", function () {
    beforeEach(async function () {
      await treasury.connect(owner).addPayee(payee1.address, THOUSAND_USDC);
      await treasury.connect(owner).addPayee(payee2.address, THOUSAND_USDC * 2n);
    });

    it("Should create payment requests after 30 days", async function () {
      await time.increase(THIRTY_DAYS);
      
      const tx = await treasury.connect(owner).createPaymentRequests();
      const receipt = await tx.wait();
      
      expect(receipt).to.not.be.null;
      
      // Check PayrollTriggered event
      await expect(tx)
        .to.emit(treasury, "PayrollTriggered");
    });

    it("Should return correct request IDs and total amount", async function () {
      await time.increase(THIRTY_DAYS);
      
      const [requestIds, totalAmount] = await treasury.connect(owner).createPaymentRequests.staticCall();
      
      expect(requestIds).to.have.length.greaterThan(0);
      expect(totalAmount).to.equal(THOUSAND_USDC * 3n);
    });

    it("Should not create payments before 30 days", async function () {
      const [requestIds, totalAmount] = await treasury.connect(owner).createPaymentRequests.staticCall();
      
      expect(requestIds).to.have.lengthOf(0);
      expect(totalAmount).to.equal(0);
    });

    it("Should update last payment timestamp", async function () {
      await time.increase(THIRTY_DAYS);
      await treasury.connect(owner).createPaymentRequests();
      
      const [, , lastPayments] = await treasury.getActivePayees();
      const currentTime = await time.latest();
      
      expect(lastPayments[0]).to.be.closeTo(currentTime, 2);
    });

    it("Should check revenue threshold correctly", async function () {
      const shouldTrigger = await treasury.shouldTriggerPayroll(TEN_THOUSAND_USDC);
      expect(shouldTrigger).to.be.true;
      
      const shouldNotTrigger = await treasury.shouldTriggerPayroll(ONE_USDC);
      expect(shouldNotTrigger).to.be.false;
    });

    it("Should respect minimum revenue check interval", async function () {
      await time.increase(THIRTY_DAYS);
      await treasury.connect(owner).createPaymentRequests();
      
      // Immediately check again - should not trigger
      const shouldTrigger = await treasury.shouldTriggerPayroll(TEN_THOUSAND_USDC);
      expect(shouldTrigger).to.be.false;
      
      // After 1 day, should trigger
      await time.increase(24 * 60 * 60);
      const shouldTriggerLater = await treasury.shouldTriggerPayroll(TEN_THOUSAND_USDC);
      expect(shouldTriggerLater).to.be.true;
    });

    it("Should reject if insufficient balance", async function () {
      const balance = await usdc.balanceOf(await treasury.getAddress());
      await treasury.connect(owner).withdrawPaymentToken(balance);
      
      await time.increase(THIRTY_DAYS);
      
      await expect(
        treasury.connect(owner).createPaymentRequests()
      ).to.be.revertedWithCustomError(treasury, "InsufficientBalance");
    });

    it("Should emit PaymentRequestCreated for each payee", async function () {
      await time.increase(THIRTY_DAYS);
      
      const tx = await treasury.connect(owner).createPaymentRequests();
      
      await expect(tx)
        .to.emit(treasury, "PaymentRequestCreated");
    });
  });

  describe("x402 Integration", function () {
    let requestId: bigint;
    
    beforeEach(async function () {
      await treasury.connect(owner).addPayee(payee1.address, THOUSAND_USDC);
      await time.increase(THIRTY_DAYS);
      const [ids] = await treasury.connect(owner).createPaymentRequests.staticCall();
      await treasury.connect(owner).createPaymentRequests();
      requestId = BigInt(ids[0].toString());
    });

    it("Should allow x402 facilitator to mark payment settled", async function () {
      const x402PaymentId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test-payment"));
      const txHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test-tx"));
      
      await expect(
        treasury.connect(x402Facilitator).markPaymentSettled(
          requestId,
          x402PaymentId,
          txHash
        )
      ).to.emit(treasury, "PaymentSettled")
        .withArgs(requestId, txHash);
      
      const [, , , x402Id, settled] = await treasury.getPaymentRequest(requestId);
      expect(settled).to.be.true;
      expect(x402Id).to.equal(x402PaymentId);
    });

    it("Should update accrued amount when marking settled", async function () {
      const [, , , accruedBefore] = await treasury.getActivePayees();
      
      const x402PaymentId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test-payment"));
      const txHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test-tx"));
      
      await treasury.connect(x402Facilitator).markPaymentSettled(
        requestId,
        x402PaymentId,
        txHash
      );
      
      const [, , , accruedAfter] = await treasury.getActivePayees();
      expect(accruedAfter[0]).to.be.lessThan(accruedBefore[0]);
    });

    it("Should reject non-facilitator from marking settled", async function () {
      await expect(
        treasury.connect(stranger).markPaymentSettled(
          requestId,
          hre.ethers.ZeroHash,
          hre.ethers.ZeroHash
        )
      ).to.be.revertedWithCustomError(treasury, "OnlyX402Facilitator");
    });

    it("Should reject already settled payments", async function () {
      const x402PaymentId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test-payment"));
      const txHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test-tx"));
      
      await treasury.connect(x402Facilitator).markPaymentSettled(
        requestId,
        x402PaymentId,
        txHash
      );
      
      await expect(
        treasury.connect(x402Facilitator).markPaymentSettled(
          requestId,
          x402PaymentId,
          txHash
        )
      ).to.be.revertedWithCustomError(treasury, "PaymentAlreadySettled");
    });

    it("Should reject invalid request ID", async function () {
      const invalidId = 999999n;
      
      await expect(
        treasury.connect(x402Facilitator).markPaymentSettled(
          invalidId,
          hre.ethers.ZeroHash,
          hre.ethers.ZeroHash
        )
      ).to.be.revertedWithCustomError(treasury, "InvalidRequestId");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await treasury.connect(owner).addPayees(
        [payee1.address, payee2.address],
        [THOUSAND_USDC, THOUSAND_USDC * 2n]
      );
    });

    it("Should get active payee count", async function () {
      const count = await treasury.getActivePayeeCount();
      expect(count).to.equal(2);
    });

    it("Should get treasury balance", async function () {
      const balance = await treasury.getTreasuryBalance();
      expect(balance).to.be.greaterThan(0);
    });

    it("Should get total accrued after payment requests", async function () {
      await time.increase(THIRTY_DAYS);
      await treasury.connect(owner).createPaymentRequests();
      
      const totalAccrued = await treasury.getTotalAccrued();
      expect(totalAccrued).to.equal(THOUSAND_USDC * 3n);
    });

    it("Should get payee details", async function () {
      const [salary, lastPayment, accrued, active] = await treasury.getPayee(payee1.address);
      
      expect(salary).to.equal(THOUSAND_USDC);
      expect(lastPayment).to.equal(0);
      expect(accrued).to.equal(0);
      expect(active).to.be.true;
    });

    it("Should get payment request details", async function () {
      await time.increase(THIRTY_DAYS);
      const [ids] = await treasury.connect(owner).createPaymentRequests.staticCall();
      await treasury.connect(owner).createPaymentRequests();
      
      const [payee, amount, timestamp, x402Id, settled] = 
        await treasury.getPaymentRequest(ids[0]);
      
      expect(payee).to.equal(payee1.address);
      expect(amount).to.equal(THOUSAND_USDC);
      expect(timestamp).to.be.greaterThan(0);
      expect(x402Id).to.equal(hre.ethers.ZeroHash);
      expect(settled).to.be.false;
    });
  });

  describe("Admin Functions", function () {
    it("Should update revenue threshold", async function () {
      const newThreshold = 20000n * ONE_USDC;
      
      await expect(treasury.connect(owner).updateRevenueThreshold(newThreshold))
        .to.emit(treasury, "RevenueThresholdUpdated")
        .withArgs(TEN_THOUSAND_USDC, newThreshold);
      
      expect(await treasury.revenueThreshold()).to.equal(newThreshold);
    });

    it("Should update x402 facilitator", async function () {
      const newFacilitator = payee1.address;
      
      await expect(treasury.connect(owner).updateX402Facilitator(newFacilitator))
        .to.emit(treasury, "X402FacilitatorUpdated")
        .withArgs(x402Facilitator.address, newFacilitator);
      
      expect(await treasury.x402Facilitator()).to.equal(newFacilitator);
    });

    it("Should reject zero address for x402 facilitator", async function () {
      await expect(
        treasury.connect(owner).updateX402Facilitator(hre.ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(treasury, "InvalidAddress");
    });

    it("Should allow emergency withdrawal", async function () {
      const initialBalance = await usdc.balanceOf(owner.address);
      const withdrawAmount = THOUSAND_USDC;
      
      await expect(
        treasury.connect(owner).emergencyWithdraw(
          await usdc.getAddress(),
          withdrawAmount
        )
      ).to.emit(treasury, "EmergencyWithdraw")
        .withArgs(await usdc.getAddress(), withdrawAmount);
      
      const finalBalance = await usdc.balanceOf(owner.address);
      expect(finalBalance - initialBalance).to.equal(withdrawAmount);
    });

    it("Should withdraw payment tokens", async function () {
      const initialBalance = await usdc.balanceOf(owner.address);
      const withdrawAmount = THOUSAND_USDC;
      
      await treasury.connect(owner).withdrawPaymentToken(withdrawAmount);
      
      const finalBalance = await usdc.balanceOf(owner.address);
      expect(finalBalance - initialBalance).to.equal(withdrawAmount);
    });

    it("Should reject non-owner admin actions", async function () {
      await expect(
        treasury.connect(stranger).updateRevenueThreshold(ONE_USDC)
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
      
      await expect(
        treasury.connect(stranger).updateX402Facilitator(payee1.address)
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
      
      await expect(
        treasury.connect(stranger).emergencyWithdraw(await usdc.getAddress(), ONE_USDC)
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should efficiently add multiple payees in batch", async function () {
      const payees = Array(10).fill(0).map((_, i) => 
        hre.ethers.Wallet.createRandom().address
      );
      const salaries = Array(10).fill(THOUSAND_USDC);
      
      const tx = await treasury.connect(owner).addPayees(payees, salaries);
      const receipt = await tx.wait();
      
      console.log(`    ⛽ Gas used for 10 payees: ${receipt?.gasUsed.toString()}`);
      
      expect(await treasury.getActivePayeeCount()).to.equal(10);
    });

    it("Should efficiently create multiple payment requests", async function () {
      const payees = Array(5).fill(0).map((_, i) => 
        hre.ethers.Wallet.createRandom().address
      );
      const salaries = Array(5).fill(THOUSAND_USDC);
      
      await treasury.connect(owner).addPayees(payees, salaries);
      await time.increase(THIRTY_DAYS);
      
      const tx = await treasury.connect(owner).createPaymentRequests();
      const receipt = await tx.wait();
      
      console.log(`    ⛽ Gas used for 5 payments: ${receipt?.gasUsed.toString()}`);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle payee with zero accrued", async function () {
      await treasury.connect(owner).addPayee(payee1.address, THOUSAND_USDC);
      
      const [, , , accrued] = await treasury.getActivePayees();
      expect(accrued[0]).to.equal(0);
    });

    it("Should handle multiple payment cycles", async function () {
      await treasury.connect(owner).addPayee(payee1.address, THOUSAND_USDC);
      
      // First payment
      await time.increase(THIRTY_DAYS);
      await treasury.connect(owner).createPaymentRequests();
      
      // Second payment
      await time.increase(THIRTY_DAYS);
      await treasury.connect(owner).createPaymentRequests();
      
      const totalAccrued = await treasury.getTotalAccrued();
      expect(totalAccrued).to.equal(THOUSAND_USDC * 2n);
    });

    it("Should receive native currency", async function () {
      const amount = hre.ethers.parseEther("1");
      
      await expect(
        owner.sendTransaction({
          to: await treasury.getAddress(),
          value: amount
        })
      ).to.not.be.reverted;
    });
  });
});