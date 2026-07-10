# Deployments

## Robinhood Chain testnet (chain ID 46630)

| Contract | Address |
|----------|---------|
| **Sherwood** (registry + factory) | `0x6dBF9E05dA71aF5ebd47Ad8a7F993838D9b9ac1B` |

Seed repos registered at deploy (each mints its own Arrow):

| Repo | Language | Arrow token |
|------|----------|-------------|
| octocat/hello-world | C | `0x80838590C5d4611b6510197cE2269C387D5e84aa` |
| your-org/your-lib | TypeScript | `0x2eE23593B5772B9798b5911cFd99280E78dF4331` |

- Explorer: https://explorer.testnet.chain.robinhood.com/address/0x6dBF9E05dA71aF5ebd47Ad8a7F993838D9b9ac1B
- **Frontend live mode:** set `VITE_SHERWOOD_ADDRESS` to the Sherwood address (Vercel env var), then redeploy.

> Testnet only · unaudited · not affiliated with Robinhood.
