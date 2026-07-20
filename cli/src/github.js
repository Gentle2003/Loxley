/* GitHub: OAuth Device Flow (the CLI-native auth grant — no client secret,
   no redirect, no local callback server) plus the repo reads we need.

   Device Flow must be enabled on the OAuth App:
   GitHub → Settings → Developer settings → OAuth Apps → your app →
   "Enable Device Flow". */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GH = (token, accept = "application/vnd.github+json") => ({
  Accept: accept,
  "User-Agent": "loxley-cli",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

/* Parse a GitHub URL / git@ SSH / owner/name into "owner/name". */
export function parseRepoInput(input) {
  if (!input) return null;
  let s = String(input).trim();
  s = s.replace(/^git@github\.com:/i, "");
  s = s.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/^github\.com\//i, "");
  s = s.split(/[?#]/)[0].replace(/\.git$/i, "").replace(/\/+$/, "");
  const parts = s.split("/").filter(Boolean);
  if (parts.length < 2 || !parts[0] || !parts[1]) return null;
  return `${parts[0]}/${parts[1]}`;
}

/* Step 1 — ask GitHub for a device + user code. */
export async function requestDeviceCode(clientId, scope = "") {
  const r = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, scope }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.device_code) {
    throw new Error(
      d.error_description ||
        "Couldn't start GitHub device login. Is 'Enable Device Flow' ticked on the OAuth App?"
    );
  }
  return d; // { device_code, user_code, verification_uri, interval, expires_in }
}

/* Step 2 — poll until the user authorizes in their browser. */
export async function pollForToken(clientId, deviceCode, intervalSec = 5, expiresIn = 900) {
  const deadline = Date.now() + expiresIn * 1000;
  let interval = Math.max(intervalSec, 1);
  while (Date.now() < deadline) {
    await sleep(interval * 1000);
    const r = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (d.access_token) return d.access_token;
    if (d.error === "authorization_pending") continue;
    if (d.error === "slow_down") { interval += 5; continue; }
    if (d.error === "expired_token") break;
    if (d.error === "access_denied") throw new Error("Authorization was denied in the browser.");
    if (d.error) throw new Error(d.error_description || d.error);
  }
  throw new Error("The device code expired. Run `loxley auth login` again.");
}

export async function whoami(token) {
  const r = await fetch("https://api.github.com/user", { headers: GH(token) });
  if (!r.ok) return null;
  const d = await r.json();
  return d.login || null;
}

/* Repo metadata. With a token, `permissions` reflects the caller's access. */
export async function getRepo(fullName, token) {
  const r = await fetch(`https://api.github.com/repos/${fullName}`, { headers: GH(token) });
  if (r.status === 404) return { status: "notfound" };
  if (r.status === 403) return { status: "ratelimited" };
  if (!r.ok) return { status: "error" };
  const d = await r.json();
  return {
    status: "found",
    repo: {
      fullName: d.full_name,
      description: d.description || "",
      language: d.language || "",
      stars: d.stargazers_count ?? 0,
      isAdmin: Boolean(d.permissions?.admin),
      permission: d.permissions?.admin ? "admin" : d.permissions?.push ? "push" : "read",
    },
  };
}
