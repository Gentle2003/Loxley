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

/* All GitHub reads go through the authenticated serverless proxy (/api/gh):
   it lifts the browser's 60 req/hr (unauthenticated, per-IP) to 5,000 req/hr
   and edge-caches responses. When the proxy isn't there — local `npm run dev`
   serves no functions — we fall back to direct unauthenticated GitHub. */
const GH_PROXY = "/api/gh";

/* raw GitHub repo object -> our compact meta shape (matches the proxy's shape) */
function normRepo(d) {
  return {
    fullName: d.full_name,            // canonical owner/name (correct casing)
    stars: d.stargazers_count ?? 0,
    description: d.description || "",
    language: d.language || "",
    htmlUrl: d.html_url,
    openIssues: d.open_issues_count ?? 0,
    pushedAt: d.pushed_at || null,
  };
}

/* Repo metadata → { status: "found"|"notfound"|"error", meta? }. Proxy first;
   on anything inconclusive (incl. Vite serving HTML for /api in dev) fall back
   to direct GitHub. */
async function fetchRepoMeta(repo) {
  try {
    const r = await fetch(`${GH_PROXY}?repo=${encodeURIComponent(repo)}`);
    if ((r.headers.get("content-type") || "").includes("application/json")) {
      if (r.status === 404) return { status: "notfound" };
      if (r.ok) {
        const meta = await r.json();
        if (meta && meta.fullName) return { status: "found", meta };
      } else if (r.status === 403 || r.status === 429) {
        return { status: "error" };
      }
    }
  } catch { /* fall through to direct */ }
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (r.status === 404) return { status: "notfound" };
    if (!r.ok) return { status: "error" };            // 403 rate-limit, etc.
    return { status: "found", meta: normRepo(await r.json()) };
  } catch {
    return { status: "error" };
  }
}

/* Raw text of a file in the repo (for the loxley-verify.txt proof), or null.
   Proxy first, then direct GitHub. */
async function fetchRepoFile(repo, path) {
  try {
    const r = await fetch(`${GH_PROXY}?repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}`);
    // text/html => Vite's SPA fallback in dev, not a real proxy response
    if (!(r.headers.get("content-type") || "").includes("text/html")) {
      if (r.status === 404) return null;
      if (r.ok) return await r.text();
    }
  } catch { /* fall through to direct */ }
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { Accept: "application/vnd.github.raw+json" },
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

/* ---- GitHub metadata ---- */
export async function fetchGithub(repoFullName) {
  if (ghCache.has(repoFullName)) return ghCache.get(repoFullName);
  const { status, meta } = await fetchRepoMeta(repoFullName);
  const val = status === "found" ? meta : null;
  ghCache.set(repoFullName, val);
  return val;
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
  const res = await fetchRepoMeta(guess);
  if (res.status === "found") {
    ghCache.set(res.meta.fullName, res.meta);          // warm the enrich cache
    return { status: "found", meta: res.meta };
  }
  return { status: res.status, guess };                // notfound | error
}

/* Ownership proof: the repo's owner proves control by committing a file
   `loxley-verify.txt` containing their wallet address to the default branch
   (only someone with write/admin access can do that). Checked client-side via
   the GitHub API — no backend. `address` is the on-chain repo owner. */
export async function checkOwnershipProof(repoFullName, address) {
  if (!repoFullName || !address) return false;
  const text = await fetchRepoFile(repoFullName, "loxley-verify.txt");
  return text ? text.toLowerCase().includes(address.toLowerCase()) : false;
}

/* OAuth-verified repos, from the serverless KV store (api/verified). Returns a
   Set of lowercased "owner/name". Cache-busted so a just-verified repo shows its
   badge immediately; degrades to an empty set with no backend (local dev). */
export async function fetchVerifiedSet() {
  const set = new Set();
  try {
    const res = await fetch(`/api/verified?t=${Date.now()}`);
    if (res.ok) {
      const d = await res.json();
      (d.repos || []).forEach((k) => set.add(String(k).toLowerCase()));
    }
  } catch {
    /* no serverless / offline — the proof-file badge still works */
  }
  return set;
}

/* Enrich a list of on-chain repos with GitHub stars + description + verified.
   A repo is verified if EITHER path passed: the loxley-verify.txt proof, or a
   GitHub OAuth admin check recorded in KV. */
export async function enrichWithGithub(repos) {
  const oauthSet = await fetchVerifiedSet();
  return Promise.all(repos.map(async (r) => {
    const [gh, proof] = await Promise.all([
      fetchGithub(r.repoFullName),
      checkOwnershipProof(r.repoFullName, r.owner),
    ]);
    const verified = proof || oauthSet.has(r.repoFullName.toLowerCase());
    const base = gh ? { ...r, stars: gh.stars, description: gh.description } : r;
    return { ...base, verified };
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
