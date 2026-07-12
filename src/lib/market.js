import { parseEther, parseUnits, formatEther, formatUnits, maxUint256 } from "viem";
import { publicClient } from "./rhChain.js";
import { marketAbi, arrowAbi } from "./abis.js";

/* Market (AMM) client. Set VITE_MARKET_ADDRESS after deploying Market.sol to
   enable the buy/sell UI. Testnet prototype — see CLAUDE.md guardrails. */
export const MARKET_ADDRESS = import.meta.env.VITE_MARKET_ADDRESS || "";
export const IS_MARKET_LIVE = /^0x[0-9a-fA-F]{40}$/.test(MARKET_ADDRESS);

const SLIPPAGE_BPS = 300n; // 3% tolerance on swaps

/* Enrich repos with market price + market cap (price x total supply).
   Repos without a pool get price/mcap 0. No-op if no Market configured. */
export async function enrichWithMarket(repos) {
  if (!IS_MARKET_LIVE) return repos;
  return Promise.all(repos.map(async (r) => {
    try {
      const wei = await publicClient.readContract({
        address: MARKET_ADDRESS, abi: marketAbi, functionName: "pricePerArrow", args: [r.arrow],
      });
      const price = Number(formatEther(wei));
      return { ...r, price, mcap: price * r.supply, hasMarket: price > 0 };
    } catch {
      return { ...r, price: 0, mcap: 0, hasMarket: false };
    }
  }));
}

/* ---- reads ---- */
export async function readMarket(arrow) {
  const [pool, price] = await Promise.all([
    publicClient.readContract({ address: MARKET_ADDRESS, abi: marketAbi, functionName: "getPool", args: [arrow] }),
    publicClient.readContract({ address: MARKET_ADDRESS, abi: marketAbi, functionName: "pricePerArrow", args: [arrow] }),
  ]);
  const [ethReserve, arrowReserve, totalShares, exists] = pool;
  return {
    exists,
    ethReserve: Number(formatEther(ethReserve)),
    arrowReserve: Number(formatUnits(arrowReserve, 18)),
    totalShares,
    pricePerArrow: Number(formatEther(price)), // ETH per 1 whole Arrow
  };
}

export async function quoteBuy(arrow, ethAmount) {
  if (!ethAmount || Number(ethAmount) <= 0) return 0;
  const out = await publicClient.readContract({
    address: MARKET_ADDRESS, abi: marketAbi, functionName: "quoteBuy", args: [arrow, parseEther(String(ethAmount))],
  });
  return Number(formatUnits(out, 18));
}

export async function quoteSell(arrow, arrowAmount) {
  if (!arrowAmount || Number(arrowAmount) <= 0) return 0;
  const out = await publicClient.readContract({
    address: MARKET_ADDRESS, abi: marketAbi, functionName: "quoteSell", args: [arrow, parseUnits(String(arrowAmount), 18)],
  });
  return Number(formatEther(out));
}

/* ---- writes ---- */
async function send(walletClient, account, req) {
  const { request } = await publicClient.simulateContract({ account, ...req });
  const hash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

async function ensureApproval(walletClient, account, arrow, amountWei) {
  const allowance = await publicClient.readContract({
    address: arrow, abi: arrowAbi, functionName: "allowance", args: [account, MARKET_ADDRESS],
  });
  if (allowance >= amountWei) return;
  await send(walletClient, account, {
    address: arrow, abi: arrowAbi, functionName: "approve", args: [MARKET_ADDRESS, maxUint256],
  });
}

const lessSlippage = (x) => (x * (10_000n - SLIPPAGE_BPS)) / 10_000n;

export async function buy(walletClient, account, arrow, ethAmount) {
  const ethWei = parseEther(String(ethAmount));
  const quoted = await publicClient.readContract({
    address: MARKET_ADDRESS, abi: marketAbi, functionName: "quoteBuy", args: [arrow, ethWei],
  });
  return send(walletClient, account, {
    address: MARKET_ADDRESS, abi: marketAbi, functionName: "buy", args: [arrow, lessSlippage(quoted)], value: ethWei,
  });
}

export async function sell(walletClient, account, arrow, arrowAmount) {
  const amt = parseUnits(String(arrowAmount), 18);
  await ensureApproval(walletClient, account, arrow, amt);
  const quoted = await publicClient.readContract({
    address: MARKET_ADDRESS, abi: marketAbi, functionName: "quoteSell", args: [arrow, amt],
  });
  return send(walletClient, account, {
    address: MARKET_ADDRESS, abi: marketAbi, functionName: "sell", args: [arrow, amt, lessSlippage(quoted)],
  });
}

export async function createPool(walletClient, account, arrow, ethAmount, arrowAmount) {
  const amt = parseUnits(String(arrowAmount), 18);
  await ensureApproval(walletClient, account, arrow, amt);
  return send(walletClient, account, {
    address: MARKET_ADDRESS, abi: marketAbi, functionName: "createPool", args: [arrow, amt], value: parseEther(String(ethAmount)),
  });
}
