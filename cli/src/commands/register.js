/* loxley register <repo> — the full flow:
     resolve repo → verify GitHub admin → collect details in the terminal →
     hand off to the browser for wallet signing → watch the chain for the result.

   The CLI never holds a key. Signing happens in the user's own wallet on
   /cli, and confirmation comes from reading the registry on-chain — so there's
   no localhost callback server and no CORS/mixed-content to get wrong. */

import * as p from "@clack/prompts";
import open from "open";
import { remoteConfig, SITE } from "../remote.js";
import { readConfig } from "../config.js";
import { parseRepoInput, getRepo } from "../github.js";
import { makeClient, findRepo } from "../chain.js";
import { recordVerification } from "../verify.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const suggestSymbol = (full) =>
  (full.split("/")[1] || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase();

const bail = (msg) => { p.cancel(msg); process.exit(1); };

export async function register(input, opts = {}) {
  p.intro("Loxley — register a repo");

  const full = parseRepoInput(input);
  if (!full) bail("Couldn't read that as a repo. Try a URL or owner/name.");

  const cfg = await remoteConfig();
  if (!/^0x[0-9a-fA-F]{40}$/.test(cfg.sherwoodAddress || "")) {
    bail("No Sherwood registry address available. Is /api/cli-config deployed?");
  }

  const { githubToken } = readConfig();
  if (!githubToken) bail("Not signed in. Run: loxley auth login");

  // 1. resolve + verify ownership in one call (permissions come from the token)
  const s = p.spinner();
  s.start(`Checking ${full} on GitHub`);
  const res = await getRepo(full, githubToken);
  if (res.status === "notfound") { s.stop("Not found"); bail(`No repo at github.com/${full} (or your account can't see it).`); }
  if (res.status === "ratelimited") { s.stop("Rate limited"); bail("GitHub rate-limited this token. Try again shortly."); }
  if (res.status !== "found") { s.stop("Failed"); bail("Couldn't reach GitHub."); }

  const repo = res.repo;
  s.stop(`${repo.fullName} — ★ ${repo.stars.toLocaleString("en-US")}${repo.language ? ` · ${repo.language}` : ""}`);

  if (!repo.isAdmin) {
    bail(`You don't have admin on ${repo.fullName} (you have: ${repo.permission}).\n  Only a repo admin can register it. Sign in as the owner: loxley auth login`);
  }
  p.log.success(`Ownership verified — you're an admin of ${repo.fullName}`);

  // 2. already registered?
  const s2 = p.spinner();
  s2.start("Checking the Sherwood registry");
  const client = makeClient(cfg);
  let existing = null;
  try {
    existing = await findRepo(client, cfg.sherwoodAddress, repo.fullName);
  } catch {
    s2.stop("Couldn't read the registry");
    bail(`RPC unreachable at ${cfg.rpcUrl}`);
  }
  if (existing) {
    s2.stop("Already registered");
    bail(`${repo.fullName} is already in the Quiver.\n  Arrow: ${existing.arrow}\n  ${SITE}/repo/${existing.index}`);
  }
  s2.stop("Not yet registered — good to go");

  // 3. details, in the terminal
  const details = await p.group(
    {
      symbol: () =>
        p.text({
          message: "Arrow ticker",
          placeholder: suggestSymbol(repo.fullName),
          initialValue: opts.symbol || suggestSymbol(repo.fullName),
          validate: (v) => (!v || !/^[A-Za-z0-9]{2,6}$/.test(v) ? "2–6 letters or digits." : undefined),
        }),
      supply: () =>
        p.text({
          message: "Initial supply",
          initialValue: String(opts.supply || 1000000),
          validate: (v) => (!/^\d+$/.test(v) || BigInt(v) <= 0n ? "Whole number greater than 0." : undefined),
        }),
      language: () =>
        p.text({
          message: "Language",
          initialValue: opts.language || repo.language || "TypeScript",
          validate: (v) => (!v ? "Required." : undefined),
        }),
    },
    { onCancel: () => bail("Cancelled.") }
  );

  const symbol = details.symbol.toUpperCase();
  const supply = details.supply;

  p.note(
    [
      `Repo      ${repo.fullName}`,
      `Arrow     $${symbol}`,
      `Supply    ${Number(supply).toLocaleString("en-US")}`,
      `Language  ${details.language}`,
      `Network   ${cfg.networkLabel} (${cfg.chainId})`,
      `Registry  ${cfg.sherwoodAddress}`,
    ].join("\n"),
    "Review"
  );

  const ok = await p.confirm({ message: `Register and mint ${Number(supply).toLocaleString("en-US")} $${symbol} to your wallet?` });
  if (p.isCancel(ok) || !ok) bail("Cancelled — nothing was sent.");

  // 4. hand off to the browser for wallet signing
  const url = new URL(`${SITE}/cli`);
  url.searchParams.set("repo", repo.fullName);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("supply", supply);
  url.searchParams.set("language", details.language);

  p.log.step("Opening your browser to connect a wallet and confirm the transaction…");
  p.log.message(url.toString());
  await open(url.toString()).catch(() => {
    p.log.warn("Couldn't open a browser automatically — paste the link above.");
  });

  // 5. watch the chain (source of truth) until it lands
  const s3 = p.spinner();
  s3.start("Waiting for the transaction to confirm on-chain");
  const deadline = Date.now() + 10 * 60 * 1000;
  let found = null;
  while (Date.now() < deadline) {
    await sleep(4000);
    try {
      found = await findRepo(client, cfg.sherwoodAddress, repo.fullName);
    } catch {
      /* transient RPC hiccup — keep waiting */
    }
    if (found) break;
  }

  if (!found) {
    s3.stop("Timed out");
    bail("Didn't see the registration on-chain within 10 minutes.\n  If you confirmed in your wallet, it may still land — check the Quiver.");
  }

  s3.stop("Registered");

  // Record ownership server-side so the Verified ✓ badge shows for everyone.
  const s4 = p.spinner();
  s4.start("Recording ownership for the Verified badge");
  const v = await recordVerification(repo.fullName, githubToken);
  if (v.verified) s4.stop("Verified ✓ — badge will show in the Quiver");
  else s4.stop(`Registered, but the badge wasn't recorded (${v.reason || "unknown"}). Retry: loxley verify ${repo.fullName}`);

  p.note(
    [
      `Arrow     ${found.arrow}`,
      `Owner     ${found.owner}`,
      `Explorer  ${cfg.explorer}/address/${found.arrow}`,
      `Quiver    ${SITE}/repo/${found.index}`,
    ].join("\n"),
    `${repo.fullName} is in the Quiver`
  );
  p.outro("Anyone can now pay tribute to your repo. 🏹");
}
