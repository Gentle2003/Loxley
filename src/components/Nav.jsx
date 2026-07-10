import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import Logo from "./Logo.jsx";
import { useChain } from "../store/ChainProvider.jsx";

export default function Nav() {
  const { connected, me, toggleWallet } = useChain();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on any navigation.
  useEffect(() => { setMenu(false); }, [pathname]);

  return (
    <header className={`nav ${scrolled || menu ? "nav-scrolled" : ""}`}>
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
          <Link to="/quiver" className="btn btn-ghost btn-sm nav-enter">Enter app</Link>
          {connected && <span className="nav-addr mono">{me}</span>}
          <button className="btn btn-primary btn-sm" onClick={toggleWallet}>
            {connected ? "Disconnect" : "Connect wallet"}
          </button>
          <button className="nav-burger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* mobile drop panel */}
      <div className={`nav-mobile ${menu ? "open" : ""}`}>
        <div className="wrap nav-mobile-in">
          <a href="/#how" onClick={() => setMenu(false)}>How it works</a>
          <Link to="/quiver" onClick={() => setMenu(false)}>Quiver</Link>
          <Link to="/portfolio" onClick={() => setMenu(false)}>Portfolio</Link>
          <a href="/#lore" onClick={() => setMenu(false)}>Lore</a>
          {connected && <span className="nav-mobile-addr mono">{me}</span>}
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

        /* hamburger — hidden until the inline links collapse */
        .nav-burger { display: none; flex-direction: column; justify-content: center; gap: 5px;
          width: 40px; height: 38px; padding: 0 9px; background: transparent;
          border: 1px solid var(--line-hi); border-radius: 9px; cursor: pointer; }
        .nav-burger span { display: block; height: 2px; width: 100%; background: var(--text); border-radius: 2px;
          transition: transform .2s, opacity .2s; }
        .nav-burger[aria-expanded="true"] span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .nav-burger[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
        .nav-burger[aria-expanded="true"] span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        .nav-mobile { max-height: 0; overflow: hidden; transition: max-height .28s ease;
          border-bottom: 1px solid transparent; }
        .nav-mobile.open { max-height: 340px; background: #050706f2; backdrop-filter: blur(12px); border-bottom-color: var(--line); }
        .nav-mobile-in { display: flex; flex-direction: column; padding: 8px 24px 18px; }
        .nav-mobile-in a { padding: 13px 0; font-size: 16px; color: var(--text-soft); border-bottom: 1px solid var(--line); }
        .nav-mobile-in a:hover { color: var(--green); }
        .nav-mobile-addr { color: var(--green); font-size: 13px; padding-top: 14px; }

        @media (max-width: 860px) {
          .nav-links { display: none; }
          .nav-burger { display: flex; }
          .nav-enter { display: none; }
        }
        @media (max-width: 560px) { .nav-word em { display: none; } .nav-addr { display: none; } }
      `}</style>
    </header>
  );
}
