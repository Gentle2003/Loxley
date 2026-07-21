/* loxley verify <repo> — (re)record the Verified ✓ badge for a repo you own.
   Useful for repos registered before badge-recording existed, or to retry a
   badge write that failed. Requires `loxley auth login`. */

import * as p from "@clack/prompts";
import { readConfig } from "../config.js";
import { parseRepoInput, getRepo } from "../github.js";
import { recordVerification } from "../verify.js";

export async function verify(input) {
  p.intro("Loxley — verify ownership");

  const full = parseRepoInput(input);
  if (!full) { p.cancel("Couldn't read that as a repo. Try a URL or owner/name."); process.exit(1); }

  const { githubToken } = readConfig();
  if (!githubToken) { p.cancel("Not signed in. Run: loxley auth login"); process.exit(1); }

  const s = p.spinner();
  s.start(`Confirming your admin rights on ${full}`);
  const res = await getRepo(full, githubToken);
  if (res.status !== "found") { s.stop("Failed"); p.cancel(`Couldn't reach ${full} on GitHub (${res.status}).`); process.exit(1); }
  if (!res.repo.isAdmin) { s.stop("Not an admin"); p.cancel(`You don't have admin on ${res.repo.fullName}.`); process.exit(1); }
  s.stop(`You're an admin of ${res.repo.fullName}`);

  const s2 = p.spinner();
  s2.start("Recording the Verified badge");
  const v = await recordVerification(res.repo.fullName, githubToken);
  if (v.verified) { s2.stop("Verified ✓"); p.outro("The badge will show in the Quiver."); }
  else { s2.stop("Failed"); p.cancel(`Badge not recorded: ${v.reason || "unknown"}`); process.exit(1); }
}
