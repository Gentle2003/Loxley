/* ------------------------------------------------------------------
   /api/verify-repo — GitHub OAuth ownership verification, backend half.

   A Vercel serverless function. It holds the OAuth client SECRET (which must
   never reach the browser), exchanges the OAuth `code` for a user access token,
   then asks GitHub whether that user is an ADMIN of the repo they're trying to
   register — GET /repos/{owner}/{name} returns a `permissions` object scoped to
   the authenticated user.

   Env (Vercel → Settings → Environment Variables):
     GITHUB_CLIENT_ID      — OAuth App client id
     GITHUB_CLIENT_SECRET  — OAuth App client secret  (server-only, NOT VITE_*)
     VERIFY_MOCK=1         — optional: skip GitHub, always return verified (dev)

   When the secret is absent (e.g. the OAuth App isn't created yet) it falls
   back to MOCK so local/preview deploys still work end-to-end.

   Response: { verified, login?, permission?, reason?, mock? }
   ------------------------------------------------------------------ */

import { setVerified } from "./_kv.js";

const MOCK =
  process.env.VERIFY_MOCK === "1" ||
  !process.env.GITHUB_CLIENT_ID ||
  !process.env.GITHUB_CLIENT_SECRET;

const gh = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "loxley-verify",
});

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ verified: false, reason: "method" });

  const { code, owner, name } = req.body || {};
  if (!owner || !name) return res.status(400).json({ verified: false, reason: "missing repo" });

  if (MOCK) {
    return res.status(200).json({ verified: true, login: "mock-owner", permission: "admin", mock: true });
  }
  if (!code) return res.status(400).json({ verified: false, reason: "missing code" });

  try {
    // 1) code -> user access token (client secret used here, server-side only)
    const tokRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const tok = await tokRes.json();
    const token = tok.access_token;
    if (!token) return res.status(200).json({ verified: false, reason: "token exchange failed" });

    // 2) identify the authenticated user (for the badge label)
    const meRes = await fetch("https://api.github.com/user", { headers: gh(token) });
    const me = meRes.ok ? await meRes.json() : {};

    // 3) does that user hold admin on owner/name?
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${name}`, { headers: gh(token) });
    if (repoRes.status === 404) {
      // 404 = the token can't see the repo at all → no access
      return res.status(200).json({ verified: false, reason: "no access", login: me.login });
    }
    if (!repoRes.ok) return res.status(200).json({ verified: false, reason: "github error", login: me.login });

    const repo = await repoRes.json();
    const p = repo.permissions || {};
    const permission = p.admin ? "admin" : p.push ? "push" : p.pull ? "pull" : "none";
    const verified = p.admin === true;
    if (verified) {
      // best-effort persist so the Quiver can badge this repo for every visitor
      try {
        await setVerified(owner, name, { verified: true, login: me.login, permission, at: Date.now() });
      } catch { /* KV optional — never block verification on a store failure */ }
    }
    return res.status(200).json({
      verified,
      login: me.login,
      permission,
      reason: verified ? undefined : "not an admin",
    });
  } catch {
    return res.status(500).json({ verified: false, reason: "server error" });
  }
}
