import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot-in">
        <div className="foot-brand">
          <Logo size={30} />
          <div>
            <div className="foot-word">LOXLEY</div>
            <div className="foot-tag">Open source, funded like Robin Hood.</div>
          </div>
        </div>

        <div className="foot-cols">
          <div>
            <h5>App</h5>
            <Link to="/quiver">Quiver</Link>
            <Link to="/portfolio">Portfolio</Link>
            <a href="/#how">How it works</a>
          </div>
          <div>
            <h5>Protocol</h5>
            <a href="/#lore">Sherwood &amp; Arrow</a>
            <a href="/#mechanic">The mechanic</a>
            <span className="soon">$LOX · not live</span>
          </div>
          <div>
            <h5>Reality</h5>
            <span className="soon">Base Sepolia only</span>
            <span className="soon">Unaudited</span>
            <span className="soon">No token sale</span>
          </div>
        </div>
      </div>

      <div className="wrap foot-fine">
        <span>Prototype · testnet only · not financial advice.</span>
        <span className="mono">Sherwood.sol + Arrow.sol</span>
      </div>

      <style>{`
        .foot { border-top: 1px solid var(--line); margin-top: 40px; padding: 46px 0 30px; background: linear-gradient(180deg, transparent, rgba(204, 255, 0, 0.05)); }
        .foot-in { display: flex; justify-content: space-between; gap: 40px; flex-wrap: wrap; }
        .foot-brand { display: flex; gap: 12px; align-items: center; }
        .foot-word { font-family: var(--font-display); font-weight: 700; letter-spacing: .06em; }
        .foot-tag { color: var(--text-soft); font-size: 13.5px; }
        .foot-cols { display: flex; gap: 54px; flex-wrap: wrap; }
        .foot-cols h5 { font-family: var(--font-mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--text-mute); margin: 0 0 12px; font-weight: 500; }
        .foot-cols a, .foot-cols .soon { display: block; color: var(--text-soft); font-size: 14px; margin-bottom: 9px; }
        .foot-cols a:hover { color: var(--green); }
        .foot-cols .soon { color: var(--text-mute); }
        .foot-fine { display: flex; justify-content: space-between; gap: 16px; margin-top: 40px; padding-top: 22px; border-top: 1px solid var(--line); color: var(--text-mute); font-size: 12.5px; flex-wrap: wrap; }
      `}</style>
    </footer>
  );
}
