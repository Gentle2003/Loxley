import { formatUnits } from "viem";
import { publicClient } from "./rhChain.js";
import { arrowAbi } from "./abis.js";

/* ------------------------------------------------------------------
   Client-side indexer — enriches on-chain repos with off-chain data
   the contracts can't hold:
     • GitHub metadata (stars, description) via the public GitHub API
     • the full holder set, reconstructed from Arrow Transfer logs
   Everything degrades gracefully: a failed GitHub fetch or log query
   leaves the on-chain data untouched. Graduate to a cached serverless
   indexer if rate limits / traffic demand it.
   ------------------------------------------------------------------ */

const ZERO = "0x0000000000000000000000000000000000000000";
const ghCache = new Map(); // repoFullName -> meta | null

/* ---- GitHub metadata ---- */
export async function fetchGithub(repoFullName) {
  if (ghCache.has(repoFullName)) return ghCache.get(repoFullName);
  let meta = null;
  try {
    const res = await fetch(`https://api.github.com/repos/${repoFullName}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (res.ok) {
      const d = await res.json();
      meta = {
        stars: d.stargazers_count ?? 0,
        description: d.description || "",
        htmlUrl: d.html_url,
        openIssues: d.open_issues_count ?? 0,
        pushedAt: d.pushed_at || null,
      };
    }
  } catch {
    meta = null; // network/CORS/rate-limit — leave on-chain data as-is
  }
  ghCache.set(repoFullName, meta);
  return meta;
}

/* Enrich a list of on-chain repos with GitHub stars + description. */
export async function enrichWithGithub(repos) {
  return Promise.all(repos.map(async (r) => {
    const gh = await fetchGithub(r.repoFullName);
    return gh ? { ...r, stars: gh.stars, description: gh.description } : r;
  }));
}

/* ---- holders, from Transfer logs ---- */
export async function readHolders(arrow) {
  let logs;
  try {
    logs = await publicClient.getContractEvents({
      address: arrow, abi: arrowAbi, eventName: "Transfer",
      fromBlock: 0n, toBlock: "latest",
    });
  } catch {
    return null; // RPC declined the range — caller falls back to on-chain view
  }
  const bal = new Map();
  for (const l of logs) {
    const { from, to, value } = l.args;
    if (from && from !== ZERO) bal.set(from, (bal.get(from) || 0n) - value);
    if (to && to !== ZERO) bal.set(to, (bal.get(to) || 0n) + value);
  }
  return [...bal.entries()]
    .map(([address, wei]) => ({ address, balance: Number(formatUnits(wei, 18)) }))
    .filter((h) => h.balance > 0)
    .sort((a, b) => b.balance - a.balance);
}
