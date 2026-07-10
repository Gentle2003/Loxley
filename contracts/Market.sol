// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Market
 * @notice A minimal per-Arrow constant-product (x*y=k) AMM. Each repo's Arrow
 *         gets a pool paired with ETH; anyone can buy Arrows with ETH or sell
 *         Arrows for ETH, with price emerging from the reserves. This is a
 *         SECONDARY market — it only trades Arrows that already exist (minted by
 *         Sherwood via registerRepo). It never mints new Arrows.
 *
 *         Liquidity providers seed a pool with ETH + Arrows and receive shares;
 *         a 0.30% fee on each trade accrues to the pool (to LPs).
 *
 * @dev    PROTOTYPE. Not audited. Testnet only. A tradeable, cashflow-bearing
 *         token is almost certainly a security — see CLAUDE.md guardrails. Do
 *         not deploy to mainnet or use real value without an audit + legal review.
 */
contract Market is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant FEE_BPS = 30; // 0.30% trading fee
    uint256 private constant BPS = 10_000;
    uint256 private constant MINIMUM_LIQUIDITY = 1000; // locked on first seed (prevents share inflation)

    struct Pool {
        uint256 ethReserve;
        uint256 arrowReserve;
        uint256 totalShares;
        bool exists;
    }

    mapping(address => Pool) private pools;                       // arrow => pool
    mapping(address => mapping(address => uint256)) public shares; // arrow => provider => LP shares

    event PoolCreated(address indexed arrow, address indexed creator, uint256 ethIn, uint256 arrowIn, uint256 shares);
    event LiquidityAdded(address indexed arrow, address indexed provider, uint256 ethIn, uint256 arrowIn, uint256 shares);
    event LiquidityRemoved(address indexed arrow, address indexed provider, uint256 ethOut, uint256 arrowOut, uint256 shares);
    event Bought(address indexed arrow, address indexed buyer, uint256 ethIn, uint256 arrowOut);
    event Sold(address indexed arrow, address indexed seller, uint256 arrowIn, uint256 ethOut);

    // --------------------------------------------------------------------- //
    //                             liquidity                                 //
    // --------------------------------------------------------------------- //

    /// @notice Seed a new pool for `arrow` with `msg.value` ETH + `arrowIn` Arrows.
    function createPool(address arrow, uint256 arrowIn) external payable nonReentrant returns (uint256 minted) {
        Pool storage p = pools[arrow];
        require(!p.exists, "Pool exists");
        require(msg.value > 0 && arrowIn > 0, "Zero amounts");

        IERC20(arrow).safeTransferFrom(msg.sender, address(this), arrowIn);

        uint256 liq = _sqrt(msg.value * arrowIn);
        require(liq > MINIMUM_LIQUIDITY, "Insufficient liquidity");
        minted = liq - MINIMUM_LIQUIDITY;

        p.ethReserve = msg.value;
        p.arrowReserve = arrowIn;
        p.totalShares = liq;                 // MINIMUM_LIQUIDITY stays locked (no owner)
        p.exists = true;
        shares[arrow][msg.sender] = minted;

        emit PoolCreated(arrow, msg.sender, msg.value, arrowIn, minted);
    }

    /// @notice Add liquidity proportional to current reserves.
    function addLiquidity(address arrow, uint256 arrowInMax, uint256 minShares)
        external payable nonReentrant returns (uint256 minted)
    {
        Pool storage p = pools[arrow];
        require(p.exists, "No pool");
        require(msg.value > 0, "Zero ETH");

        uint256 arrowIn = (msg.value * p.arrowReserve) / p.ethReserve;
        require(arrowIn > 0 && arrowIn <= arrowInMax, "Slippage: arrows");

        minted = (msg.value * p.totalShares) / p.ethReserve;
        require(minted >= minShares && minted > 0, "Slippage: shares");

        IERC20(arrow).safeTransferFrom(msg.sender, address(this), arrowIn);
        p.ethReserve += msg.value;
        p.arrowReserve += arrowIn;
        p.totalShares += minted;
        shares[arrow][msg.sender] += minted;

        emit LiquidityAdded(arrow, msg.sender, msg.value, arrowIn, minted);
    }

    /// @notice Burn `sharesToBurn` LP shares and withdraw the proportional ETH + Arrows.
    function removeLiquidity(address arrow, uint256 sharesToBurn, uint256 minEthOut, uint256 minArrowOut)
        external nonReentrant returns (uint256 ethOut, uint256 arrowOut)
    {
        Pool storage p = pools[arrow];
        require(p.exists, "No pool");
        require(sharesToBurn > 0 && shares[arrow][msg.sender] >= sharesToBurn, "Bad shares");

        ethOut = (sharesToBurn * p.ethReserve) / p.totalShares;
        arrowOut = (sharesToBurn * p.arrowReserve) / p.totalShares;
        require(ethOut >= minEthOut && arrowOut >= minArrowOut, "Slippage");
        require(ethOut > 0 && arrowOut > 0, "Zero out");

        shares[arrow][msg.sender] -= sharesToBurn;
        p.totalShares -= sharesToBurn;
        p.ethReserve -= ethOut;
        p.arrowReserve -= arrowOut;

        IERC20(arrow).safeTransfer(msg.sender, arrowOut);
        _sendETH(msg.sender, ethOut);

        emit LiquidityRemoved(arrow, msg.sender, ethOut, arrowOut, sharesToBurn);
    }

    // --------------------------------------------------------------------- //
    //                               swaps                                   //
    // --------------------------------------------------------------------- //

    /// @notice Buy Arrows with ETH. Reverts if you'd receive fewer than `minArrowOut`.
    function buy(address arrow, uint256 minArrowOut) external payable nonReentrant returns (uint256 arrowOut) {
        Pool storage p = pools[arrow];
        require(p.exists, "No pool");
        require(msg.value > 0, "Zero ETH");

        arrowOut = _amountOut(msg.value, p.ethReserve, p.arrowReserve);
        require(arrowOut >= minArrowOut, "Slippage");
        require(arrowOut < p.arrowReserve, "Insufficient liquidity");

        p.ethReserve += msg.value;
        p.arrowReserve -= arrowOut;
        IERC20(arrow).safeTransfer(msg.sender, arrowOut);

        emit Bought(arrow, msg.sender, msg.value, arrowOut);
    }

    /// @notice Sell `arrowIn` Arrows for ETH. Reverts if you'd receive less than `minEthOut`.
    function sell(address arrow, uint256 arrowIn, uint256 minEthOut) external nonReentrant returns (uint256 ethOut) {
        Pool storage p = pools[arrow];
        require(p.exists, "No pool");
        require(arrowIn > 0, "Zero arrows");

        IERC20(arrow).safeTransferFrom(msg.sender, address(this), arrowIn);
        ethOut = _amountOut(arrowIn, p.arrowReserve, p.ethReserve);
        require(ethOut >= minEthOut, "Slippage");
        require(ethOut < p.ethReserve, "Insufficient liquidity");

        p.arrowReserve += arrowIn;
        p.ethReserve -= ethOut;
        _sendETH(msg.sender, ethOut);

        emit Sold(arrow, msg.sender, arrowIn, ethOut);
    }

    // --------------------------------------------------------------------- //
    //                               views                                   //
    // --------------------------------------------------------------------- //

    function getPool(address arrow)
        external view returns (uint256 ethReserve, uint256 arrowReserve, uint256 totalShares, bool exists)
    {
        Pool storage p = pools[arrow];
        return (p.ethReserve, p.arrowReserve, p.totalShares, p.exists);
    }

    /// @notice Arrows you'd get for `ethIn` (after fee), at current reserves.
    function quoteBuy(address arrow, uint256 ethIn) external view returns (uint256) {
        Pool storage p = pools[arrow];
        if (!p.exists || ethIn == 0) return 0;
        return _amountOut(ethIn, p.ethReserve, p.arrowReserve);
    }

    /// @notice ETH you'd get for `arrowIn` (after fee), at current reserves.
    function quoteSell(address arrow, uint256 arrowIn) external view returns (uint256) {
        Pool storage p = pools[arrow];
        if (!p.exists || arrowIn == 0) return 0;
        return _amountOut(arrowIn, p.arrowReserve, p.ethReserve);
    }

    /// @notice Spot price: wei of ETH per 1 whole Arrow (1e18), or 0 if no pool.
    function pricePerArrow(address arrow) external view returns (uint256) {
        Pool storage p = pools[arrow];
        if (!p.exists || p.arrowReserve == 0) return 0;
        return (p.ethReserve * 1e18) / p.arrowReserve;
    }

    // --------------------------------------------------------------------- //
    //                              internal                                 //
    // --------------------------------------------------------------------- //

    /// @dev Constant-product output with the trading fee applied to the input.
    function _amountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        internal pure returns (uint256)
    {
        uint256 amountInWithFee = amountIn * (BPS - FEE_BPS);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * BPS + amountInWithFee;
        return numerator / denominator;
    }

    function _sendETH(address to, uint256 amount) private {
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "ETH transfer failed");
    }

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
