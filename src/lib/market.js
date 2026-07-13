import { parseEther, parseUnits, formatEther, formatUnits, maxUint256 } from "viem";
import { publicClient, CHAIN_ID } from "./rhChain.js";
import { arrowAbi } from "./abis.js";

/* ------------------------------------------------------------------
   Market = Uniswap V2 (audited, already deployed). Arrows are plain
   ERC-20s, so they trade in Arrow/WETH pools via the Uniswap router —
   no custom AMM contract to write or audit. Validated against real
   Uniswap on a Robinhood-mainnet fork (test/UniswapIntegration.t.sol).
   ------------------------------------------------------------------ */

// Uniswap V2 deployments per chain (verified on-chain). A mainnet fork shares
// mainnet's addresses, so 4663 covers both. Testnet (46630) has no Uniswap yet.
const DEX = {
  4663: {
    router: "0x89e5DB8B5aA49aA85AC63f691524311AEB649eba",
    factory: "0x8bcEaA40B9AcdfAedF85AdF4FF01F5Ad6517937f",
    weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
  },
};
export const dex = DEX[CHAIN_ID] || null;
export const IS_MARKET_LIVE = Boolean(dex); // trading is available on this chain?

const ZERO = "0x0000000000000000000000000000000000000000";
const SLIPPAGE_BPS = 300n; // 3%
const lessSlippage = (x) => (x * (10_000n - SLIPPAGE_BPS)) / 10_000n;
const deadline = () => BigInt(Math.floor(Date.now() / 1000) + 1200); // +20 min

