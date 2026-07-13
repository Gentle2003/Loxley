// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {Sherwood} from "../contracts/Sherwood.sol";
import {Arrow} from "../contracts/Arrow.sol";

/**
 * Local-only helper: on an Anvil fork of RH mainnet, deploy Sherwood, register
 * a repo, and seed an Arrow/WETH Uniswap pool — so the frontend (pointed at the
 * fork) has real Uniswap data to read. Not for real networks.
 *
 *   anvil --fork-url https://rpc.mainnet.chain.robinhood.com --chain-id 4663
 *   forge script script/DeployFork.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
 */
interface IUniV2Router {
    function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline)
        external payable returns (uint256, uint256, uint256);
}

contract DeployFork is Script {
    IUniV2Router constant ROUTER = IUniV2Router(0x89e5DB8B5aA49aA85AC63f691524311AEB649eba);

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address me = vm.addr(pk);
        vm.startBroadcast(pk);

        Sherwood sherwood = new Sherwood();
        address arrow = sherwood.registerRepo("octocat/hello-world", "C", "Hello Arrow", "HELLO", 1_000_000 ether);
        Arrow(arrow).approve(address(ROUTER), type(uint256).max);
        ROUTER.addLiquidityETH{value: 5 ether}(arrow, 250_000 ether, 0, 0, me, block.timestamp + 600);

        console.log("Sherwood:", address(sherwood));
        console.log("Arrow:", arrow);
        vm.stopBroadcast();
    }
}
