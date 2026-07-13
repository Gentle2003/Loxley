# Mainnet launch runbook (precise)

> **Precondition:** a security audit of `contracts/Sherwood.sol` + `contracts/Arrow.sol`
> is complete and all findings are fixed + re-tested. (Trading uses Uniswap, which is
> already audited — nothing custom there.) A securities/legal review of the token model
> is also strongly advised before soliciting real money.

Trading is **Uniswap V2**, already deployed on Robinhood Chain mainnet — its addresses
are hardcoded in `src/lib/market.js` for chain **4663**. So **no buy/sell code changes**
are needed. Going live = deploy `Sherwood`, then flip env vars.

---

## 0. Facts you'll need
- **Mainnet chain ID:** `4663`
- **Mainnet RPC:** `https://rpc.mainnet.chain.robinhood.com`
- **Explorer:** `https://robinhoodchain.blockscout.com`
- **Uniswap V2 (already deployed, in code):** router `0x89e5DB8B5aA49aA85AC63f691524311AEB649eba`, factory `0x8bcEaA40B9AcdfAedF85AdF4FF01F5Ad6517937f`, WETH `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73`

## 1. Fresh deployer wallet
- Generate a **new** wallet, fund it with a little real ETH for gas.
- ⚠️ **Do NOT reuse the testnet key** in `.env` — it was exposed during development.

## 2. Finalize contracts
```bash
cd ~/Loxley
# apply audit fixes to contracts/Sherwood.sol + contracts/Arrow.sol first
forge build
forge test                     # green (incl. the Uniswap fork test)
```
If you changed the contracts, refresh the frontend ABIs: re-run `forge build`, then copy
the `abi` fields from `out/Sherwood.sol/Sherwood.json` and `out/Arrow.sol/Arrow.json`
into `src/lib/abis.js` (`sherwoodAbi` / `arrowAbi`).

## 3. (Optional) clean registry
`script/Deploy.s.sol` seeds two demo repos (`octocat/hello-world`, `your-org/your-lib`).
For a clean mainnet registry, open it and **delete the two `sherwood.registerRepo(...)`
seed blocks**, leaving only `new Sherwood()` + the `console.log`.

## 4. Deploy Sherwood to mainnet
Set `~/Loxley/.env`:
```
PRIVATE_KEY=0x<fresh mainnet deployer key>
```
Deploy (Foundry auto-loads `.env` for the key):
```bash
forge script script/Deploy.s.sol \
  --rpc-url https://rpc.mainnet.chain.robinhood.com \
  --broadcast -vvvv
```
- **Copy the printed `Sherwood ... deployed at: 0x…` address.** (Also saved in
  `broadcast/Deploy.s.sol/4663/run-latest.json`.)
- Arrow tokens are deployed automatically by `registerRepo` later — nothing else to deploy.
- (Optional) verify on Blockscout via `forge verify-contract`.

## 5. Point the frontend at mainnet — Vercel env vars (no code changes)
In Vercel → your project → **Settings → Environment Variables**, set (Production):

| Var | Value |
|-----|-------|
| `VITE_CHAIN_ID` | `4663` |
| `VITE_CHAIN_RPC` | `https://rpc.mainnet.chain.robinhood.com` |
| `VITE_CHAIN_EXPLORER` | `https://robinhoodchain.blockscout.com` |
| `VITE_SHERWOOD_ADDRESS` | the mainnet Sherwood address from step 4 |
| `VITE_NETWORK_LABEL` | `Robinhood Chain` |
| `VITE_CONTRACT_ADDRESS` | your launch CA for the footer (optional) |

Then **Deployments → Redeploy** (env vars only apply on a fresh build).

➡️ The instant `VITE_CHAIN_ID=4663`, the app sees Uniswap is available and **buy/sell +
price/mcap turn on automatically**. No buy/sell code is touched.

## 6. Seed liquidity so repos are tradeable
An Arrow isn't tradeable until it has a Uniswap pool. For each repo:
- Connect the **owner** wallet on the site → open the repo → **Market → "Seed the market"**
  → enter ETH + Arrows → confirm (approve + addLiquidityETH). The first seed sets the
  starting price.
- (Or add liquidity directly on the Uniswap app for the Arrow/WETH pair.)

## 7. Smoke test with small amounts
- Load the site → confirm the quiver reads mainnet.
- Register a repo (real tx) → seed a small pool → buy a little → sell a little.
- Watch the first pools/txs closely.

---

## What does NOT change on launch day
- Buy/sell/pool code (`src/lib/market.js`) — Uniswap addresses for 4663 are already in it.
- The chain config code (`src/lib/rhChain.js`) — it reads the env vars above.
- Any React components.

You touch: **contracts (deploy Sherwood) + `.env` (deployer key) + Vercel env vars.** That's it.
