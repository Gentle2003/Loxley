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

## What's still a follow-up

The register-time gate is enforced, but the **Verified ✓ badge in the Quiver**
is still driven by the `loxley-verify.txt` proof (it's re-checkable by anyone at
any time; an OAuth pass is a one-time event). To badge OAuth-verified repos too,
persist the result — either a signed attestation from `api/verify-repo.js`
(HMAC/keypair, verifiable client-side) or a small Vercel KV record. No contract
change needed for either.
