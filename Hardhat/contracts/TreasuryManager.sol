// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title TreasuryManager
 * @author DynamixPay Team
 * @notice Gas-optimized treasury with x402 payment support
 * @dev Manages payroll, revenue thresholds, and automated payments
 */
contract TreasuryManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;
    
    // ==================== CUSTOM TYPES ====================
    
    struct Payee {
        uint128 salary; // Monthly salary in token decimals
        uint64 lastPayment; // Timestamp of last payment
        uint64 accrued; // Unpaid amount (scaled down for storage)
        bool active; // Active status
    }
    
    struct PaymentRequest {
        address payee;
        uint128 amount;
        uint64 timestamp;
        bytes32 x402Id;
        bool settled;
    }
    
    // ==================== STATE VARIABLES ====================
    
    /// @notice Payment token (USDC)
    IERC20 public immutable paymentToken;
    
    /// @notice x402 facilitator address
    address public x402Facilitator;
    
    /// @notice Revenue threshold for payroll trigger
    uint128 public revenueThreshold;
    
    /// @notice Last revenue check timestamp
    uint64 public lastRevenueCheck;
    
    /// @notice Total monthly outflow
    uint128 public totalMonthlyOutflow;
    
    /// @dev Active payees set
    EnumerableSet.AddressSet private _activePayees;
    
    /// @dev Payee details mapping
    mapping(address => Payee) private _payees;
    
    /// @dev Payment requests array
    PaymentRequest[] private _paymentRequests;
    
    /// @dev x402 ID to request ID mapping
    mapping(bytes32 => uint256) private _x402ToRequestId;
    
    // ==================== CONSTANTS ====================
    
    uint256 private constant PAYMENT_INTERVAL = 30 days;
    uint256 private constant MIN_REVENUE_CHECK_INTERVAL = 1 days;
    
    // ==================== EVENTS ====================
    
    event PayeeAdded(address indexed payee, uint256 salary);
    event PayeeUpdated(address indexed payee, uint256 newSalary);
    event PayeeDeactivated(address indexed payee);
    event RevenueThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event PayrollTriggered(uint256 timestamp, uint256 totalAmount, uint256 payeeCount);
    event PaymentRequestCreated(
        uint256 indexed requestId,
        address indexed payee,
        uint256 amount,
        bytes32 x402PaymentId
    );
    event PaymentSettled(uint256 indexed requestId, bytes32 txHash);
    event EmergencyWithdraw(address indexed token, uint256 amount);
    event X402FacilitatorUpdated(address indexed oldFacilitator, address indexed newFacilitator);
    
    // ==================== ERRORS ====================
    
    error InvalidAddress();
    error ZeroAmount();
    error PayeeAlreadyExists();
    error PayeeNotFound();
    error InsufficientBalance();
    error NotTimeForPayment();
    error OnlyX402Facilitator();
    error PaymentAlreadySettled();
    error ArrayLengthMismatch();
    error InvalidRequestId();
    
    // ==================== MODIFIERS ====================
    
    modifier onlyX402Facilitator() {
        if (msg.sender != x402Facilitator) revert OnlyX402Facilitator();
        _;
    }
    
    // ==================== CONSTRUCTOR ====================
    
    constructor(
        address _paymentToken,
        address _x402Facilitator
    ) Ownable(msg.sender) {
        if (_paymentToken == address(0) || _x402Facilitator == address(0)) {
            revert InvalidAddress();
        }
        
        paymentToken = IERC20(_paymentToken);
        x402Facilitator = _x402Facilitator;
        revenueThreshold = 10_000 * 10**6; // 10,000 USDC
        lastRevenueCheck = uint64(block.timestamp);
    }
    
    // ==================== EXTERNAL FUNCTIONS ====================
    
    /**
     * @notice Add new payee
     * @param payee Payee address
     * @param salary Monthly salary
     */
    function addPayee(address payee, uint256 salary) external onlyOwner {
        if (payee == address(0)) revert InvalidAddress();
        if (salary == 0) revert ZeroAmount();
        if (_activePayees.contains(payee)) revert PayeeAlreadyExists();
        if (salary > type(uint128).max) revert ZeroAmount();
        
        _payees[payee] = Payee({
            salary: uint128(salary),
            lastPayment: 0,
            accrued: 0,
            active: true
        });
        
        _activePayees.add(payee);
        totalMonthlyOutflow += uint128(salary);
        
        emit PayeeAdded(payee, salary);
    }
    
    /**
     * @notice Batch add payees (gas efficient)
     * @param payees Array of payee addresses
     * @param salaries Array of salaries
     */
    function addPayees(
        address[] calldata payees,
        uint256[] calldata salaries
    ) external onlyOwner {
        uint256 length = payees.length;
        if (length != salaries.length) revert ArrayLengthMismatch();
        
        for (uint256 i; i < length;) {
            address payee = payees[i];
            uint256 salary = salaries[i];
            
            if (payee != address(0) && salary > 0 && !_activePayees.contains(payee)) {
                _payees[payee] = Payee({
                    salary: uint128(salary),
                    lastPayment: 0,
                    accrued: 0,
                    active: true
                });
                
                _activePayees.add(payee);
                totalMonthlyOutflow += uint128(salary);
                
                emit PayeeAdded(payee, salary);
            }
            
            unchecked { ++i; }
        }
    }
    
    /**
     * @notice Update payee salary
     * @param payee Payee address
     * @param newSalary New monthly salary
     */
    function updatePayeeSalary(address payee, uint256 newSalary) external onlyOwner {
        if (!_activePayees.contains(payee)) revert PayeeNotFound();
        if (newSalary == 0) revert ZeroAmount();
        if (newSalary > type(uint128).max) revert ZeroAmount();
        
        Payee storage p = _payees[payee];
        totalMonthlyOutflow = totalMonthlyOutflow - p.salary + uint128(newSalary);
        p.salary = uint128(newSalary);
        
        emit PayeeUpdated(payee, newSalary);
    }
    
    /**
     * @notice Deactivate payee
     * @param payee Address to deactivate
     */
    function deactivatePayee(address payee) external onlyOwner {
        if (!_activePayees.contains(payee)) revert PayeeNotFound();
        
        Payee storage p = _payees[payee];
        p.active = false;
        totalMonthlyOutflow -= p.salary;
        _activePayees.remove(payee);
        
        emit PayeeDeactivated(payee);
    }
    
    /**
     * @notice Check if payroll should trigger
     * @param currentRevenue Current revenue amount
     * @return shouldTrigger True if conditions met
     */
    function shouldTriggerPayroll(uint256 currentRevenue) external view returns (bool) {
        return currentRevenue >= revenueThreshold && 
               block.timestamp >= lastRevenueCheck + MIN_REVENUE_CHECK_INTERVAL;
    }
    
    /**
     * @notice Create payment requests for due payees
     * @return requestIds Array of created request IDs
     * @return totalAmount Total payment amount
     */
    function createPaymentRequests() 
        external 
        onlyOwner 
        nonReentrant
        returns (uint256[] memory requestIds, uint256 totalAmount) 
    {
        uint256 payeeCount = _activePayees.length();
        if (payeeCount == 0) return (new uint256[](0), 0);
        
        uint256 balance = paymentToken.balanceOf(address(this));
        if (balance < totalMonthlyOutflow) revert InsufficientBalance();
        
        uint256[] memory tempIds = new uint256[](payeeCount);
        uint256 actualCount;
        uint256 currentTime = block.timestamp;
        
        for (uint256 i; i < payeeCount;) {
            address payeeAddr = _activePayees.at(i);
            Payee storage payee = _payees[payeeAddr];
            
            if (payee.active && currentTime >= payee.lastPayment + PAYMENT_INTERVAL) {
                uint256 requestId = _paymentRequests.length;
                
                _paymentRequests.push(PaymentRequest({
                    payee: payeeAddr,
                    amount: payee.salary,
                    timestamp: uint64(currentTime),
                    x402Id: bytes32(0),
                    settled: false
                }));
                
                payee.lastPayment = uint64(currentTime);
                payee.accrued += uint64(payee.salary / 1e6); // Scale down for storage
                
                tempIds[actualCount] = requestId;
                totalAmount += payee.salary;
                actualCount++;
                
                emit PaymentRequestCreated(requestId, payeeAddr, payee.salary, bytes32(0));
            }
            
            unchecked { ++i; }
        }
        
        if (totalAmount > 0) {
            lastRevenueCheck = uint64(currentTime);
            emit PayrollTriggered(currentTime, totalAmount, actualCount);
        }
        
        // Resize array to actual count
        requestIds = new uint256[](actualCount);
        for (uint256 i; i < actualCount;) {
            requestIds[i] = tempIds[i];
            unchecked { ++i; }
        }
        
        return (requestIds, totalAmount);
    }
    
    /**
     * @notice Mark payment as settled by x402
     * @param requestId Payment request ID
     * @param x402PaymentId x402 identifier
     * @param txHash Transaction hash
     */
    function markPaymentSettled(
        uint256 requestId,
        bytes32 x402PaymentId,
        bytes32 txHash
    ) external onlyX402Facilitator {
        if (requestId >= _paymentRequests.length) revert InvalidRequestId();
        
        PaymentRequest storage request = _paymentRequests[requestId];
        if (request.settled) revert PaymentAlreadySettled();
        
        request.settled = true;
        request.x402Id = x402PaymentId;
        _x402ToRequestId[x402PaymentId] = requestId;
        
        Payee storage payee = _payees[request.payee];
        uint64 scaledAmount = uint64(request.amount / 1e6);
        if (payee.accrued >= scaledAmount) {
            payee.accrued -= scaledAmount;
        }
        
        emit PaymentSettled(requestId, txHash);
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @notice Get active payees with details
     */
    function getActivePayees() external view returns (
        address[] memory addresses,
        uint256[] memory salaries,
        uint256[] memory lastPayments,
        uint256[] memory accrued
    ) {
        uint256 count = _activePayees.length();
        addresses = new address[](count);
        salaries = new uint256[](count);
        lastPayments = new uint256[](count);
        accrued = new uint256[](count);
        
        for (uint256 i; i < count;) {
            address addr = _activePayees.at(i);
            Payee memory payee = _payees[addr];
            
            addresses[i] = addr;
            salaries[i] = payee.salary;
            lastPayments[i] = payee.lastPayment;
            accrued[i] = uint256(payee.accrued) * 1e6; // Scale back up
            
            unchecked { ++i; }
        }
    }
    
    /**
     * @notice Get active payee count
     */
    function getActivePayeeCount() external view returns (uint256) {
        return _activePayees.length();
    }
    
    /**
     * @notice Get treasury balance
     */
    function getTreasuryBalance() external view returns (uint256) {
        return paymentToken.balanceOf(address(this));
    }
    
    /**
     * @notice Get payment request details
     */
    function getPaymentRequest(uint256 requestId) external view returns (
        address payee,
        uint256 amount,
        uint256 timestamp,
        bytes32 x402Id,
        bool settled
    ) {
        if (requestId >= _paymentRequests.length) revert InvalidRequestId();
        
        PaymentRequest memory request = _paymentRequests[requestId];
        return (
            request.payee,
            request.amount,
            request.timestamp,
            request.x402Id,
            request.settled
        );
    }
    
    /**
     * @notice Get total unpaid accrued amount
     */
    function getTotalAccrued() external view returns (uint256 total) {
        uint256 count = _activePayees.length();
        
        for (uint256 i; i < count;) {
            address addr = _activePayees.at(i);
            total += uint256(_payees[addr].accrued) * 1e6;
            unchecked { ++i; }
        }
    }
    
    /**
     * @notice Get payee details
     */
    function getPayee(address payee) external view returns (
        uint256 salary,
        uint256 lastPayment,
        uint256 accrued,
        bool active
    ) {
        Payee memory p = _payees[payee];
        return (
            p.salary,
            p.lastPayment,
            uint256(p.accrued) * 1e6,
            p.active
        );
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    /**
     * @notice Update revenue threshold
     */
    function updateRevenueThreshold(uint256 newThreshold) external onlyOwner {
        if (newThreshold > type(uint128).max) revert ZeroAmount();
        
        uint256 oldThreshold = revenueThreshold;
        revenueThreshold = uint128(newThreshold);
        
        emit RevenueThresholdUpdated(oldThreshold, newThreshold);
    }
    
    /**
     * @notice Update x402 facilitator
     */
    function updateX402Facilitator(address newFacilitator) external onlyOwner {
        if (newFacilitator == address(0)) revert InvalidAddress();
        
        address oldFacilitator = x402Facilitator;
        x402Facilitator = newFacilitator;
        
        emit X402FacilitatorUpdated(oldFacilitator, newFacilitator);
    }
    
    /**
     * @notice Emergency token withdrawal
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
        emit EmergencyWithdraw(token, amount);
    }
    
    /**
     * @notice Withdraw payment tokens
     */
    function withdrawPaymentToken(uint256 amount) external onlyOwner {
        paymentToken.safeTransfer(owner(), amount);
    }
    
    // ==================== RECEIVE FUNCTION ====================
    
    receive() external payable {}
}