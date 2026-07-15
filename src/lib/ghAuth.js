/* ------------------------------------------------------------------
   GitHub OAuth ownership verification — frontend half.

   Proves the person registering a repo actually has ADMIN rights on it,
   by having them authorize a GitHub OAuth App. The token exchange needs
   the OAuth client *secret*, which must never ship in the browser bundle,
   so the exchange + permission check live in the /api/verify-repo
   serverless function (see api/verify-repo.js).

   Two modes, chosen by whether VITE_GITHUB_CLIENT_ID is set:
     • CONFIGURED (real): redirect to GitHub → callback → serverless check.
     • MOCK (unset): resolve "verified" inline with no redirect, so the whole
       flow is demoable in local dev before the OAuth App exists.

   This is a soft gate: Sherwood is permissionless, so someone could call the
   contract directly. What verification buys is the register-flow block + the
   Verified ✓ badge — the badge is what makes passing the check meaningful.
   ------------------------------------------------------------------ */

const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || "";
const SCOPE = import.meta.env.VITE_GITHUB_SCOPE || ""; // "" = public repos; "repo" also covers private

export const OAUTH_CONFIGURED = Boolean(CLIENT_ID);

const PENDING_KEY = "loxley:verify:pending";

/* random state token — defends the callback against stray/forged codes */
function randomState() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* Start verifying `owner/name`.
   • Mock mode: returns a resolved result object immediately (no redirect).
   • Real mode: stashes `stash` (form state to restore after the round-trip),
     redirects to GitHub, and returns null because the page is navigating away.
   Completion in real mode is handled by consumeCallback() on the next load. */
export async function startVerification({ owner, name, stash }) {
  if (!OAUTH_CONFIGURED) {
    return { verified: true, login: "mock-owner", permission: "admin", owner, name, mock: true };
  }
  const state = randomState();
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state, owner, name, stash }));

  const redirectUri = `${window.location.origin}${window.location.pathname}`;
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  if (SCOPE) url.searchParams.set("scope", SCOPE);
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "false");
  window.location.assign(url.toString());
  return null; // redirecting away
}

/* Call once on page load. If this load is a GitHub OAuth callback (?code&state),
   exchange the code via /api/verify-repo and return { result, stash }. Otherwise
   returns null. Always strips code/state from the URL so a refresh is clean. */
export async function consumeCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  if (!code) return null;

  let pending = null;
  try { pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null"); } catch { /* ignore */ }

  // scrub the code/state out of the address bar regardless of outcome
  const clean = new URL(window.location.href);
  clean.searchParams.delete("code");
  clean.searchParams.delete("state");
  window.history.replaceState({}, "", clean.toString());

  if (!pending || pending.state !== state) return null; // stray or forged callback
  sessionStorage.removeItem(PENDING_KEY);

  try {
    const res = await fetch("/api/verify-repo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, owner: pending.owner, name: pending.name }),
    });
    const data = await res.json();
    return { result: { ...data, owner: pending.owner, name: pending.name }, stash: pending.stash };
  } catch {
    return { result: { verified: false, reason: "network", owner: pending.owner, name: pending.name }, stash: pending.stash };
  }
}
