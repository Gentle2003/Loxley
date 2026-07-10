import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { seedRepos, ME, balanceOf, bountyOf } from "../mocks/fakeChain.js";
import {
  IS_LIVE, connectWallet, readQuiver, short,
  registerRepo as libRegisterRepo, tribute as libTribute, bounty as libBounty,
} from "../lib/sherwood.js";

/* ------------------------------------------------------------------
   ChainProvider — owns the quiver + wallet + write actions.
   Two implementations behind one identical context API:
     • MockChainProvider  — in-memory (design/workflow phase, default)
     • LiveChainProvider  — real viem calls to Sherwood/Arrow on RH testnet
   Which one runs is decided by IS_LIVE (VITE_SHERWOOD_ADDRESS set = live).
   Pages never know the difference.
   ------------------------------------------------------------------ */
const ChainContext = createContext(null);
export const useChain = () => useContext(ChainContext);

export function ChainProvider({ children }) {
  return IS_LIVE
    ? <LiveChainProvider>{children}</LiveChainProvider>
    : <MockChainProvider>{children}</MockChainProvider>;
}

/* ---- shared toast ---- */
function useToast() {
  const [toast, setToast] = useState("");
  const timer = useRef(null);
  const notify = useCallback((msg) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2800);
  }, []);
  return { toast, notify };
}
function Toaster({ toast }) {
  return (
    <>
      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
      <style>{`
        .toast { position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%) translateY(16px);
          opacity: 0; pointer-events: none; z-index: 90;
          background: #0e140f; border: 1px solid var(--line-hi); color: var(--text);
          padding: 12px 20px; border-radius: 12px; font-size: 14px; max-width: 90vw;
          box-shadow: 0 20px 50px -20px #000; transition: opacity .25s, transform .25s; }
        .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: auto; }
      `}</style>
    </>
  );
}

/* ================= MOCK (in-memory) ================= */
let nextId = Math.max(...seedRepos.map((r) => r.id)) + 1;

