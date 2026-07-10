// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {Market} from "../contracts/Market.sol";

/**
 * Deploys the Market AMM (per-Arrow ETH pools). Independent of Sherwood — it
 * trades any Arrow address, so this does NOT redeploy the live registry.
 *
 * Target: Robinhood Chain testnet (chain ID 46630). Testnet only — the Market
 * is an unaudited prototype; see CLAUDE.md guardrails (audit + legal review
 * required before any real-money / mainnet market).
 *
 *   forge script script/DeployMarket.s.sol \
 *     --rpc-url $RH_TESTNET_RPC --broadcast -vvvv
 */
contract DeployMarket is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        Market market = new Market();
        console.log("Market (Loxley AMM) deployed at:", address(market));
        vm.stopBroadcast();
    }
}
