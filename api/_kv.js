/* ------------------------------------------------------------------
   Minimal KV client for the verified-repos store — no SDK dependency.

   Talks the Upstash Redis REST API, which is what Vercel KV is built on.
   Reads whichever env-var pair your store injected:
     • Vercel KV:        KV_REST_API_URL      / KV_REST_API_TOKEN
     • Upstash (market): UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN

   All verified repos live in one Redis hash so the Quiver can read the whole
   set in a single call (HGETALL). Everything degrades to a no-op when no store
   is configured, so local/dev and un-provisioned deploys still work.
   ------------------------------------------------------------------ */

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const HASH = "loxley:verified";

export const KV_READY = Boolean(REST_URL && REST_TOKEN);

const norm = (owner, name) => `${owner}/${name}`.toLowerCase();

async function cmd(args) {
  const res = await fetch(REST_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`kv ${res.status}`);
  return (await res.json()).result;
}

/* Record a repo as owner-verified. `record` is stored as JSON. */
export async function setVerified(owner, name, record) {
  if (!KV_READY) return false;
  await cmd(["HSET", HASH, norm(owner, name), JSON.stringify(record)]);
  return true;
}

/* All verified repos as { "owner/name": record }. HGETALL returns a flat
   [field, value, field, value, …] array over the REST API. */
export async function getAllVerified() {
  if (!KV_READY) return {};
  const flat = await cmd(["HGETALL", HASH]);
  const out = {};
  if (Array.isArray(flat)) {
    for (let i = 0; i < flat.length; i += 2) {
      try { out[flat[i]] = JSON.parse(flat[i + 1]); } catch { out[flat[i]] = { verified: true }; }
    }
  }
  return out;
}
