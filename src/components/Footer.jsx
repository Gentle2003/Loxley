import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";

// The contract address shown in the footer. Set VITE_CONTRACT_ADDRESS at launch;
// falls back to the registry address, or "Coming soon" if neither is set.
const CA = import.meta.env.VITE_CONTRACT_ADDRESS || import.meta.env.VITE_SHERWOOD_ADDRESS || "";
const X_URL = import.meta.env.VITE_X_URL || "https://x.com/"; // TODO: set the Loxley X handle
const NETWORK = import.meta.env.VITE_NETWORK_LABEL || "Robinhood Chain testnet";

export default function Footer() {
  const [copied, setCopied] = useState(false);
  const shortCA = CA ? `${CA.slice(0, 10)}…${CA.slice(-8)}` : "Coming soon";
  const copy = () => {
    if (!CA || !navigator.clipboard) return;
    navigator.clipboard.writeText(CA).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <footer className="foot">
      <div className="wrap foot-top">
        <Link to="/" className="foot-brand">
          <Logo size={30} />
          <div>
            <div className="foot-word">LOXLEY</div>
            <div className="foot-tag">Open source, funded like Robin Hood.</div>
          </div>
        </Link>
        <nav className="foot-nav">
          <Link to="/quiver">Quiver</Link>
          <Link to="/portfolio">Portfolio</Link>
          <a href="/#how">How it works</a>
          <a href="/#lore">Lore</a>
        </nav>
      </div>

      <div className="wrap foot-mid">
        <div className="foot-ca">
          <div className="foot-k">Contract · {NETWORK}</div>
          <button className="foot-ca-btn" onClick={copy} disabled={!CA} title={CA || "Not deployed yet"}>
            <span className="mono">{shortCA}</span>
            {CA && <span className="foot-copy">{copied ? "Copied ✓" : "Copy"}</span>}
          </button>
        </div>

        <div className="foot-social">
          <div className="foot-k">Follow</div>
          <a className="foot-x" href={X_URL} target="_blank" rel="noreferrer" aria-label="Loxley on X">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>X</span>
          </a>
        </div>
      </div>

      <div className="wrap foot-fine">
        Unaudited · not financial advice · not affiliated with Robinhood · {NETWORK}.
      </div>

      <style>{`
        .foot { border-top: 1px solid var(--line); margin-top: 40px; padding: 42px 0 28px;
          background: linear-gradient(180deg, transparent, rgba(204, 255, 0, 0.05)); }
        .foot-top { display: flex; justify-content: space-between; align-items: center; gap: 30px; flex-wrap: wrap; }
        .foot-brand { display: flex; gap: 12px; align-items: center; }
        .foot-word { font-family: var(--font-display); font-weight: 700; letter-spacing: .06em; }
        .foot-tag { color: var(--text-soft); font-size: 13.5px; }
        .foot-nav { display: flex; gap: 24px; flex-wrap: wrap; }
        .foot-nav a { color: var(--text-soft); font-size: 14px; }
        .foot-nav a:hover { color: var(--green); }

        .foot-mid { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px;
          margin-top: 30px; padding-top: 26px; border-top: 1px solid var(--line); flex-wrap: wrap; }
        .foot-k { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase;
          color: var(--text-mute); margin-bottom: 9px; }
        .foot-ca-btn { display: inline-flex; align-items: center; gap: 12px; cursor: pointer;
          background: var(--panel); border: 1px solid var(--line-hi); border-radius: 10px; padding: 10px 14px;
          color: var(--text); font-size: 13.5px; transition: border-color .15s; }
        .foot-ca-btn:hover:not(:disabled) { border-color: var(--green); }
        .foot-ca-btn:disabled { cursor: default; color: var(--text-mute); }
        .foot-copy { font-family: var(--font-mono); font-size: 11px; color: var(--green);
          border-left: 1px solid var(--line-hi); padding-left: 12px; }

        .foot-x { display: inline-flex; align-items: center; gap: 8px; color: var(--text);
          background: var(--panel); border: 1px solid var(--line-hi); border-radius: 10px; padding: 10px 15px;
          font-size: 14px; font-weight: 600; transition: border-color .15s, color .15s; }
        .foot-x:hover { border-color: var(--green); color: var(--green); }

        .foot-fine { margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--line);
          color: var(--text-mute); font-size: 12.5px; }
        @media (max-width: 560px) { .foot-mid { flex-direction: column; align-items: flex-start; } }
      `}</style>
    </footer>
  );
}
