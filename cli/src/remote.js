/* Public runtime config, fetched from the deployed site (/api/cli-config) so
   the CLI follows the live deployment instead of hardcoding addresses.
   Falls back to mainnet defaults when the site is unreachable. */

export const SITE = (process.env.LOXLEY_SITE || "https://loxleyhood.xyz").replace(/\/+$/, "");

const FALLBACK = {
  githubClientId: process.env.LOXLEY_GITHUB_CLIENT_ID || "",
  chainId: 4663,
  rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
  explorer: "https://robinhoodchain.blockscout.com",
  networkLabel: "Robinhood Chain",
  sherwoodAddress: "0x9b9FA581bEF05Fe169763497fd7Fd2D307Fe91Ac",
};

let cache = null;

export async function remoteConfig() {
  if (cache) return cache;
  let cfg = { ...FALLBACK };
  try {
    const r = await fetch(`${SITE}/api/cli-config`, { headers: { Accept: "application/json" } });
    if (r.ok && (r.headers.get("content-type") || "").includes("json")) {
      const d = await r.json();
      // only take non-empty values so a blank env var can't wipe a good default
      for (const [k, v] of Object.entries(d)) if (v !== "" && v != null) cfg[k] = v;
    }
  } catch {
    /* offline or site down — fall back */
  }
  // env always wins, for testing against a local/staging deployment
  if (process.env.LOXLEY_GITHUB_CLIENT_ID) cfg.githubClientId = process.env.LOXLEY_GITHUB_CLIENT_ID;
  if (process.env.LOXLEY_RPC_URL) cfg.rpcUrl = process.env.LOXLEY_RPC_URL;
  if (process.env.LOXLEY_SHERWOOD) cfg.sherwoodAddress = process.env.LOXLEY_SHERWOOD;
  cache = cfg;
  return cfg;
}
