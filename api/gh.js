/* ------------------------------------------------------------------
   /api/gh — authenticated GitHub read proxy.

   The browser calling api.github.com directly is unauthenticated: 60 req/hr
   PER IP. This proxy calls GitHub with a token (5,000 req/hr) and edge-caches
   the responses, so repeated views of the same repo collapse into ~one upstream
   call per cache window — GitHub usage scales with unique repos, not traffic.

   Usage:
     GET /api/gh?repo=owner/name           -> compact repo metadata (JSON)
     GET /api/gh?repo=owner/name&path=FILE -> raw file contents (text/plain)

   Env: GITHUB_TOKEN — fine-grained PAT, read-only, public repos (server-only,
   never VITE_). Absent = still proxies + caches, just unauthenticated (the
   caching alone already cuts calls sharply).
   ------------------------------------------------------------------ */

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const VALID_REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function ghHeaders(accept) {
  const h = {
    Accept: accept,
    "User-Agent": "loxley-gh-proxy",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "method" });

  const repo = String(req.query.repo || "");
  const path = req.query.path ? String(req.query.path) : "";
  if (!VALID_REPO.test(repo)) return res.status(400).json({ error: "bad repo" });
  if (path && (path.includes("..") || path.startsWith("/") || path.includes(":"))) {
    return res.status(400).json({ error: "bad path" });
  }

  try {
    if (path) {
      // raw file contents (e.g. the loxley-verify.txt ownership proof)
      const r = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        headers: ghHeaders("application/vnd.github.raw+json"),
      });
      if (r.status === 404) {
        res.setHeader("Cache-Control", "public, s-maxage=60");
        return res.status(404).json({ error: "notfound" });
      }
      if (!r.ok) return res.status(r.status).json({ error: "github", status: r.status });
      const text = await r.text();
      res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).send(text);
    }

    // repo metadata
    const r = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: ghHeaders("application/vnd.github+json"),
    });
    if (r.status === 404) {
      res.setHeader("Cache-Control", "public, s-maxage=60");
      return res.status(404).json({ error: "notfound" });
    }
    if (!r.ok) return res.status(r.status).json({ error: "github", status: r.status });
    const d = await r.json();
    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=3600");
    return res.status(200).json({
      fullName: d.full_name,
      stars: d.stargazers_count ?? 0,
      description: d.description || "",
      language: d.language || "",
      htmlUrl: d.html_url,
      openIssues: d.open_issues_count ?? 0,
      pushedAt: d.pushed_at || null,
    });
  } catch {
    return res.status(502).json({ error: "proxy" });
  }
}
