/* ------------------------------------------------------------------
   /api/cli-config — public runtime config for the Loxley CLI.

   The CLI fetches this instead of hardcoding a client id / registry
   address, so it automatically follows wherever the deployment points.
   Everything here is PUBLIC (an OAuth client id is not a secret). Never
   add GITHUB_CLIENT_SECRET or any token to this response.
   ------------------------------------------------------------------ */

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "method" });

  const chainId = Number(process.env.VITE_CHAIN_ID || process.env.CHAIN_ID || 4663);
  const isMainnet = chainId === 4663;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return res.status(200).json({
    githubClientId: process.env.VITE_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID || "",
    chainId,
    rpcUrl:
      process.env.VITE_CHAIN_RPC ||
      (isMainnet ? "https://rpc.mainnet.chain.robinhood.com" : "https://rpc.testnet.chain.robinhood.com"),
    explorer:
      process.env.VITE_CHAIN_EXPLORER ||
      (isMainnet ? "https://robinhoodchain.blockscout.com" : "https://explorer.testnet.chain.robinhood.com"),
    networkLabel: process.env.VITE_NETWORK_LABEL || (isMainnet ? "Robinhood Chain" : "Robinhood Chain testnet"),
    sherwoodAddress: process.env.VITE_SHERWOOD_ADDRESS || "",
  });
}
