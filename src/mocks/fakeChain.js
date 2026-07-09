/* ------------------------------------------------------------------
   fakeChain.js — in-memory mock of Sherwood.sol + Arrow.sol.
   Ported from frontend/index.html so the React app has realistic
   data + the exact tribute/bounty math during the design phase.
   Swap for viem/wagmi reads/writes when wiring the chain (roadmap #3).
   ------------------------------------------------------------------ */

export const ME = "0xD9AA…87E5";

function makeRepo(o) {
  const holders = o.holders || { [o.owner]: o.supply };
  return {
    id: o.id,
    repoFullName: o.repoFullName,
    language: o.language,
    stars: o.stars,
    owner: o.owner,
    symbol: o.symbol,
    supply: o.supply,
    registeredAt: o.registeredAt,
    holders, // address -> Arrow balance
    cumTributePerShare: o.cumTributePerShare || 0,
    corrections: o.corrections || {}, // address -> bounty correction (mirrors Arrow._update)
    collected: o.collected || {},
    totalTribute: o.totalTribute || 0,
  };
}

// Seed quiver — mirrors the prototype, with a little tribute history so
// the ticker / stats have something to show.
export const seedRepos = [
  makeRepo({
    id: 2, repoFullName: "maintainer/parserfast", language: "Rust", stars: 6212,
    owner: "maintainer", symbol: "PARSE", supply: 1_000_000,
    registeredAt: Date.now() - 3 * 864e5,
    holders: { maintainer: 700000, "0x7c3…a12": 200000, "0x91b…4de": 100000 },
    totalTribute: 2.4, cumTributePerShare: 2.4 / 1_000_000,
  }),
  makeRepo({
    id: 1, repoFullName: "acme/httpkit", language: "Go", stars: 842,
    owner: "acme", symbol: "HTTP", supply: 1_000_000,
    registeredAt: Date.now() - 2 * 864e5,
    holders: { acme: 850000, "0x7c3…a12": 150000 },
    totalTribute: 0.8, cumTributePerShare: 0.8 / 1_000_000,
  }),
  makeRepo({
    id: 0, repoFullName: "nadia/tinygrad-utils", language: "Python", stars: 113,
    owner: "nadia", symbol: "TGU", supply: 1_000_000,
    registeredAt: Date.now() - 1 * 864e5,
  }),
  makeRepo({
    id: 3, repoFullName: "vega/streamsock", language: "TypeScript", stars: 2984,
    owner: "vega", symbol: "SOCK", supply: 1_000_000,
    registeredAt: Date.now() - 5 * 864e5,
    holders: { vega: 600000, "0x7c3…a12": 250000, "0x4f0…9ab": 150000 },
    totalTribute: 1.15, cumTributePerShare: 1.15 / 1_000_000,
  }),
  makeRepo({
    id: 4, repoFullName: "lumen/pixelforge", language: "C", stars: 431,
    owner: "lumen", symbol: "PXF", supply: 1_000_000,
    registeredAt: Date.now() - 8 * 864e5,
    totalTribute: 0.12, cumTributePerShare: 0.12 / 1_000_000,
  }),
];

/* ---- bounty math (identical shape to Arrow.sol) ----
   accumulative = balance * cumTributePerShare + correction  (correction keeps
   entitlements right when Arrows move — see takeStake / Arrow._update). */
export const balanceOf = (r, a) => r.holders[a] || 0;
export const bountyOf = (r, a) =>
  Math.max(0, balanceOf(r, a) * r.cumTributePerShare + (r.corrections[a] || 0) - (r.collected[a] || 0));

/* ---- display helpers ---- */
export const fmt = (n) => n.toLocaleString("en-US");
export const eth = (n) =>
  "Ξ" + (Math.round(n * 1e6) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 6 });
export const ago = (ts) => {
  const d = Math.floor((Date.now() - ts) / 864e5);
  return d <= 0 ? "today" : d === 1 ? "1 day ago" : d + " days ago";
};

// Aggregate stats for the landing hero counters.
export function quiverStats(repos) {
  const totalTribute = repos.reduce((s, r) => s + r.totalTribute, 0);
  const holders = new Set();
  repos.forEach((r) =>
    Object.entries(r.holders).forEach(([a, b]) => b > 0 && holders.add(a))
  );
  return { repoCount: repos.length, totalTribute, holderCount: holders.size };
}

// The Robin Hood glossary, from CLAUDE.md §1.
export const glossary = [
  { term: "Sherwood", meaning: "The registry + factory — the forest that holds every repo.", on: "Sherwood.sol" },
  { term: "Arrow", meaning: "A single repo's ERC-20 token. Hold it, earn from it.", on: "Arrow.sol" },
  { term: "Quiver", meaning: "The full collection of registered repos.", on: "—" },
  { term: "Tribute", meaning: "Funding a repo with ETH. Split pro-rata to holders.", on: "tribute()" },
  { term: "Bounty", meaning: "A holder's claimable ETH share of all tribute.", on: "bounty()" },
];
