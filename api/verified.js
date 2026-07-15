/* ------------------------------------------------------------------
   /api/verified — the set of OAuth-verified repos, for the Quiver badge.

   Returns the lowercased "owner/name" list recorded by /api/verify-repo.
   The client ORs this with the loxley-verify.txt proof check, so both
   verification paths light up the same Verified ✓ badge.
   Degrades to an empty list when no KV store is configured.
   ------------------------------------------------------------------ */

import { getAllVerified, KV_READY } from "./_kv.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ready: false, repos: [] });
  try {
    const map = await getAllVerified();
    res.setHeader("Cache-Control", "public, max-age=15, s-maxage=15");
    return res.status(200).json({ ready: KV_READY, repos: Object.keys(map) });
  } catch {
    return res.status(200).json({ ready: false, repos: [] });
  }
}
