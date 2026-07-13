import { defineChain, createPublicClient, http } from "viem";

/* Robinhood Chain — env-parametrized so the same build can target testnet
   (default), a local mainnet fork, or mainnet, by setting VITE_CHAIN_* vars.
   Testnet: 46630. Mainnet: 4663. */
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 46630);
const IS_MAINNET = CHAIN_ID === 4663;

export const CHAIN_RPC =
  import.meta.env.VITE_CHAIN_RPC ||
  import.meta.env.VITE_RH_TESTNET_RPC ||
  (IS_MAINNET ? "https://rpc.mainnet.chain.robinhood.com" : "https://rpc.testnet.chain.robinhood.com");

const EXPLORER =
  import.meta.env.VITE_CHAIN_EXPLORER ||
  (IS_MAINNET ? "https://robinhoodchain.blockscout.com" : "https://explorer.testnet.chain.robinhood.com");

const NAME =
  import.meta.env.VITE_NETWORK_LABEL ||
  (IS_MAINNET ? "Robinhood Chain" : "Robinhood Chain Testnet");

export const rhChain = defineChain({
  id: CHAIN_ID,
  name: NAME,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [CHAIN_RPC] } },
  blockExplorers: { default: { name: "Explorer", url: EXPLORER } },
  testnet: !IS_MAINNET,
});

// Back-compat alias (older imports used `rhTestnet`).
export const rhTestnet = rhChain;

/* Read-only client for reads that don't need a wallet. */
export const publicClient = createPublicClient({ chain: rhChain, transport: http() });
