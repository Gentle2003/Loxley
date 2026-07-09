import { useNavigate, Link } from "react-router-dom";
import { useChain } from "../store/ChainProvider.jsx";
import { balanceOf, bountyOf, fmt, eth } from "../mocks/fakeChain.js";

export default function Portfolio() {
  const { repos, connected, me: ME, toggleWallet, bounty, collectAll } = useChain();
  const navigate = useNavigate();

  const held = repos
    .filter((r) => balanceOf(r, ME) > 0)
    .map((r) => ({ r, bal: balanceOf(r, ME), bnty: bountyOf(r, ME) }))
    .sort((a, b) => b.bnty - a.bnty);

  const totalBounty = held.reduce((s, h) => s + h.bnty, 0);
  const claimable = held.filter((h) => h.bnty > 0).length;

  return (
    <div className="wrap pf">
      <header className="pf-head">
        <div>
          <p className="eyebrow">Your holdings</p>
          <h1>Portfolio</h1>
          <p className="pf-lede">
            {connected
              ? <>The Arrows you hold and the bounty waiting for you. Wallet <span className="sym">{ME}</span>.</>
              : "Connect your wallet to see the Arrows you hold and collect your bounty."}
          </p>
        </div>
      </header>

      {!connected ? (
        <div className="card pf-connect">
          <p>No wallet connected.</p>
          <button className="btn btn-primary" onClick={toggleWallet}>Connect wallet</button>
        </div>
      ) : held.length === 0 ? (
        <div className="card pf-empty">
          <p>You don't hold any Arrows yet.</p>
          <Link to="/quiver" className="btn btn-ghost">Browse the Quiver →</Link>
        </div>
      ) : (
        <>
          <div className="pf-summary">
            <div className="card pf-stat">
              <div className="pf-k">Positions</div>
              <div className="pf-v">{held.length}</div>
            </div>
            <div className="card pf-stat">
              <div className="pf-k">Claimable bounty</div>
              <div className="pf-v eth">{eth(totalBounty)}</div>
            </div>
            <div className="card pf-stat pf-collect">
              <div>
                <div className="pf-k">Collect everything</div>
                <div className="pf-sub">{claimable} position{claimable === 1 ? "" : "s"} with bounty</div>
              </div>
              <button className="btn btn-cash" disabled={totalBounty <= 0} onClick={collectAll}>
                Collect all
              </button>
            </div>
          </div>

          <div className="card pf-table">
            <div className="pf-thead mono">
              <span>Repo</span><span>Arrow</span><span className="r">Your Arrows</span>
              <span className="r">Share</span><span className="r">Bounty</span><span className="r"></span>
            </div>
            {held.map(({ r, bal, bnty }) => (
              <div className="pf-line" key={r.id}>
                <span className="pf-repo mono" onClick={() => navigate(`/repo/${r.id}`)}>{r.repoFullName}</span>
                <span className="sym">${r.symbol}</span>
                <span className="r">{fmt(bal)}</span>
                <span className="r soft">{((bal / r.supply) * 100).toFixed(1)}%</span>
                <span className={`r ${bnty ? "eth" : "mute"}`}>{bnty ? eth(bnty) : "—"}</span>
                <span className="r">
                  <button className="btn btn-cash btn-sm" disabled={bnty <= 0} onClick={() => bounty(r.id)}>
                    Collect
                  </button>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
.pf { padding: 46px 24px 30px; }
.pf-head h1 { font-size: clamp(30px, 4.4vw, 44px); margin: 10px 0 10px; }
.pf-lede { color: var(--text-soft); max-width: 62ch; }

.pf-connect, .pf-empty { display: flex; flex-direction: column; align-items: center; gap: 16px;
  padding: 54px 24px; margin-top: 26px; text-align: center; }
.pf-connect p, .pf-empty p { color: var(--text-soft); }

.pf-summary { display: grid; grid-template-columns: 1fr 1fr 1.4fr; gap: 14px; margin: 28px 0 16px; }
.pf-stat { padding: 20px 22px; }
.pf-k { font-family: var(--font-mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--text-mute); }
.pf-v { font-family: var(--font-display); font-size: 30px; font-weight: 600; margin-top: 6px; }
.pf-sub { color: var(--text-soft); font-size: 13px; margin-top: 4px; }
.pf-collect { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.btn-cash { background: var(--cash); color: #1a1200; border-color: var(--cash); font-weight: 700; }
.btn-cash:hover { filter: brightness(1.08); }
.btn-cash:disabled { opacity: .4; }

.pf-table { overflow: hidden; margin-top: 6px; }
.pf-thead, .pf-line { display: grid; grid-template-columns: 2.2fr 1fr 1.1fr .8fr 1fr 1fr; align-items: center; gap: 12px; padding: 15px 20px; }
.pf-thead { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--text-mute); border-bottom: 1px solid var(--line); }
.pf-line { border-bottom: 1px solid var(--line); }
.pf-line:last-child { border-bottom: none; }
.pf-repo { color: var(--text); font-size: 14.5px; cursor: pointer; }
.pf-repo:hover { color: var(--green); }
.soft { color: var(--text-soft); }
.mute { color: var(--text-mute); }
.r { text-align: right; justify-self: end; }

@media (max-width: 820px) {
  .pf-summary { grid-template-columns: 1fr; }
  .pf-thead, .pf-line { grid-template-columns: 1.8fr 1fr 1fr; }
  .pf-thead span:nth-child(n+4), .pf-line span:nth-child(4), .pf-line span:nth-child(5) { display: none; }
  .pf-line span:nth-child(6) { display: block; }
}
`;