function MockChainProvider({ children }) {
  const [repos, setRepos] = useState(seedRepos);
  const [connected, setConnected] = useState(false);
  const { toast, notify } = useToast();

  const toggleWallet = useCallback(() => {
    setConnected((c) => {
      notify(c ? "Wallet disconnected" : `Connected ${ME}`);
      return !c;
    });
  }, [notify]);

  const requireWallet = useCallback(() => {
    if (!connected) { notify("Connect your wallet first."); return false; }
    return true;
  }, [connected, notify]);

  const registerRepo = useCallback(({ repoFullName, language, symbol, supply }) => {
    if (!connected) return notify("Connect your wallet first."), false;
    const repo = repoFullName.trim();
    const sym = (symbol || "").trim().toUpperCase();
    const s = parseInt(supply, 10) || 0;
    if (!repo.includes("/")) return notify("Use owner/name format."), false;
    if (!sym) return notify("Pick an Arrow symbol."), false;
    if (s <= 0) return notify("Supply must be greater than 0."), false;

    let clash = false;
    setRepos((prev) => {
      if (prev.some((r) => r.repoFullName.toLowerCase() === repo.toLowerCase())) { clash = true; return prev; }
      const newRepo = {
        id: nextId++, repoFullName: repo, language, stars: Math.floor(Math.random() * 40),
        owner: ME, symbol: sym, supply: s, registeredAt: Date.now(),
        holders: { [ME]: s }, cumTributePerShare: 0, corrections: {}, collected: {}, totalTribute: 0,
      };
      return [newRepo, ...prev];
    });
    if (clash) return notify("Already registered."), false;
    notify(`Registered ${repo} · ${s.toLocaleString("en-US")} $${sym} minted to you`);
    return true;
  }, [connected, notify]);

  const tribute = useCallback((id, ethAmount) => {
    if (!requireWallet()) return false;
    const amt = parseFloat(ethAmount);
    if (!amt || amt <= 0) return notify("Enter an ETH amount."), false;
    setRepos((prev) => prev.map((r) => {
      if (r.id !== id || r.supply <= 0) return r;
      return { ...r, cumTributePerShare: r.cumTributePerShare + amt / r.supply, totalTribute: r.totalTribute + amt };
    }));
    notify(`Paid Ξ${amt} tribute → split to holders`);
    return true;
  }, [requireWallet, notify]);

  const bounty = useCallback((id) => {
    if (!requireWallet()) return false;
    let got = 0;
    setRepos((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      got = bountyOf(r, ME);
      if (got <= 0) return r;
      return { ...r, collected: { ...r.collected, [ME]: (r.collected[ME] || 0) + got } };
    }));
    if (got <= 0) return notify("Nothing to collect."), false;
    notify(`Collected Ξ${Math.round(got * 1e6) / 1e6} bounty to your wallet`);
    return true;
  }, [requireWallet, notify]);

  const collectAll = useCallback(() => {
    if (!requireWallet()) return false;
    let total = 0;
    setRepos((prev) => prev.map((r) => {
      const b = bountyOf(r, ME);
      if (b <= 0) return r;
      total += b;
      return { ...r, collected: { ...r.collected, [ME]: (r.collected[ME] || 0) + b } };
    }));
    if (total <= 0) return notify("No bounty to collect."), false;
    notify(`Collected Ξ${Math.round(total * 1e6) / 1e6} across your positions`);
    return true;
  }, [requireWallet, notify]);

  const takeStake = useCallback((id, amount) => {
    if (!requireWallet()) return false;
    const amt = parseInt(amount, 10) || 0;
    if (amt <= 0) return notify("Enter an Arrow amount."), false;
    let ok = false;
    setRepos((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const seller = r.owner;
      if (balanceOf(r, seller) < amt) return r;
      ok = true;
      const delta = amt * r.cumTributePerShare;
      return {
        ...r,
        holders: { ...r.holders, [seller]: r.holders[seller] - amt, [ME]: (r.holders[ME] || 0) + amt },
        corrections: {
          ...r.corrections,
          [seller]: (r.corrections[seller] || 0) + delta,
          [ME]: (r.corrections[ME] || 0) - delta,
        },
      };
    }));
    if (!ok) return notify("Owner doesn't hold that many."), false;
    notify(`Took a stake of ${amt.toLocaleString("en-US")} Arrows`);
    return true;
  }, [requireWallet, notify]);

  const value = useMemo(() => ({
    repos, connected, me: ME, mode: "mock",
    toggleWallet, requireWallet, notify,
    registerRepo, tribute, bounty, takeStake, collectAll,
    getRepo: (id) => repos.find((r) => String(r.id) === String(id)),
  }), [repos, connected, toggleWallet, requireWallet, notify, registerRepo, tribute, bounty, takeStake, collectAll]);

  return <ChainContext.Provider value={value}><Toaster toast={toast} />{children}</ChainContext.Provider>;
}

