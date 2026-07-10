# CLAUDE.md — Loxley

> This file is auto-loaded by Claude Code as project context. It's the single
> source of truth for what Loxley is, how it's built, and what to build next.

## 1. What Loxley is

Loxley turns an open-source GitHub repo into a **cashflow-generating asset**.
You register a repo → it mints a token (an **Arrow**) → anyone can pay **tribute**
to the repo in ETH → that tribute is split pro-rata to Arrow holders → holders
collect their **bounty** on-chain.

Tagline: *Open source, funded like Robin Hood.* The Robin Hood mythos is the brand
skin; the substance is per-repo dividend tokens.

### Vocabulary (use these names everywhere — UI, comments, commits)

| Term | Meaning | On-chain |
|------|---------|----------|
| **Sherwood** | the registry + factory (forest of all repos) | `Sherwood.sol` |
| **Arrow** | a repo's ERC-20 token | `Arrow.sol` |
| **Quiver** | the full set of registered repos | — |
| **Tribute** | funding a repo with ETH | `Arrow.tribute()` |
| **Bounty** | a holder's claimable ETH share | `Arrow.bounty()` |
| **$LOX** | eventual platform/governance token | **not built — do not create** |

## 2. Guardrails (read before building anything)

These are hard constraints, not preferences:

- **Testnet only.** Deploy to **Robinhood Chain testnet** (EVM-compatible Arbitrum
  L2, chain ID 46630, gas token ETH). Never mainnet in this MVP — the contracts are
  unaudited. (RH Chain mainnet is chain ID 4663; do not target it.)
- **No public token sale.** Do not build minting-for-sale, presale, ICO, or
  fundraising flows. Arrows are minted to the registrant; there is no sale.
- **Do not create a $LOX token contract.** It's branding only until deliberately
  designed later. If a task implies "launch the token," stop and flag it.
- **Honesty in the UI.** Keep the PROTOTYPE / testnet labeling. Never present
  simulated or testnet state as real value.
- **Securities reality.** A token representing a claim on cashflow is likely a
  security. Don't add features that push it toward an unregistered public offering.
- **Not audited.** Don't tell users the contracts are safe to hold real value.
- **Not affiliated with Robinhood.** Loxley deploys on Robinhood Chain (which is
  permissionless — no approval needed) but is an independent project. Never imply
  endorsement by, or affiliation with, Robinhood in the UI, brand, or copy.

## 3. Architecture

```
        GitHub repo
            │  registerRepo()
            ▼
   ┌──────────────────┐      deploys       ┌──────────────┐
   │  Sherwood.sol    │ ─────────────────▶ │  Arrow.sol   │  (one per repo)
   │  registry+factory│                    │  ERC-20 +    │
   └──────────────────┘                    │  tribute/    │
            │ emits RepoRegistered          │  bounty      │
            ▼                               └──────────────┘
   ┌──────────────────┐                            ▲
   │  Indexer (TODO)  │  reads events,             │ tribute()/bounty()
   │  + GitHub API    │  enriches w/ stars ────────┘
   └──────────────────┘
            │ serves
            ▼
   ┌──────────────────┐
   │  Frontend        │  wallet · quiver · register · tribute · bounty
   │  (index.html →   │
   │   real dapp)     │
   └──────────────────┘
```

## 4. On-chain interface (already implemented)

### Sherwood.sol
```solidity
function registerRepo(
  string repoFullName,   // "owner/name"
  string language,
  string arrowName,      // ERC-20 name
  string arrowSymbol,    // ERC-20 symbol
  uint256 initialSupply  // minted to msg.sender
) external returns (address arrow);

function repoCount() external view returns (uint256);
function isRegistered(string repoFullName) external view returns (bool);
function getRepos(uint256 offset, uint256 limit) external view returns (Repo[]);
// Repo { string repoFullName; string language; address arrow; address owner; uint64 registeredAt; }

event RepoRegistered(uint256 indexed id, string repoFullName, string language,
                     address indexed arrow, address indexed owner, uint64 registeredAt);
```

