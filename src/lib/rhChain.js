import { defineChain, createPublicClient, http } from "viem";

/* Robinhood Chain testnet — EVM-compatible Arbitrum L2.
   Chain ID 46630, gas token ETH. See CLAUDE.md guardrails. */
export const RH_TESTNET_RPC =
  import.meta.env.VITE_RH_TESTNET_RPC || "https://rpc.testnet.chain.robinhood.com";

export const rhTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RH_TESTNET_RPC] } },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://explorer.testnet.chain.robinhood.com" },
  },
  testnet: true,
});

/* Read-only client for reads that don't need a wallet. */
export const publicClient = createPublicClient({ chain: rhTestnet, transport: http() });
