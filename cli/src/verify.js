/* Record an owner-verification so the repo gets the Verified ✓ badge.

   The CLI proves ownership locally (device-flow token → permissions.admin),
   but the badge is shown to *everyone*, so the fact has to live server-side.
   We hand the token to /api/verify-repo, which RE-CHECKS admin against GitHub
   itself and only then writes to the KV store — the server never trusts a
   client claiming to be verified. */

import { SITE } from "./remote.js";

export async function recordVerification(fullName, token) {
  const [owner, name] = fullName.split("/");
  try {
    const r = await fetch(`${SITE}/api/verify-repo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ owner, name, token }),
    });
    if (!r.ok) return { verified: false, reason: `http ${r.status}` };
    return await r.json();
  } catch (e) {
    return { verified: false, reason: e?.message || "network" };
  }
}