### Arrow.sol  (ERC-20, plus:)
```solidity
string  repoFullName; string language; address repoOwner; address sherwood;
uint256 totalTribute;

function tribute() external payable;                       // split ETH to holders
function bountyOf(address holder) external view returns (uint256);  // claimable now
function bounty() external;                                // collect your share

event TributePaid(address indexed from, uint256 amount);
event BountyCollected(address indexed holder, uint256 amount);
```

Distribution = magnified-dividend pattern; `tribute()` is O(1); transfers carry
unclaimed bounties via `_update`.

## 5. Wireframes

### 5a. Registry (main screen)
```
┌────────────────────────────────────────────────────────────────────┐
│ PROTOTYPE — simulated. No real chain / money. Mirrors Sherwood/Arrow │
├────────────────────────────────────────────────────────────────────┤
│ ⤢ LOXLEY                                   0xD9AA…87E5  [Connect]    │
│   Sherwood Registry                                                  │
├────────────────────────────────────────────────────────────────────┤
│  OPEN SOURCE, FUNDED LIKE ROBIN HOOD                                 │
│  Turn a repo into an Arrow that pays everyone who holds it.          │
│  ● code & Arrow actions    ● tribute & bounty (ETH)                  │
│                                                                      │
│  [ Search the quiver ....................... ] [Sort ▾] [+ Register] │
│                                                                      │
│  GITHUB            LANG     STARS   ARROW    TRIBUTE    REGISTERED    │
│  ─────────────────────────────────────────────────────────────────  │
│  ◯ maintainer/pars… Rust    6,212   $PARSE   Ξ2.4       3 days ago    │
│  ◯ acme/httpkit     Go        842   $HTTP    Ξ0.8       2 days ago    │
│  ◯ nadia/tinygrad…  Python    113   $TGU     —          1 day ago     │
│         (row click → opens Repo Detail drawer)                       │
└────────────────────────────────────────────────────────────────────┘
```

### 5b. Register drawer (slides in from right)
```
                              ┌───────────────────────────────┐
                              │ Register & mint an Arrow    ✕  │
                              │ Records repo in Sherwood and   │
                              │ mints full Arrow supply to you.│
                              │                                │
                              │ GitHub repo (owner/name)       │
                              │ [ your-org/your-lib .......... ]│
                              │ Language [Select ▾]  Symbol[__]│
                              │ Initial supply [ 1000000 ..... ]│
                              │                                │
                              │ [    Register & mint to me    ]│  → registerRepo()
                              └───────────────────────────────┘
```

### 5c. Repo detail drawer (tribute / bounty / stake)
```
                              ┌───────────────────────────────┐
                              │ ◯ acme/httpkit              ✕  │
                              │ $HTTP Arrow · Go · ★ 842        │
                              │ ┌────────────┬────────────┐    │
                              │ │Total tribute│Arrow supply│   │
                              │ │  Ξ0.8       │ 1,000,000  │   │
                              │ ├────────────┼────────────┤    │
                              │ │Your Arrows │Your bounty │    │
                              │ │  150,000   │  Ξ0.12     │    │
                              │ └────────────┴────────────┘    │
                              │ PAY TRIBUTE                     │
                              │ [ 0.5 ......... ] [ Pay tribute]│ → tribute()
                              │ COLLECT YOUR BOUNTY            │
                              │ [   Collect Ξ0.12            ] │ → bounty()
                              │ TAKE A STAKE (if not owner)   │
                              │ [ 100000 ...... ] [ Take stake]│ → (needs DEX; mock)
                              │ ARROW HOLDERS                  │
                              │  acme            850,000 (85%) │
                              │  0x7c3…a12 YOU   150,000 (15%) │
                              └───────────────────────────────┘
```

