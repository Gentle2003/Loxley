// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Sherwood} from "../contracts/Sherwood.sol";
import {Arrow} from "../contracts/Arrow.sol";
import {Market} from "../contracts/Market.sol";

contract MarketTest is Test {
    Sherwood sherwood;
    Market market;
    Arrow arrow;
    address owner = makeAddr("owner");
    address buyer = makeAddr("buyer");

    function setUp() public {
        sherwood = new Sherwood();
        market = new Market();
        vm.prank(owner);
        arrow = Arrow(sherwood.registerRepo("octocat/hello-world", "C", "Hello Arrow", "HELLO", 1_000_000 ether));
        vm.deal(address(this), 1_000 ether);
        vm.deal(owner, 1_000 ether);
        vm.deal(buyer, 1_000 ether);
    }

    function _seed(uint256 ethAmt, uint256 arrowAmt) internal {
        vm.prank(owner);
        arrow.approve(address(market), arrowAmt);
        vm.prank(owner);
        market.createPool{value: ethAmt}(address(arrow), arrowAmt);
    }

    function test_CreatePool_setsReservesAndPrice() public {
        _seed(10 ether, 500_000 ether);
        (uint256 e, uint256 a, uint256 ts, bool ex) = market.getPool(address(arrow));
        assertEq(e, 10 ether);
        assertEq(a, 500_000 ether);
        assertTrue(ex);
        assertGt(ts, 0);
        assertGt(market.shares(address(arrow), owner), 0);
        // spot price = ethReserve * 1e18 / arrowReserve
        assertEq(market.pricePerArrow(address(arrow)), (10 ether * 1e18) / 500_000 ether);
    }

    function test_CreatePool_twiceReverts() public {
        _seed(10 ether, 500_000 ether);
        vm.prank(owner);
        arrow.approve(address(market), 1 ether);
        vm.prank(owner);
        vm.expectRevert("Pool exists");
        market.createPool{value: 1 ether}(address(arrow), 1 ether);
    }

    function test_Buy_deliversQuotedArrowsAndRaisesPrice() public {
        _seed(10 ether, 500_000 ether);
        uint256 priceBefore = market.pricePerArrow(address(arrow));
        uint256 quoted = market.quoteBuy(address(arrow), 1 ether);
        assertGt(quoted, 0);

        vm.prank(buyer);
        uint256 got = market.buy{value: 1 ether}(address(arrow), quoted);

        assertEq(got, quoted);
        assertEq(arrow.balanceOf(buyer), got);
        assertGt(market.pricePerArrow(address(arrow)), priceBefore); // price up after a buy
    }

    function test_Buy_slippageGuardReverts() public {
        _seed(10 ether, 500_000 ether);
        uint256 quoted = market.quoteBuy(address(arrow), 1 ether);
        vm.prank(buyer);
        vm.expectRevert("Slippage");
        market.buy{value: 1 ether}(address(arrow), quoted + 1); // demand more than possible
    }

    function test_Sell_lowersPrice() public {
        _seed(10 ether, 500_000 ether);
        vm.prank(buyer);
        uint256 got = market.buy{value: 1 ether}(address(arrow), 0);

        uint256 priceBefore = market.pricePerArrow(address(arrow));
        vm.prank(buyer);
        arrow.approve(address(market), got);
        vm.prank(buyer);
        uint256 ethOut = market.sell(address(arrow), got, 0);

        assertGt(ethOut, 0);
        assertLt(market.pricePerArrow(address(arrow)), priceBefore); // price down after a sell
    }

    function test_ConstantProduct_neverShrinks() public {
        _seed(10 ether, 500_000 ether);
        (uint256 e0, uint256 a0,,) = market.getPool(address(arrow));
        uint256 k0 = e0 * a0;
        vm.prank(buyer);
        market.buy{value: 3 ether}(address(arrow), 0);
        (uint256 e1, uint256 a1,,) = market.getPool(address(arrow));
        assertGe(e1 * a1, k0); // fee makes k grow, never shrink
    }

    function test_RoundTrip_losesToFees() public {
        _seed(10 ether, 500_000 ether);
        uint256 got = market.quoteBuy(address(arrow), 1 ether);
        vm.prank(buyer);
        market.buy{value: 1 ether}(address(arrow), got);
        // selling exactly what you bought returns less than you put in (fees + slippage)
        uint256 backEth = market.quoteSell(address(arrow), got);
        assertLt(backEth, 1 ether);
    }

    function test_AddThenRemoveLiquidity() public {
        _seed(10 ether, 500_000 ether);
        uint256 arrowNeeded = (5 ether * 500_000 ether) / 10 ether; // proportional
        vm.prank(owner);
        arrow.approve(address(market), arrowNeeded);
        vm.prank(owner);
        uint256 minted = market.addLiquidity{value: 5 ether}(address(arrow), arrowNeeded, 1);
        assertGt(minted, 0);

        uint256 sh = market.shares(address(arrow), owner);
        vm.prank(owner);
        (uint256 eOut, uint256 aOut) = market.removeLiquidity(address(arrow), sh, 0, 0);
        assertGt(eOut, 0);
        assertGt(aOut, 0);
        assertEq(market.shares(address(arrow), owner), 0);
    }

    function test_Buy_noPoolReverts() public {
        vm.prank(buyer);
        vm.expectRevert("No pool");
        market.buy{value: 1 ether}(address(arrow), 0);
    }

    receive() external payable {}
}