const routerAbi = [
  { type: "function", name: "getAmountsOut", stateMutability: "view", inputs: [{ name: "amountIn", type: "uint256" }, { name: "path", type: "address[]" }], outputs: [{ name: "amounts", type: "uint256[]" }] },
  { type: "function", name: "swapExactETHForTokens", stateMutability: "payable", inputs: [{ name: "amountOutMin", type: "uint256" }, { name: "path", type: "address[]" }, { name: "to", type: "address" }, { name: "deadline", type: "uint256" }], outputs: [{ name: "amounts", type: "uint256[]" }] },
  { type: "function", name: "swapExactTokensForETH", stateMutability: "nonpayable", inputs: [{ name: "amountIn", type: "uint256" }, { name: "amountOutMin", type: "uint256" }, { name: "path", type: "address[]" }, { name: "to", type: "address" }, { name: "deadline", type: "uint256" }], outputs: [{ name: "amounts", type: "uint256[]" }] },
  { type: "function", name: "addLiquidityETH", stateMutability: "payable", inputs: [{ name: "token", type: "address" }, { name: "amountTokenDesired", type: "uint256" }, { name: "amountTokenMin", type: "uint256" }, { name: "amountETHMin", type: "uint256" }, { name: "to", type: "address" }, { name: "deadline", type: "uint256" }], outputs: [{ name: "amountToken", type: "uint256" }, { name: "amountETH", type: "uint256" }, { name: "liquidity", type: "uint256" }] },
];
const factoryAbi = [
  { type: "function", name: "getPair", stateMutability: "view", inputs: [{ name: "a", type: "address" }, { name: "b", type: "address" }], outputs: [{ name: "pair", type: "address" }] },
];
const pairAbi = [
  { type: "function", name: "getReserves", stateMutability: "view", inputs: [], outputs: [{ name: "reserve0", type: "uint112" }, { name: "reserve1", type: "uint112" }, { name: "ts", type: "uint32" }] },
  { type: "function", name: "token0", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
];

const getPair = (arrow) =>
  publicClient.readContract({ address: dex.factory, abi: factoryAbi, functionName: "getPair", args: [arrow, dex.weth] });

/* ---- reads ---- */
export async function readMarket(arrow) {
  const empty = { exists: false, ethReserve: 0, arrowReserve: 0, pricePerArrow: 0 };
  if (!dex) return empty;
  const pair = await getPair(arrow);
  if (!pair || pair === ZERO) return empty;
  const [reserves, token0] = await Promise.all([
    publicClient.readContract({ address: pair, abi: pairAbi, functionName: "getReserves" }),
    publicClient.readContract({ address: pair, abi: pairAbi, functionName: "token0" }),
  ]);
  const arrowIsToken0 = token0.toLowerCase() === arrow.toLowerCase();
  const arrowReserve = Number(formatUnits(arrowIsToken0 ? reserves[0] : reserves[1], 18));
  const ethReserve = Number(formatEther(arrowIsToken0 ? reserves[1] : reserves[0]));
  return { exists: true, ethReserve, arrowReserve, pricePerArrow: arrowReserve > 0 ? ethReserve / arrowReserve : 0 };
}

export async function enrichWithMarket(repos) {
  if (!dex) return repos.map((r) => ({ ...r, price: 0, mcap: 0, hasMarket: false }));
  return Promise.all(repos.map(async (r) => {
    try {
      const m = await readMarket(r.arrow);
      return { ...r, price: m.pricePerArrow, mcap: m.pricePerArrow * r.supply, hasMarket: m.exists };
    } catch { return { ...r, price: 0, mcap: 0, hasMarket: false }; }
  }));
}

export async function quoteBuy(arrow, ethAmount) {
  if (!dex || !ethAmount || Number(ethAmount) <= 0) return 0;
  try {
    const a = await publicClient.readContract({ address: dex.router, abi: routerAbi, functionName: "getAmountsOut", args: [parseEther(String(ethAmount)), [dex.weth, arrow]] });
    return Number(formatUnits(a[a.length - 1], 18));
  } catch { return 0; }
}

export async function quoteSell(arrow, arrowAmount) {
  if (!dex || !arrowAmount || Number(arrowAmount) <= 0) return 0;
  try {
    const a = await publicClient.readContract({ address: dex.router, abi: routerAbi, functionName: "getAmountsOut", args: [parseUnits(String(arrowAmount), 18), [arrow, dex.weth]] });
    return Number(formatEther(a[a.length - 1]));
  } catch { return 0; }
}

/* ---- writes ---- */
async function send(walletClient, account, req) {
  const { request } = await publicClient.simulateContract({ account, ...req });
  const hash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

async function ensureApproval(walletClient, account, arrow, amountWei) {
  const allowance = await publicClient.readContract({ address: arrow, abi: arrowAbi, functionName: "allowance", args: [account, dex.router] });
  if (allowance >= amountWei) return;
  await send(walletClient, account, { address: arrow, abi: arrowAbi, functionName: "approve", args: [dex.router, maxUint256] });
}

export async function buy(walletClient, account, arrow, ethAmount) {
  const ethWei = parseEther(String(ethAmount));
  const a = await publicClient.readContract({ address: dex.router, abi: routerAbi, functionName: "getAmountsOut", args: [ethWei, [dex.weth, arrow]] });
  return send(walletClient, account, {
    address: dex.router, abi: routerAbi, functionName: "swapExactETHForTokens",
    args: [lessSlippage(a[a.length - 1]), [dex.weth, arrow], account, deadline()], value: ethWei,
  });
}

export async function sell(walletClient, account, arrow, arrowAmount) {
  const amt = parseUnits(String(arrowAmount), 18);
  await ensureApproval(walletClient, account, arrow, amt);
  const a = await publicClient.readContract({ address: dex.router, abi: routerAbi, functionName: "getAmountsOut", args: [amt, [arrow, dex.weth]] });
  return send(walletClient, account, {
    address: dex.router, abi: routerAbi, functionName: "swapExactTokensForETH",
    args: [amt, lessSlippage(a[a.length - 1]), [arrow, dex.weth], account, deadline()],
  });
}

// Seed a pool: add ETH + Arrows as liquidity (creates the pair on first add).
export async function createPool(walletClient, account, arrow, ethAmount, arrowAmount) {
  const arrowWei = parseUnits(String(arrowAmount), 18);
  await ensureApproval(walletClient, account, arrow, arrowWei);
  return send(walletClient, account, {
    address: dex.router, abi: routerAbi, functionName: "addLiquidityETH",
    args: [arrow, arrowWei, 0n, 0n, account, deadline()], value: parseEther(String(ethAmount)),
  });
}
