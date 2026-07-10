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
        fullName: d.full_name,          // canonical owner/name (correct casing)
        stars: d.stargazers_count ?? 0,
        description: d.description || "",
        language: d.language || "",
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

/* Parse loose input (a full GitHub URL, git@ SSH, github.com/…, or owner/name)
   into a best-guess "owner/name". Returns null if it can't find two segments. */
export function parseRepoInput(input) {
  if (!input) return null;
  let s = String(input).trim();
  s = s.replace(/^git@github\.com:/i, "");           // git@github.com:owner/name.git
  s = s.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/^github\.com\//i, "");
  s = s.split(/[?#]/)[0].replace(/\.git$/i, "").replace(/\/+$/, "");
  const parts = s.split("/").filter(Boolean);
  if (parts.length < 2 || !parts[0] || !parts[1]) return null;
  return `${parts[0]}/${parts[1]}`;
}

/* Resolve loose input to a real GitHub repo. Returns a status so the caller can
   distinguish "doesn't exist" (block) from "couldn't reach GitHub" (allow). */
export async function resolveRepo(input) {
  const guess = parseRepoInput(input);
  if (!guess) return { status: "invalid" };
  try {
    const res = await fetch(`https://api.github.com/repos/${guess}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (res.status === 404) return { status: "notfound", guess };
    if (!res.ok) return { status: "error", guess };   // 403 rate-limit, etc.
    const d = await res.json();
    const meta = {
      fullName: d.full_name,
      stars: d.stargazers_count ?? 0,
      description: d.description || "",
      language: d.language || "",
      htmlUrl: d.html_url,
      openIssues: d.open_issues_count ?? 0,
      pushedAt: d.pushed_at || null,
    };
    ghCache.set(meta.fullName, meta);                  // warm the enrich cache
    return { status: "found", meta };
  } catch {
    return { status: "error", guess };
  }
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
