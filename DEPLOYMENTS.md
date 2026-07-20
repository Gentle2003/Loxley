# Deployments

## Robinhood Chain MAINNET (chain ID 4663) — live

| Contract | Address |
|----------|---------|
| **Sherwood** (registry + factory) | `0x9b9FA581bEF05Fe169763497fd7Fd2D307Fe91Ac` |

- RPC: `https://rpc.mainnet.chain.robinhood.com`
- Explorer: https://robinhoodchain.blockscout.com/address/0x9b9FA581bEF05Fe169763497fd7Fd2D307Fe91Ac
- Trading: Uniswap V2 (already deployed on 4663 — addresses in `src/lib/market.js`)
- Frontend targets mainnet via Vercel env vars (`VITE_CHAIN_ID=4663`, `VITE_SHERWOOD_ADDRESS`); see `MAINNET.md`.
- Arrow tokens are deployed by `registerRepo`, so they aren't listed here — read them from the registry.

> Unaudited. Not affiliated with Robinhood.

## Robinhood Chain testnet (chain ID 46630)

| Contract | Address |
|----------|---------|
| **Sherwood** (registry + factory) | `0x6dBF9E05dA71aF5ebd47Ad8a7F993838D9b9ac1B` |
| **Market** (per-Arrow AMM) | `0xDbbe868E4E478ae5736B76579fd47891f3CA77b1` |

Seed repos registered at deploy (each mints its own Arrow):

| Repo | Language | Arrow token |
|------|----------|-------------|
| octocat/hello-world | C | `0x80838590C5d4611b6510197cE2269C387D5e84aa` |
| your-org/your-lib | TypeScript | `0x2eE23593B5772B9798b5911cFd99280E78dF4331` |

- Explorer: https://explorer.testnet.chain.robinhood.com/address/0x6dBF9E05dA71aF5ebd47Ad8a7F993838D9b9ac1B
- **Frontend live mode:** set `VITE_SHERWOOD_ADDRESS` (registry) and `VITE_MARKET_ADDRESS` (AMM) as Vercel env vars, then redeploy.

> Testnet only · unaudited · not affiliated with Robinhood.
