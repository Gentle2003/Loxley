import { createContext, useContext, useCallback, useMemo, useRef, useState } from "react";
import { seedRepos, ME, balanceOf, bountyOf } from "../mocks/fakeChain.js";

/* ------------------------------------------------------------------
   ChainProvider — the app's mock of Sherwood + Arrow state.
   One place that owns the quiver + wallet + the write actions
   (registerRepo / tribute / bounty / takeStake). Swap the bodies for
   viem/wagmi calls at roadmap #3; the component API stays the same.
   ------------------------------------------------------------------ */
const ChainContext = createContext(null);
export const useChain = () => useContext(ChainContext);

let nextId = Math.max(...seedRepos.map((r) => r.id)) + 1;

export function ChainProvider({ children }) {
  const [repos, setRepos] = useState(seedRepos);
  const [connected, setConnected] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const notify = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  }, []);

  const toggleWallet = useCallback(() => {
    setConnected((c) => {
      notify(c ? "Wallet disconnected" : `Connected ${ME}`);
      return !c;
    });
  }, [notify]);

  const requireWallet = useCallback(() => {
    if (!connected) {
      notify("Connect your wallet first.");
      return false;
    }
    return true;
  }, [connected, notify]);

  // ---- writes (mirror Sherwood.sol / Arrow.sol) ----

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
      if (prev.some((r) => r.repoFullName.toLowerCase() === repo.toLowerCase())) {
        clash = true;
        return prev;
      }
      const newRepo = {
        id: nextId++,
        repoFullName: repo,
        language,
        stars: Math.floor(Math.random() * 40),
        owner: ME,
        symbol: sym,
        supply: s,
        registeredAt: Date.now(),
        holders: { [ME]: s },
        cumTributePerShare: 0,
        corrections: {},
        collected: {},
        totalTribute: 0,
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
      // Mirror Arrow._update: shift the bounty correction with the Arrows so the
      // buyer only earns from tribute paid AFTER acquiring, not before.
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
    repos, connected, me: ME,
    toggleWallet, requireWallet, notify,
    registerRepo, tribute, bounty, takeStake, collectAll,
    getRepo: (id) => repos.find((r) => String(r.id) === String(id)),
  }), [repos, connected, toggleWallet, requireWallet, notify, registerRepo, tribute, bounty, takeStake, collectAll]);

  return (
    <ChainContext.Provider value={value}>
      {children}
      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
      <style>{`
        .toast { position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%) translateY(16px);
          opacity: 0; pointer-events: none; z-index: 90;
          background: #0e140f; border: 1px solid var(--line-hi); color: var(--text);
          padding: 12px 20px; border-radius: 12px; font-size: 14px; max-width: 90vw;
          box-shadow: 0 20px 50px -20px #000; transition: opacity .25s, transform .25s; }
        .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: auto; }
      `}</style>
    </ChainContext.Provider>
  );
}
