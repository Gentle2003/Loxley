/* Local CLI state: ~/.loxley/config.json, owner-readable only (0600).
   Holds the GitHub token from `loxley auth login`. Never logged, never
   sent anywhere except api.github.com. */

import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, chmodSync, rmSync } from "node:fs";

const DIR = join(homedir(), ".loxley");
export const CONFIG_PATH = join(DIR, "config.json");

export function readConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return {};
  }
}

export function writeConfig(patch) {
  mkdirSync(DIR, { recursive: true, mode: 0o700 });
  const next = { ...readConfig(), ...patch };
  writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), { mode: 0o600 });
  chmodSync(CONFIG_PATH, 0o600);
  return next;
}

export function clearConfig() {
  try {
    rmSync(CONFIG_PATH);
  } catch {
    /* already gone */
  }
}
