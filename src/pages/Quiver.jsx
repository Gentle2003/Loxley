import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChain } from "../store/ChainProvider.jsx";
import Drawer from "../components/Drawer.jsx";
import { fmt, eth, ago } from "../mocks/fakeChain.js";

const LANGS = ["TypeScript", "Python", "Go", "Rust", "C", "Solidity"];

const ghIcon = (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" style={{ flex: "none", opacity: 0.7 }}>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

export default function Quiver() {
  const { repos, connected, requireWallet, registerRepo } = useChain();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("new");
  const [open, setOpen] = useState(false);

  const list = useMemo(() => {
    const query = q.toLowerCase();
    return repos
      .filter((r) => !query ||
        r.repoFullName.toLowerCase().includes(query) ||
        r.language.toLowerCase().includes(query) ||
        r.symbol.toLowerCase().includes(query))
      .sort((a, b) =>
        sort === "funded" ? b.totalTribute - a.totalTribute
          : sort === "stars" ? b.stars - a.stars
            : b.id - a.id);
  }, [repos, q, sort]);

  const openRegister = () => { if (requireWallet()) setOpen(true); };

  return (
    <div className="wrap quiver">
      <header className="q-hero">
        <div>
          <p className="eyebrow">The Quiver</p>
          <h1>Every repo in the forest.</h1>
          <p className="q-lede">
            Search the quiver, fund a repo with tribute, or arm your own. {repos.length} repos registered.
          </p>
        </div>
      </header>

      <div className="q-toolbar">
        <div className="q-field grow">
          <label>Search the quiver</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="repo, owner, language, Arrow…" />
        </div>
        <div className="q-field">
          <label>Sort</label>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="new">Newest first</option>
            <option value="funded">Most tribute</option>
            <option value="stars">Most stars</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={openRegister}>+ Register repo</button>
      </div>

      <div className="card q-table">
        <div className="q-head mono">
          <span>Github</span><span>Language</span><span className="r">Stars</span>
          <span>Arrow</span><span className="r">Total tribute</span><span className="r">Registered</span>
        </div>
        {list.map((r) => (
          <div className="q-line" key={r.id} onClick={() => navigate(`/repo/${r.id}`)}>
            <span className="repo-name mono">{ghIcon}{r.repoFullName}</span>
            <span className="soft">{r.language}</span>
            <span className="r soft">★ {fmt(r.stars)}</span>
            <span className="sym">${r.symbol}</span>
            <span className={`r ${r.totalTribute ? "eth" : "mute"}`}>{r.totalTribute ? eth(r.totalTribute) : "—"}</span>
            <span className="r mute">{ago(r.registeredAt)}</span>
          </div>
        ))}
        {list.length === 0 && (
          <div className="q-empty">Nothing in the quiver matches. Clear the search, or register a repo.</div>
        )}
      </div>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Register & mint an Arrow"
        subtitle="Records the repo in Sherwood and mints its full Arrow supply to you. This is registerRepo()."
      >
        <RegisterForm
          onSubmit={(form) => { if (registerRepo(form)) setOpen(false); }}
          disabled={!connected}
        />
      </Drawer>

      <style>{styles}</style>
    </div>
  );
}

function RegisterForm({ onSubmit }) {
  const [repo, setRepo] = useState("");
  const [language, setLanguage] = useState(LANGS[0]);
  const [symbol, setSymbol] = useState("");
  const [supply, setSupply] = useState("1000000");

  return (
    <div className="reg">
      <div className="reg-field">
        <label>GitHub repo (owner/name)</label>
        <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="your-org/your-lib" />
      </div>
      <div className="reg-row">
        <div className="reg-field">
          <label>Language</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="reg-field">
          <label>Arrow symbol</label>
          <input value={symbol} maxLength={6} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="YLIB" />
        </div>
      </div>
      <div className="reg-field">
        <label>Initial supply</label>
        <input type="number" value={supply} onChange={(e) => setSupply(e.target.value)} />
      </div>
      <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}
        onClick={() => onSubmit({ repoFullName: repo, language, symbol, supply })}>
        Register &amp; mint to me
      </button>
      <p className="reg-note">
        Testnet only · no token sale · Arrows are minted to you, the registrant.
      </p>
    </div>
  );
}

const styles = `
.quiver { padding: 46px 24px 30px; }
.q-hero h1 { font-size: clamp(30px, 4.4vw, 44px); margin: 10px 0 10px; }
.q-lede { color: var(--text-soft); max-width: 60ch; }

.q-toolbar { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; margin: 30px 0 16px; }
.q-field { display: flex; flex-direction: column; gap: 6px; }
.q-field.grow { flex: 1; min-width: 220px; }
.q-field label { font-family: var(--font-mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--text-mute); }
.q-field input, .q-field select, .reg input, .reg select {
  font-family: var(--font-body); font-size: 14.5px; padding: 11px 13px;
  background: var(--panel); border: 1px solid var(--line-hi); border-radius: 10px; color: var(--text); }
.q-field input:focus, .q-field select:focus, .reg input:focus, .reg select:focus {
  outline: none; border-color: var(--green); box-shadow: 0 0 0 3px var(--green-dim); }

.q-table { overflow: hidden; }
.q-head, .q-line { display: grid; grid-template-columns: 2.4fr 1fr .9fr .9fr 1.1fr 1.1fr; align-items: center; gap: 12px; padding: 15px 20px; }
.q-head { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--text-mute); border-bottom: 1px solid var(--line); }
.q-line { border-bottom: 1px solid var(--line); cursor: pointer; transition: background .12s; }
.q-line:last-child { border-bottom: none; }
.q-line:hover { background: var(--panel-hi); }
.repo-name { display: inline-flex; align-items: center; gap: 9px; color: var(--text); font-size: 14.5px; }
.soft { color: var(--text-soft); }
.mute { color: var(--text-mute); }
.r { text-align: right; justify-self: end; white-space: nowrap; }
.q-empty { padding: 46px 20px; text-align: center; color: var(--text-mute); }

.reg { display: flex; flex-direction: column; gap: 15px; margin-top: 20px; }
.reg-field { display: flex; flex-direction: column; gap: 6px; }
.reg-row { display: flex; gap: 12px; }
.reg-row .reg-field { flex: 1; }
.reg-field label { font-family: var(--font-mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--text-mute); }
.reg-note { color: var(--text-mute); font-size: 12px; text-align: center; margin-top: 4px; }

@media (max-width: 760px) {
  .q-head, .q-line { grid-template-columns: 2fr 1fr 1fr; }
  .q-head span:nth-child(n+4), .q-line span:nth-child(n+4) { display: none; }
}
`;
