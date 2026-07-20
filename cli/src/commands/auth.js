/* loxley auth login | status | logout — GitHub Device Flow. */

import * as p from "@clack/prompts";
import open from "open";
import { remoteConfig } from "../remote.js";
import { readConfig, writeConfig, clearConfig, CONFIG_PATH } from "../config.js";
import { requestDeviceCode, pollForToken, whoami } from "../github.js";

export async function login() {
  p.intro("Loxley — GitHub sign in");
  const cfg = await remoteConfig();
  if (!cfg.githubClientId) {
    p.cancel(
      "No GitHub client id configured.\n  Set LOXLEY_GITHUB_CLIENT_ID, or make sure /api/cli-config is deployed."
    );
    process.exit(1);
  }

  const s = p.spinner();
  s.start("Requesting a device code from GitHub");
  let dev;
  try {
    dev = await requestDeviceCode(cfg.githubClientId);
  } catch (e) {
    s.stop("Failed");
    p.cancel(e.message);
    process.exit(1);
  }
  s.stop("Device code ready");

  p.note(`${dev.user_code}\n\n${dev.verification_uri}`, "Copy this one-time code");
  const go = await p.confirm({ message: "Open GitHub in your browser now?", initialValue: true });
  if (!p.isCancel(go) && go) await open(dev.verification_uri).catch(() => {});

  const s2 = p.spinner();
  s2.start("Waiting for you to authorize in the browser");
  let token;
  try {
    token = await pollForToken(cfg.githubClientId, dev.device_code, dev.interval, dev.expires_in);
  } catch (e) {
    s2.stop("Not authorized");
    p.cancel(e.message);
    process.exit(1);
  }
  const login = await whoami(token);
  s2.stop(`Authenticated as @${login || "unknown"}`);

  writeConfig({ githubToken: token, githubLogin: login });
  p.outro(`Saved to ${CONFIG_PATH} (0600). You're ready: loxley register <repo>`);
}

export async function status() {
  const { githubToken, githubLogin } = readConfig();
  if (!githubToken) {
    console.log("Not signed in. Run: loxley auth login");
    process.exit(1);
  }
  const login = await whoami(githubToken);
  if (!login) {
    console.log("Stored token is no longer valid. Run: loxley auth login");
    process.exit(1);
  }
  console.log(`Signed in as @${login}${login !== githubLogin ? " (updated)" : ""}`);
}

export async function logout() {
  clearConfig();
  console.log("Signed out — local credentials removed.");
}
