#!/usr/bin/env node
import { Command } from "commander";
import { login, status, logout } from "../src/commands/auth.js";
import { register } from "../src/commands/register.js";
import { remoteConfig, SITE } from "../src/remote.js";
import { makeClient, readRepos } from "../src/chain.js";

const program = new Command();

program
  .name("loxley")
  .description("Register GitHub repos as on-chain Arrows on Robinhood Chain.")
  .version("0.1.0");

const auth = program.command("auth").description("Manage your GitHub sign-in");
auth.command("login").description("Sign in with GitHub (device flow)").action(login);
auth.command("status").description("Show who you're signed in as").action(status);
auth.command("logout").description("Remove local credentials").action(logout);

program
  .command("register")
  .argument("<repo>", "GitHub URL or owner/name")
  .description("Verify ownership, then register the repo and mint its Arrow")
  .option("-s, --symbol <ticker>", "Arrow ticker (skips the prompt default)")
  .option("-n, --supply <amount>", "initial supply")
  .option("-l, --language <language>", "primary language")
  .action(register);

program
  .command("quiver")
  .description("List the repos registered in Sherwood")
  .action(async () => {
    const cfg = await remoteConfig();
    const rows = await readRepos(makeClient(cfg), cfg.sherwoodAddress);
    if (!rows.length) return console.log("The Quiver is empty.");
    // same filter the web Quiver uses — hides malformed on-chain entries
    const VALID = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
    const shown = rows.map((r, i) => ({ ...r, i })).filter((r) => VALID.test(r.repoFullName));
    console.log(`${shown.length} repos on ${cfg.networkLabel}:\n`);
    shown.forEach((r) => console.log(`  ${String(r.i).padStart(3)}  ${r.repoFullName.padEnd(40)} ${r.arrow}`));
    const hidden = rows.length - shown.length;
    if (hidden > 0) console.log(`\n  (${hidden} malformed ${hidden === 1 ? "entry" : "entries"} hidden)`);
    console.log(`\n${SITE}/quiver`);
  });

program.parseAsync(process.argv).catch((e) => {
  console.error(e?.shortMessage || e?.message || e);
  process.exit(1);
});
