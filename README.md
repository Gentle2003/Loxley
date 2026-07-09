# Loxley — tokenized open-source repos

*Open source, funded like Robin Hood.*

An ~80% MVP of a registry where an open-source repo becomes a **cashflow-generating
asset**. You register a repo, it mints an **Arrow** (its token), anyone can pay
**tribute** to the repo in ETH, and that tribute is split pro-rata to Arrow holders,
who collect their **bounty** on-chain.

The vocabulary maps to the mythos:

| Loxley term | What it is |
|-------------|------------|
| **Sherwood** | the registry + factory (the forest of all repos) |
| **Arrow** | a repo's ERC-20 token |
| **Quiver** | the full collection of registered repos |
| **Tribute** | funding a repo with ETH (`tribute()`) |
| **Bounty** | a holder's claimable share (`bounty()`) |
| **$LOX** | the eventual platform/governance token — **not built yet** |

This is early alpha. It is **not audited** and is for **testnet only**. Don't sell
Arrows (or a $LOX token) to the public for real money on the strength of this — the
utility is real but partial, and should be represented as exactly that.

## What's here

```
contracts/
  Sherwood.sol   registry + factory: registerRepo() records a repo and mints its Arrow
  Arrow.sol      ERC-20 per repo with pull-based pro-rata tribute (tribute / bounty)
script/
  Deploy.s.sol   Foundry deploy + optional seed data
frontend/
  index.html     clickable prototype of the whole flow (open it in a browser)
foundry.toml, remappings.txt, .env.example
```

## See it work now (no setup)

Open `frontend/index.html` in any browser. It simulates the full lifecycle in-memory —
connect a (fake) wallet, search the quiver, register + mint an Arrow, pay tribute,
take a stake in someone else's repo, and collect a bounty. The tribute/bounty math is
the same shape as `Arrow.sol`, so it behaves like the real contract. It's labeled a
prototype because that's what it is: no chain, no money.

## The mechanic (how the cashflow works)

`Arrow` uses the standard magnified-dividend pattern so tribute is O(1) no matter how
many holders exist:

- `tribute()` (payable): `cumulativeTributePerShare += msg.value / totalSupply`
- each holder's entitlement = `balance * cumulativeTributePerShare − alreadyCollected`
- `bounty()`: withdraw your entitlement; Arrow transfers carry unclaimed bounties correctly

That's the whole idea in ~40 lines: a repo becomes something money flows into, and
Arrow holders have a real on-chain claim on it proportional to what they hold.

## Deploy to Base Sepolia

Prereqs: [Foundry](https://book.getfoundry.sh/), a funded Base Sepolia test wallet
([faucet](https://docs.base.org/tools/network-faucets)).

```bash
forge init --force --no-git .              # if starting a fresh forge project here
forge install OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std
cp .env.example .env                       # fill in PRIVATE_KEY + RPC, never commit it
source .env
forge build
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast -vvvv
```

Take the deployed `Sherwood` address and point a frontend at it (wagmi/viem or ethers).
Wire the demo's buttons to real `registerRepo` / `tribute` / `bounty` calls.

## What's the missing ~20% (to go from demo to real)

1. **Frontend ↔ chain wiring.** The prototype uses in-memory state; swap it for real
   contract reads/writes and event indexing.
2. **The indexer.** Listen for `RepoRegistered` and enrich each entry with GitHub
   stars/language via the GitHub API. Not built here.
3. **A market.** No price or trading yet — no AMM/order book to buy/sell Arrows. The
   demo's "take a stake" just moves balances. Real trading needs a DEX pool per Arrow.
4. **Ownership proof.** Anyone can register any repo string. A real version needs the
   repo owner to prove control (GitHub OAuth / gist-signature) before minting an Arrow,
   or you'll get squatting.
5. **Security + audit.** Contracts are unaudited. Don't hold real value in them.
6. **Legal.** An Arrow (or $LOX) representing a claim on cashflow is very likely a
   security in most places. Get real legal advice before any public sale. This repo is
   not that advice.

## Notes

Business idea and mechanics are independently reimplemented from the public Free Code
Fund concept. This does not copy their code, branding, or content.
