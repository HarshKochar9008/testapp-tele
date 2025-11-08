// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * Interfaces kept minimal & generic.
 * - IEonXCBP: lite registry (isRegistered + onPurchase event hook).
 */
interface IEonXCBP {
    function isRegistered(address user) external view returns (bool);
    function onPurchase(address buyer, uint256 usdt6, uint256 tokens18) external;
    function register(address referrer) external;
    function getUser(address user) external view returns (address referrer, address[] memory directs, uint64 joinedAtIndex);
    function getTopId() external view returns (address);
}

contract EonXSale is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---- Constants ----
    uint256 private constant USD6  = 1e6;   // USDT decimals
    uint256 private constant TKN18 = 1e18;  // ERC20 18-decimals

    // ---- Immutable dependencies ----
    IERC20    public immutable USDT;   // 6 decimals
    IERC20    public immutable EONX;   // 18 decimals (pre-funded to this contract)
    IEonXCBP  public immutable CBP;    // registry + off-chain signal

    // ---- Treasury sink (funds are forwarded here) ----
    address public treasury;

    // ---- Sale gates & counters ----
    bool    public saleActive = true;
    uint256 public buyerCount;                 // increments per unique buyer
    mapping(address => uint256) public buyerId;      // 1-based index assigned at first purchase
    mapping(address => bool)    public hasPurchased; // one-time purchase guard

    // ---- Step pricing config ----
    struct Step { uint256 upToSold18; uint256 price6; } // cumulative sold cap & price (USDT, 6d)
    Step[]  public steps;
    uint256 public totalSold18;                         // running total of tokens sold

    // ---- Events ----
    event Purchased(
        address indexed buyer,
        uint256 usdtUsed6,
        uint256 tokensOut18,
        uint256 totalSold18After
    );
    event TreasuryChanged(address indexed newTreasury);
    event SaleActiveSet(bool active);

    // ---- Errors ----
    error SaleInactive();
    error AlreadyPurchased();
    error NotRegistered();
    error ReferrerNotRegistered();
    error OverCap();
    error NoRoom();
    error BadTreasury();
    error InsufficientAllowance();
    error InsufficientBalance();

    constructor(
        IERC20 usdt_,
        IERC20 eonx_,
        IEonXCBP cbp_,
        address treasury_
    ) Ownable(msg.sender) {
        require(address(usdt_) != address(0) && address(eonx_) != address(0) && address(cbp_) != address(0), "zero addr");
        require(treasury_ != address(0), "treasury=0");

        USDT     = usdt_;
        EONX     = eonx_;
        CBP      = cbp_;
        treasury = treasury_;

        // Step ladder (cumulative sold caps, ascending; prices non-decreasing)
        // upToSold18 values are "total sold token" checkpoints; price6 is USDT (6 decimals) per 1 token (18 decimals).
        steps.push(Step( 10_000_000 * TKN18, 1_000_000)); // first 10M @ $1.00
        steps.push(Step( 40_000_000 * TKN18, 1_500_000)); // next 30M @ $1.50
        steps.push(Step( 70_000_000 * TKN18, 2_000_000)); // next 30M @ $2.00
        steps.push(Step(100_000_000 * TKN18, 3_000_000)); // next 30M @ $3.00
        steps.push(Step(200_000_000 * TKN18, 5_000_000)); // next 100M @ $5.00

        for (uint256 i = 1; i < steps.length; i++) {
            require(steps[i].upToSold18 > steps[i-1].upToSold18, "steps not ascending");
            require(steps[i].price6 >= steps[i-1].price6, "price must be nondecreasing");
        }
    }

    // ---------------- Admin ----------------

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert BadTreasury();
        treasury = newTreasury;
        emit TreasuryChanged(newTreasury);
    }

    function setSaleActive(bool active) external onlyOwner {
        saleActive = active;
        emit SaleActiveSet(active);
    }

    function stepsLength() external view returns (uint256) {
        return steps.length;
    }

    // ---------------- Buy (one-time) ----------------

    /**
     * @notice One-time purchase per address.
     *         Cap is determined by the buyer's join order (buyerId).
     *         User must already be registered in CBP.
     *         Sends 100% USDT to treasury; transfers pre-funded EONX to buyer.
     */
    function buy(address referrer) external nonReentrant {
        if(referrer == address(0)) referrer = CBP.getTopId();
        if (!saleActive) revert SaleInactive();
        if (hasPurchased[msg.sender]) revert AlreadyPurchased();

        if (!CBP.isRegistered(referrer)) revert ReferrerNotRegistered();
        if (!CBP.isRegistered(msg.sender)) CBP.register(referrer);  // register if not already registered

        // Assign sequential buyerId (1-based) and compute this buyer's cap
        buyerCount += 1;
        buyerId[msg.sender] = buyerCount;

        uint256 capRemain6 = _capFor(buyerCount);
        if (capRemain6 == 0) revert OverCap();

        // Price across steps using the entire cap
        (uint256 tokensOut18, uint256 used6) = _quoteAcrossSteps(capRemain6);
        if (tokensOut18 == 0 || used6 == 0) revert NoRoom();

        // Check allowance/balance first
        uint256 allowance = USDT.allowance(msg.sender, address(this));
        if (allowance < used6) revert InsufficientAllowance();

        uint256 bal = USDT.balanceOf(msg.sender);
        if (bal < used6) revert InsufficientBalance();

        // Mark as purchased before external transfers
        hasPurchased[msg.sender] = true;

        // Pull USDT to treasury, deliver EONX from this contract
        USDT.safeTransferFrom(msg.sender, treasury, used6);

        uint256 stock = EONX.balanceOf(address(this));
        require(stock >= tokensOut18, "insufficient EONX in sale");
        EONX.safeTransfer(msg.sender, tokensOut18);

        // Notify CBP for off-chain listeners/analytics
        CBP.onPurchase(msg.sender, used6, tokensOut18);

        emit Purchased(msg.sender, used6, tokensOut18, totalSold18);
    }

    // ---------------- Internals ----------------

    /**
     * @dev Buyer cap schedule based on registration order (mirrors your previous logic).
     *      1..10,000: $100; 10,001..20,000: $60; 20,001..30,000: $50; thereafter: $30.
     */
    function _capFor(uint256 id) internal pure returns (uint256) {
        if (id == 0) return 0;
        if (id <= 10_000) return 100 * USD6;
        if (id <= 20_000) return  60 * USD6;
        if (id <= 30_000) return  50 * USD6;
        return 30 * USD6;
    }

    /**
     * @dev Returns the current step index given totalSold18.
     */
    function _stepIndexFor(uint256 sold18) internal view returns (uint256 idx) {
        uint256 len = steps.length;
        for (uint256 i = 0; i < len; i++) {
            if (sold18 < steps[i].upToSold18) return i;
        }
        return len; // past last step
    }

    /**
     * @dev Consume up to `usdtIn6` across steps; mutates `totalSold18`.
     *      Returns (tokensOut18, usdtUsed6).
     */
    function _quoteAcrossSteps(uint256 usdtIn6)
        internal
        returns (uint256 tokensOut18, uint256 usedTotal6)
    {
        uint256 usdtLeft6 = usdtIn6;
        uint256 i = _stepIndexFor(totalSold18);
        uint256 len = steps.length;

        while (usdtLeft6 > 0 && i < len) {
            Step memory s = steps[i];
            uint256 room18 = s.upToSold18 - totalSold18;
            if (room18 == 0) { unchecked { i++; } continue; }

            // tokens that this USDT can afford at this step price
            uint256 afford18 = (usdtLeft6 * TKN18) / s.price6;
            if (afford18 == 0) break;

            uint256 take18 = afford18 <= room18 ? afford18 : room18;
            uint256 used6  = (take18 * s.price6) / TKN18;
            if (used6 == 0) break;

            tokensOut18 += take18;
            usedTotal6  += used6;
            totalSold18 += take18;
            usdtLeft6   -= used6;

            if (take18 == room18) { unchecked { i++; } }
        }
    }
}
