import { createWalletClient, custom, parseEther, parseUnits, formatEther, formatUnits } from "viem";
import { publicClient, rhTestnet } from "./rhChain.js";
import { sherwoodAbi, arrowAbi } from "./abis.js";

/* Deployed Sherwood address — set VITE_SHERWOOD_ADDRESS once deployed to RH
   testnet. Empty => the app runs in mock mode (see ChainProvider). */
export const SHERWOOD_ADDRESS = import.meta.env.VITE_SHERWOOD_ADDRESS || "";
export const IS_LIVE = /^0x[0-9a-fA-F]{40}$/.test(SHERWOOD_ADDRESS);

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

/* ---- wallet ---- */
export async function connectWallet() {
  const eth = typeof window !== "undefined" ? window.ethereum : null;
  if (!eth) throw new Error("No wallet detected. Install an EVM wallet to use Loxley on-chain.");
  const walletClient = createWalletClient({ chain: rhTestnet, transport: custom(eth) });
  const [account] = await walletClient.requestAddresses();
  // make sure the wallet is on Robinhood Chain testnet (46630)
  const id = await walletClient.getChainId();
  if (id !== rhTestnet.id) {
    try {
      await walletClient.switchChain({ id: rhTestnet.id });
    } catch (e) {
      // 4902: chain not added to the wallet yet
      if (e?.code === 4902 || /Unrecognized chain/i.test(e?.message || "")) {
        await walletClient.addChain({ chain: rhTestnet });
        await walletClient.switchChain({ id: rhTestnet.id });
      } else throw e;
    }
  }
  return { walletClient, account };
}

/* ---- reads ----
   Assemble each repo into the same shape the UI's fakeChain helpers expect.
   We only know the connected user's balance/bounty on-chain (the full holder
   set + GitHub stars need the indexer — roadmap #2), so `holders` carries just
   the connected account and `corrections` is set so bountyOf(r, account)
   returns the real on-chain bounty. */
export async function readQuiver(account, keyAs = account) {
  const count = await publicClient.readContract({
    address: SHERWOOD_ADDRESS, abi: sherwoodAbi, functionName: "repoCount",
  });
  if (count === 0n) return [];
  const rows = await publicClient.readContract({
    address: SHERWOOD_ADDRESS, abi: sherwoodAbi, functionName: "getRepos", args: [0n, count],
  });

  return Promise.all(rows.map(async (r, i) => {
    const arrow = r.arrow;
    const reads = [
      publicClient.readContract({ address: arrow, abi: arrowAbi, functionName: "symbol" }),
      publicClient.readContract({ address: arrow, abi: arrowAbi, functionName: "totalSupply" }),
      publicClient.readContract({ address: arrow, abi: arrowAbi, functionName: "totalTribute" }),
      account ? publicClient.readContract({ address: arrow, abi: arrowAbi, functionName: "balanceOf", args: [account] }) : Promise.resolve(0n),
      account ? publicClient.readContract({ address: arrow, abi: arrowAbi, functionName: "bountyOf", args: [account] }) : Promise.resolve(0n),
    ];
    const [symbol, supply, totalTribute, myBal, myBounty] = await Promise.all(reads);
    const balance = Number(formatUnits(myBal, 18));
    const bounty = Number(formatEther(myBounty));
    return {
      id: i,
      arrow,
      repoFullName: r.repoFullName,
      language: r.language,
      owner: r.owner,
      registeredAt: Number(r.registeredAt) * 1000,
      symbol,
      supply: Number(formatUnits(supply, 18)),
      totalTribute: Number(formatEther(totalTribute)),
      stars: 0, // needs the GitHub indexer (roadmap #2)
      holders: keyAs && balance > 0 ? { [keyAs]: balance } : {},
      cumTributePerShare: 0,
      corrections: keyAs ? { [keyAs]: bounty } : {},
      collected: {},
    };
  }));
}

/* ---- writes (return the tx hash after confirmation) ---- */
async function send(walletClient, account, req) {
  const { request } = await publicClient.simulateContract({ account, ...req });
  const hash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export function registerRepo(walletClient, account, { repoFullName, language, symbol, supply }) {
  return send(walletClient, account, {
    address: SHERWOOD_ADDRESS, abi: sherwoodAbi, functionName: "registerRepo",
    args: [repoFullName, language, `${repoFullName} Arrow`, symbol, parseUnits(String(supply), 18)],
  });
}

export function tribute(walletClient, account, arrow, ethAmount) {
  return send(walletClient, account, {
    address: arrow, abi: arrowAbi, functionName: "tribute", value: parseEther(String(ethAmount)),
  });
}

export function bounty(walletClient, account, arrow) {
  return send(walletClient, account, { address: arrow, abi: arrowAbi, functionName: "bounty" });
}

export { short };
