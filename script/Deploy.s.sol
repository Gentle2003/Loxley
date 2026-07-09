// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {Sherwood} from "../contracts/Sherwood.sol";

/**
 * Deploys Sherwood (the Loxley registry), then optionally seeds a couple of
 * demo repos so the app isn't empty on first load.
 *
 *   forge script script/Deploy.s.sol \
 *     --rpc-url $BASE_SEPOLIA_RPC --broadcast --verify -vvvv
 */
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        Sherwood sherwood = new Sherwood();
        console.log("Sherwood (Loxley registry) deployed at:", address(sherwood));

        // Seed data (optional). Remove for a clean registry.
        sherwood.registerRepo(
            "octocat/hello-world",
            "C",
            "Hello World Arrow",
            "HELLO",
            1_000_000 ether // 1,000,000 Arrows (18 decimals)
        );
        sherwood.registerRepo(
            "your-org/your-lib",
            "TypeScript",
            "Your Lib Arrow",
            "YLIB",
            1_000_000 ether
        );

        vm.stopBroadcast();
    }
}