/* ================= LIVE (viem → RH testnet) ================= */
function LiveChainProvider({ children }) {
  const [repos, setRepos] = useState([]);
  const [account, setAccount] = useState(null); // full 0x address
  const walletRef = useRef(null);
  const { toast, notify } = useToast();
  const connected = Boolean(account);
  const meKey = account ? short(account) : "";

  const refresh = useCallback(async (acct) => {
    try {
      const list = await readQuiver(acct || undefined, acct ? short(acct) : undefined);
      setRepos(list);
    } catch (e) {
      notify(e.shortMessage || e.message || "Couldn't read the quiver");
    }
  }, [notify]);

  useEffect(() => { refresh(null); }, [refresh]); // initial read, no wallet

  const toggleWallet = useCallback(async () => {
    if (connected) {
      walletRef.current = null;
      setAccount(null);
      notify("Wallet disconnected");
      refresh(null);
      return;
    }
    try {
      const { walletClient, account: acct } = await connectWallet();
      walletRef.current = walletClient;
      setAccount(acct);
      notify(`Connected ${short(acct)}`);
      refresh(acct);
    } catch (e) {
      notify(e.shortMessage || e.message || "Wallet connection failed");
    }
  }, [connected, notify, refresh]);

  const requireWallet = useCallback(() => {
    if (!account) { notify("Connect your wallet first."); return false; }
    return true;
  }, [account, notify]);

  const registerRepo = useCallback(async ({ repoFullName, language, symbol, supply }) => {
    if (!requireWallet()) return false;
    const repo = repoFullName.trim();
    const sym = (symbol || "").trim().toUpperCase();
    const s = parseInt(supply, 10) || 0;
    if (!repo.includes("/")) return notify("Use owner/name format."), false;
    if (!sym) return notify("Pick an Arrow symbol."), false;
    if (s <= 0) return notify("Supply must be greater than 0."), false;
    try {
      notify(`Registering ${repo}… confirm in your wallet`);
      await libRegisterRepo(walletRef.current, account, { repoFullName: repo, language, symbol: sym, supply: s });
      notify(`Registered ${repo} · ${s.toLocaleString("en-US")} $${sym} minted to you`);
      await refresh(account);
      return true;
    } catch (e) { notify(e.shortMessage || e.message || "Register failed"); return false; }
  }, [requireWallet, account, notify, refresh]);

  const tribute = useCallback(async (id, ethAmount) => {
    if (!requireWallet()) return false;
    const amt = parseFloat(ethAmount);
    if (!amt || amt <= 0) return notify("Enter an ETH amount."), false;
    const r = repos.find((x) => String(x.id) === String(id));
    if (!r) return false;
    try {
      notify(`Paying Ξ${amt} tribute… confirm in your wallet`);
      await libTribute(walletRef.current, account, r.arrow, amt);
      notify(`Paid Ξ${amt} tribute → split to holders`);
      await refresh(account);
      return true;
    } catch (e) { notify(e.shortMessage || e.message || "Tribute failed"); return false; }
  }, [requireWallet, account, notify, repos, refresh]);

  const bounty = useCallback(async (id) => {
    if (!requireWallet()) return false;
    const r = repos.find((x) => String(x.id) === String(id));
    if (!r) return false;
    try {
      notify("Collecting bounty… confirm in your wallet");
      await libBounty(walletRef.current, account, r.arrow);
      notify("Collected your bounty to your wallet");
      await refresh(account);
      return true;
    } catch (e) { notify(e.shortMessage || e.message || "Collect failed"); return false; }
  }, [requireWallet, account, notify, repos, refresh]);

  const collectAll = useCallback(async () => {
    if (!requireWallet()) return false;
    const claimable = repos.filter((r) => bountyOf(r, meKey) > 0);
    if (claimable.length === 0) return notify("No bounty to collect."), false;
    try {
      notify(`Collecting from ${claimable.length} position(s)…`);
      for (const r of claimable) await libBounty(walletRef.current, account, r.arrow);
      notify("Collected your bounties to your wallet");
      await refresh(account);
      return true;
    } catch (e) { notify(e.shortMessage || e.message || "Collect failed"); return false; }
  }, [requireWallet, account, notify, repos, meKey, refresh]);

  // Trading Arrows needs a DEX (roadmap #4) — no direct on-chain "buy" yet.
  const takeStake = useCallback(() => {
    notify("Trading Arrows isn't live yet — needs a DEX (roadmap #4).");
    return false;
  }, [notify]);

  const value = useMemo(() => ({
    repos, connected, me: meKey, mode: "live",
    toggleWallet, requireWallet, notify,
    registerRepo, tribute, bounty, takeStake, collectAll,
    getRepo: (id) => repos.find((r) => String(r.id) === String(id)),
  }), [repos, connected, meKey, toggleWallet, requireWallet, notify, registerRepo, tribute, bounty, takeStake, collectAll]);

  return <ChainContext.Provider value={value}><Toaster toast={toast} />{children}</ChainContext.Provider>;
}
