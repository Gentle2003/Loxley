# Mainnet migration runbook

> ⚠️ **Do not start this until BOTH are true:**
> 1. A **security audit** of `contracts/*.sol` is complete and every finding is fixed + re-tested.
> 2. You've had a **securities/legal review** of the token model.
>
> The contracts custody real ETH, and a tradeable cashflow token is very likely a
> security. This runbook is only the *mechanics* — the two gates above are what make
> going to mainnet safe and legal. Everything below assumes they're done.

---

## 0. Target network — Robinhood Chain mainnet
- **Chain ID:** `4663`
- **RPC:** `https://rpc.mainnet.chain.robinhood.com`
- **Explorer:** `https://robinhoodchain.blockscout.com`
- **Gas token:** ETH (real)

## 1. Deployer wallet
- Use a **fresh** wallet funded with a small amount of real ETH for gas.
- ⚠️ **Do NOT reuse the testnet deployer key** from development — it was exposed during the build. Generate a new key; keep it in `.env` only (gitignored). Never commit it.

## 2. Finalize + test the contracts
```bash
forge build
forge test        # all green
```
Apply any audit fixes to `contracts/*.sol` first, then re-run. If fixes were material, have the auditor re-check the diff.

## 3. Deploy the contracts to mainnet
`.env`:
```
PRIVATE_KEY=0x<fresh mainnet deployer key>
RH_MAINNET_RPC=https://rpc.mainnet.chain.robinhood.com
```
Deploy (consider removing the demo seed repos from `script/Deploy.s.sol` for a clean registry):
```bash
forge script script/Deploy.s.sol --rpc-url $RH_MAINNET_RPC --broadcast -vvvv
# Market: only if NOT moving to an audited DEX (see "Recommended" below)
forge script script/DeployMarket.s.sol --rpc-url $RH_MAINNET_RPC --broadcast -vvvv
```
- **Record the new mainnet addresses** (Sherwood, Market).
- **Verify** the contracts on Blockscout.

## 4. Point the frontend at mainnet
- Edit `src/lib/rhChain.js`: chain id `46630` → `4663`, RPC + explorer → mainnet.
  *(This can be made env-driven so it's zero code changes — ask and I'll parametrize it.)*
- Commit + push.

## 5. Update Vercel env vars (Settings → Environment Variables → Redeploy)
| Var | Set to |
|-----|--------|
| `VITE_SHERWOOD_ADDRESS` | new mainnet Sherwood |
| `VITE_MARKET_ADDRESS` | new mainnet Market (or remove if using Uniswap) |
| `VITE_RH_TESTNET_RPC` | the mainnet RPC (or a renamed mainnet var) |
| `VITE_NETWORK_LABEL` | `Robinhood Chain` |
| `VITE_CONTRACT_ADDRESS` | your launch CA (footer) |

Then **Redeploy** (env vars only take effect on a fresh build).

## 6. Disclaimers — keep it honest
- Update the network label.
- **Keep** "not financial advice · not affiliated with Robinhood."
- Only change **"Unaudited"** once the audit is genuinely complete — better still, show **"Audited by \<firm\>"** with a link to the report, and keep a plain risk disclaimer. Never present it as risk-free.

## 7. Smoke test on mainnet
- Load the site; confirm it reads the mainnet contracts (quiver populates, price/mcap show).
- Do **one small real transaction** (register / tribute / buy) with minimal ETH; confirm it lands.
- Watch the first pools/txs closely.

---

## Strongly recommended before any of this
Replace the custom `Market.sol` AMM with an **already-audited DEX (Uniswap)**: Arrows are
standard ERC-20s, so they can trade on Uniswap pools. This removes the riskiest custom,
ETH-holding contract and shrinks the audit to the smallest surface (`Sherwood` + `Arrow`'s
tribute/bounty logic). **First confirm an audited DEX is actually deployed on Robinhood
Chain mainnet** — if it isn't, that's a reason to wait.

## What I can do when the gates are met
Once you have the audit + legal sign-off, my part is minutes: apply any audit fixes,
switch `src/lib/rhChain.js` (or flip env vars if parametrized), and walk the Vercel
config with you. I will not do it before those gates — see CLAUDE.md guardrails.
