# Loxley CLI

Register a GitHub repo as an on-chain **Arrow** on Robinhood Chain, from your terminal.

```bash
npm install -g loxley

loxley auth login                                  # GitHub device flow, once
loxley register https://github.com/acme/httpkit    # verify → details → sign
loxley quiver                                      # list the registry
```

## How it works

1. **`auth login`** uses GitHub's **Device Flow** — you paste a one-time code at
   `github.com/login/device`. No client secret lives in the CLI, and there's no
   local callback server. The token is stored at `~/.loxley/config.json` (mode `0600`).
2. **`register`** resolves the repo, then confirms you hold **admin** rights on it
   via the GitHub API. Non-admins are blocked — this is the anti-squatting gate.
3. Ticker, supply, and language are collected **in the terminal**.
4. For signing, the CLI opens **loxleyhood.xyz/cli** in your browser. You connect the
   wallet you already have and confirm the transaction there.
5. The CLI then **watches the registry on-chain** until the repo appears, and prints
   the Arrow address, explorer link, and Quiver URL.

### Why the browser hand-off

**No private key ever touches the CLI.** Signing happens in your own wallet, and
confirmation comes from reading the chain — so there's no key handling, no local
callback server, and no CORS to get wrong. You pay **network gas only**; Loxley
charges no registration fee.

## Configuration

The CLI fetches public config from `https://loxleyhood.xyz/api/cli-config`
(GitHub client id, chain id, RPC, registry address), so it follows the live
deployment automatically. Overrides for local/staging work:

| Env var | Purpose |
|---|---|
| `LOXLEY_SITE` | point at a different deployment (default `https://loxleyhood.xyz`) |
| `LOXLEY_GITHUB_CLIENT_ID` | override the OAuth App client id |
| `LOXLEY_RPC_URL` | override the RPC endpoint |
| `LOXLEY_SHERWOOD` | override the registry address |

## Requirements

- Node.js 18+
- An EVM wallet in your browser, on **Robinhood Chain** (chain `4663`)
- **Device Flow enabled** on the Loxley OAuth App
  (GitHub → Settings → Developer settings → OAuth Apps → *Enable Device Flow*)

## Commands

| Command | Description |
|---|---|
| `loxley auth login` | Sign in with GitHub |
| `loxley auth status` | Show the signed-in account |
| `loxley auth logout` | Remove local credentials |
| `loxley register <repo>` | Verify ownership, then register + mint the Arrow |
| `loxley quiver` | List repos in the Sherwood registry |

`register` accepts `--symbol`, `--supply`, and `--language` to preset the prompts.

> Unaudited. Not affiliated with Robinhood.
