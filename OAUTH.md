# GitHub OAuth ownership verification — setup

Proves that whoever registers a repo actually has **admin** rights on it, before
the register transaction is allowed. Complements the client-side `loxley-verify.txt`
proof: OAuth is a stronger, interactive *hard block* on the register flow.

**No contract change, no migration, no re-audit** — this is a frontend
(`src/lib/ghAuth.js`, wired into `src/pages/Quiver.jsx`) plus one serverless
function (`api/verify-repo.js`) that holds the OAuth secret.

Until you set `VITE_GITHUB_CLIENT_ID`, the app runs in **mock mode**: the
"Verify ownership on GitHub" button resolves as verified with no redirect, so
you can demo the whole flow locally first.

## 1. Create the GitHub OAuth App

github.com → **Settings → Developer settings → OAuth Apps → New OAuth App**

| Field | Value |
|-------|-------|
| Application name | `Loxley` |
| Homepage URL | `https://loxleyhood.xyz` |
| Authorization callback URL | `https://loxleyhood.xyz` |

- The callback URL matches by prefix, so subpaths like `/quiver` are allowed —
  registering the site root is enough for production.
- For local dev, either keep mock mode, or register a **second** OAuth App with
  callback `http://localhost:5173`.

Copy the **Client ID**, then **Generate a new client secret** and copy it.

## 2. Set env vars

**Vercel → Settings → Environment Variables** (Production):

| Var | Value | Exposed to browser? |
|-----|-------|---------------------|
| `VITE_GITHUB_CLIENT_ID` | the Client ID | yes (safe) |
| `GITHUB_CLIENT_ID` | the Client ID | no |
| `GITHUB_CLIENT_SECRET` | the client secret | no — **never** prefix with `VITE_` |

Optional: `VITE_GITHUB_SCOPE=repo` to also verify **private** repos (default
`""` covers public repos). Redeploy after changing env vars.

## 3. Verify it works

1. Open the site → **Register repo** → enter a repo you own.
2. Click **Verify ownership on GitHub** → authorize → you're returned to the
   drawer with "Ownership verified as @you · admin ✓" and the register button
   unlocks.
3. Try a repo you *don't* own → the check fails and registration stays blocked.

## 4. Badge persistence — provision a KV store

A successful OAuth check writes the repo to a KV store (`api/verify-repo.js` →
`api/_kv.js`), and the Quiver reads that list (`api/verified` →
`src/lib/indexer.js`) so **every visitor** sees the Verified ✓ badge — not just
the person who verified. Until a store is connected, badges fall back to the
`loxley-verify.txt` proof only.

To turn it on:

1. Vercel → **Storage → Create Database → KV** (Upstash Redis; free tier is
   fine). Connect it to this project.
2. Vercel injects `KV_REST_API_URL` + `KV_REST_API_TOKEN` automatically — the
   code also accepts the `UPSTASH_REDIS_REST_*` names if you use the Marketplace
   integration directly. **Server-only — never prefix with `VITE_`.**
3. Redeploy. Verify a repo you own → its badge appears in the Quiver for
   everyone.

Both verification paths (OAuth-in-KV and the `loxley-verify.txt` proof) light up
the same badge — a repo is verified if *either* passed.

**None of this touches the contract** — no change, no migration, no re-audit.