States to handle: wallet disconnected (actions prompt "Connect first"); empty
quiver (empty-state copy); bounty = 0 (hide collect card); owner viewing own repo
(hide "take a stake").

## 6. Core user flows

1. **Register:** connect wallet → `+ Register` → fill form → `registerRepo()` →
   repo appears in quiver, full Arrow supply to registrant.
2. **Tribute:** open repo → enter ETH → `tribute()` → `totalTribute` up, every
   holder's `bountyOf` rises pro-rata.
3. **Bounty:** holder opens repo → `Collect` → `bounty()` → ETH to wallet.
4. **Take a stake:** non-owner buys Arrows to become a holder (MVP moves balances;
   real version = DEX trade).

## 7. Status & roadmap (build order)

Done: `Sherwood.sol`, `Arrow.sol`, deploy script, in-memory prototype (`frontend/index.html`).

Missing 20%, in priority order:
1. **Repo-ownership proof** — anyone can register any repo string today (squatting
   hole). Require the GitHub owner to prove control (OAuth, or a signed gist) before
   `registerRepo`. Highest priority.
2. **Indexer** — service listening to `RepoRegistered`, enriching with GitHub
   stars/language, serving the frontend. Replaces mocked stars.
3. **Wire frontend → chain** — swap in-memory state for viem/wagmi reads/writes +
   real events. Keep the exact same UI/vocabulary.
4. **Market for Arrows** — DEX pool per Arrow so "take a stake" is a real trade.
5. **Tests + audit prep** — Foundry tests for tribute/bounty math and transfer
   corrections; then external review.

## 8. Stack & conventions

- Contracts: Solidity ^0.8.20, OpenZeppelin v5, Foundry. Deploy to Robinhood Chain
  testnet (chain ID 46630, EVM-compatible Arbitrum L2, gas token ETH).
- Frontend: React + Vite (scaffolded in `src/`, router in `App.jsx`). Chain is
  mocked during the design phase via `src/mocks/fakeChain.js` (ports the exact
  tribute/bounty math). Wire viem/wagmi at roadmap #3 — keep the flows/vocabulary.
  `frontend/index.html` is the original vanilla prototype, kept as UX reference.
- Design tokens — **Robinhood "Robin Neon" theme** (dark). Defined as CSS variables
  in `src/index.css`; change them there, not inline:
  - canvas near-black `--bg #050706`, panels `#0d130f`, hairlines `--line #1c2620`
  - **Robin Neon** `--green #ccff00` = primary brand + all code/Arrow actions;
    black text on neon buttons (`--on-neon #0b0f00`), mirroring the Robinhood logo
  - **cash-amber** `--cash #e8b73a` = ETH only (tribute/bounty figures)
  - text `--text #eaf2ec`, muted `--text-soft #9aa89f`; danger/down `--danger #ff5a4d`
  - Color stays semantic: **neon = code, amber = money — never mix them.**
  - Fonts: Space Grotesk (display), Inter (body), IBM Plex Mono (numbers/tickers/code).
- Commits: present-tense, scoped, e.g. `sherwood: add ownership proof to registerRepo`.

## 9. File map

```
contracts/Sherwood.sol     registry + factory
contracts/Arrow.sol        per-repo ERC-20 with tribute/bounty
script/Deploy.s.sol        Foundry deploy + seed
foundry.toml, remappings.txt, .env.example

src/                       React + Vite app (design + workflow phase)
  main.jsx, App.jsx        entry + router (/ /quiver /repo/:id /portfolio)
  index.css                Robin Neon theme tokens (see §8)
  components/              Nav, Footer, Logo, Reveal
  pages/                   Landing (done) · Quiver, RepoDetail, Portfolio (stubs)
  mocks/fakeChain.js       in-memory Sherwood+Arrow (tribute/bounty math + seed data)
index.html, vite.config.js, package.json
frontend/index.html        original vanilla prototype, kept as UX reference

README.md                  human-facing overview
CLAUDE.md                  this file
```
