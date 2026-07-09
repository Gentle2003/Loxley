import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import Logo from "./Logo.jsx";
import { useChain } from "../store/ChainProvider.jsx";

export default function Nav() {
  const { connected, me, toggleWallet } = useChain();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav ${scrolled ? "nav-scrolled" : ""}`}>
      <div className="wrap nav-in">
        <Link to="/" className="nav-brand">
          <Logo size={34} />
          <span className="nav-word">
            LOXLEY <em>Sherwood Registry</em>
          </span>
        </Link>

        <nav className="nav-links">
          <a href="/#how">How it works</a>
          <NavLink to="/quiver">Quiver</NavLink>
          <NavLink to="/portfolio">Portfolio</NavLink>
          <a href="/#lore">Lore</a>
        </nav>

        <div className="nav-cta">
          <Link to="/quiver" className="btn btn-ghost btn-sm">Enter app</Link>
          {connected && <span className="nav-addr mono">{me}</span>}
          <button className="btn btn-primary btn-sm" onClick={toggleWallet}>
            {connected ? "Disconnect" : "Connect wallet"}
          </button>
        </div>
      </div>

      <style>{`
        .nav {
          position: sticky; top: 0; z-index: 50;
          border-bottom: 1px solid transparent;
          transition: background .25s, border-color .25s, backdrop-filter .25s;
        }
        .nav-scrolled {
          background: #050706cc;
          backdrop-filter: blur(12px);
          border-bottom-color: var(--line);
        }
        .nav-in { display: flex; align-items: center; justify-content: space-between; height: 68px; gap: 20px; }
        .nav-brand { display: flex; align-items: center; gap: 11px; }
        .nav-word { font-family: var(--font-display); font-weight: 700; letter-spacing: .06em; font-size: 16px; line-height: 1; }
        .nav-word em { display: block; font-style: normal; font-family: var(--font-mono); font-weight: 400;
          font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--text-mute); margin-top: 3px; }
        .nav-links { display: flex; gap: 26px; font-size: 14.5px; color: var(--text-soft); }
        .nav-links a { transition: color .15s; }
        .nav-links a:hover, .nav-links a.active { color: var(--text); }
        .nav-cta { display: flex; align-items: center; gap: 10px; }
        .nav-addr { font-size: 13px; color: var(--green); padding: 5px 10px; border: 1px solid var(--line-hi); border-radius: 8px; }
        @media (max-width: 640px) { .nav-addr { display: none; } }
        @media (max-width: 860px) { .nav-links { display: none; } }
        @media (max-width: 560px) { .nav-word em { display: none; } .nav-cta .btn-ghost { display: none; } }
      `}</style>
    </header>
  );
}
