// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Sherwood} from "../contracts/Sherwood.sol";
import {Arrow} from "../contracts/Arrow.sol";

/**
 * Validates the Uniswap-V2 path for Arrows against the REAL Uniswap deployment
 * on a Robinhood Chain **mainnet fork** — the same contracts/addresses the
 * frontend will use in production. Proves: a repo's Arrow can be pooled with
 * ETH (addLiquidityETH), bought (swapExactETHForTokens) and sold
 * (swapExactTokensForETH) through Uniswap, with no custom AMM.
 *
 * Run: forge test --match-path test/UniswapIntegration.t.sol -vv
 * (Needs network access — it forks https://rpc.mainnet.chain.robinhood.com.)
 */
interface IUniV2Router {
    function WETH() external view returns (address);
    function factory() external view returns (address);
    function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline)
        external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);
    function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline)
        external payable returns (uint256[] memory amounts);
    function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline)
        external returns (uint256[] memory amounts);
    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);
}

interface IUniV2Factory {
    function getPair(address a, address b) external view returns (address pair);
}

contract UniswapIntegrationTest is Test {
    // Robinhood Chain MAINNET (4663) Uniswap V2 — verified on-chain.
    IUniV2Router constant ROUTER = IUniV2Router(0x89e5DB8B5aA49aA85AC63f691524311AEB649eba);
    IUniV2Factory constant FACTORY = IUniV2Factory(0x8bcEaA40B9AcdfAedF85AdF4FF01F5Ad6517937f);
    address constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;

    Sherwood sherwood;
    Arrow arrow;
    address owner = makeAddr("owner");
    address buyer = makeAddr("buyer");

    function setUp() public {
        vm.createSelectFork("https://rpc.mainnet.chain.robinhood.com");
        sherwood = new Sherwood();
        vm.prank(owner);
        arrow = Arrow(sherwood.registerRepo("octocat/hello-world", "C", "Hello Arrow", "HELLO", 1_000_000 ether));
        vm.deal(owner, 100 ether);
        vm.deal(buyer, 100 ether);
    }

    function test_UniswapIsWired() public view {
        assertEq(ROUTER.WETH(), WETH, "router WETH");
        assertEq(ROUTER.factory(), address(FACTORY), "router factory");
    }

    function test_Seed_Buy_Sell_throughUniswap() public {
        // 1) owner seeds a pool: 10 ETH + 500k HELLO
        vm.startPrank(owner);
        arrow.approve(address(ROUTER), type(uint256).max);
        ROUTER.addLiquidityETH{value: 10 ether}(address(arrow), 500_000 ether, 0, 0, owner, block.timestamp + 600);
        vm.stopPrank();

        address pair = FACTORY.getPair(address(arrow), WETH);
        assertTrue(pair != address(0), "pair created");
        assertGt(arrow.balanceOf(pair), 0, "pair holds Arrows");

        // 2) buyer buys HELLO with 1 ETH — result matches the quote
        address[] memory buyPath = new address[](2);
        buyPath[0] = WETH;
        buyPath[1] = address(arrow);
        uint256 quoted = ROUTER.getAmountsOut(1 ether, buyPath)[1];

        vm.prank(buyer);
        ROUTER.swapExactETHForTokens{value: 1 ether}(0, buyPath, buyer, block.timestamp + 600);
        uint256 got = arrow.balanceOf(buyer);
        assertGt(got, 0, "bought Arrows");
        assertApproxEqRel(got, quoted, 0.01e18, "buy ~ quote");

        // 3) buyer sells them all back for ETH
        address[] memory sellPath = new address[](2);
        sellPath[0] = address(arrow);
        sellPath[1] = WETH;
        uint256 ethBefore = buyer.balance;
        vm.startPrank(buyer);
        arrow.approve(address(ROUTER), type(uint256).max);
        ROUTER.swapExactTokensForETH(got, 0, sellPath, buyer, block.timestamp + 600);
        vm.stopPrank();
        assertGt(buyer.balance, ethBefore, "received ETH from sell");
        assertEq(arrow.balanceOf(buyer), 0, "sold all Arrows");
    }

    receive() external payable {}
}
