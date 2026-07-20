/* Read-only chain access. The CLI never signs — signing happens in the user's
   own wallet via the browser hand-off (see commands/register.js), so no private
   key ever touches this process. */

import { createPublicClient, http, defineChain, formatUnits } from "viem";

/* Minimal Sherwood ABI — only what the CLI reads. Field order and widths must
   match struct Sherwood.Repo exactly, or viem mis-decodes the tuple. */
export const sherwoodAbi = [
  { type: "function", name: "repoCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "getRepos",
    stateMutability: "view",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [
      {
        name: "page",
        type: "tuple[]",
        components: [
          { name: "repoFullName", type: "string" },
          { name: "language", type: "string" },
          { name: "arrow", type: "address" },
          { name: "owner", type: "address" },
          { name: "registeredAt", type: "uint64" },
        ],
      },
    ],
  },
];

export function makeClient(cfg) {
  const chain = defineChain({
    id: cfg.chainId,
    name: cfg.networkLabel || "Robinhood Chain",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [cfg.rpcUrl] } },
    blockExplorers: { default: { name: "Explorer", url: cfg.explorer } },
  });
  return createPublicClient({ chain, transport: http(cfg.rpcUrl) });
}

export async function readRepos(client, sherwood) {
  const count = await client.readContract({ address: sherwood, abi: sherwoodAbi, functionName: "repoCount" });
  if (count === 0n) return [];
  return client.readContract({
    address: sherwood,
    abi: sherwoodAbi,
    functionName: "getRepos",
    args: [0n, count],
  });
}

/* Find an already-registered repo by name (case-insensitive). */
export async function findRepo(client, sherwood, fullName) {
  const target = fullName.toLowerCase();
  const rows = await readRepos(client, sherwood);
  const i = rows.findIndex((r) => (r.repoFullName || "").toLowerCase() === target);
  return i === -1 ? null : { index: i, ...rows[i] };
}

export { formatUnits };
