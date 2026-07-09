import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useChain } from "../store/ChainProvider.jsx";
import { balanceOf, bountyOf, fmt, eth, ago } from "../mocks/fakeChain.js";

export default function RepoDetail() {
  const { id } = useParams();
  const { getRepo, connected, me: ME, tribute, bounty, takeStake } = useChain();
  const r = getRepo(id);
  const [tribAmt, setTribAmt] = useState("");
  const [stakeAmt, setStakeAmt] = useState("");

  if (!r)
    return (
      <div className="wrap" style={{ padding: "90px 24px" }}>
        <p style={{ color: "var(--text-soft)" }}>
          Repo not found. <Link to="/quiver" className="sym">Back to the Quiver →</Link>
        </p>
      </div>
    );

  const myBal = connected ? balanceOf(r, ME) : 0;
  const myBounty = connected ? bountyOf(r, ME) : 0;
  const iOwn = connected && r.owner === ME;
  const ownerHasSupply = balanceOf(r, r.owner) > 0;
  const holders = Object.entries(r.holders).filter(([, b]) => b > 0).sort((a, b) => b[1] - a[1]);
  const pct = (part) => (r.supply ? ((part / r.supply) * 100).toFixed(1) + "%" : "0%");

  return (
    <div className="wrap rd">
      <Link to="/quiver" className="rd-back">← Quiver</Link>

      <header className="rd-head">
        <h1 className="mono">{r.repoFullName}</h1>
        <p className="rd-meta">
          <span className="sym">${r.symbol}</span> Arrow · {r.language} · ★ {fmt(r.stars)} ·
          registered {ago(r.registeredAt)}
        </p>
        <a className="rd-gh" href={`https://github.com/${r.repoFullName}`} target="_blank" rel="noreferrer">
          View on GitHub ↗
        </a>
      </header>

      <div className="rd-stats card">
        <Stat k="Total tribute" v={eth(r.totalTribute)} cls="eth" />
        <Stat k="Arrow supply" v={fmt(r.supply)} />
        <Stat k="Your Arrows" v={connected ? `${fmt(myBal)}` : "—"} sub={myBal ? `$${r.symbol}` : ""} cls={myBal ? "sym" : "mute"} />
        <Stat k="Your bounty" v={connected ? eth(myBounty) : "—"} cls={myBounty ? "eth" : "mute"} />
      </div>

      <div className="rd-body">
        <div className="rd-actions">
          {/* Pay tribute */}
          <div className="act card">
            <div className="act-tag act-cash">Money → holders</div>
            <h3>Pay tribute</h3>
            <p>Send ETH to this repo. It splits pro-rata across all {holders.length} holders instantly. This is <b>tribute()</b>.</p>
            <div className="act-row">
              <input type="number" step="0.01" placeholder="0.5" value={tribAmt}
                onChange={(e) => setTribAmt(e.target.value)} />
              <button className="btn btn-cash" onClick={() => { if (tribute(r.id, tribAmt)) setTribAmt(""); }}>
                Pay tribute
              </button>
            </div>
          </div>

          {/* Collect bounty */}
          {connected && myBounty > 0 && (
            <div className="act card">
              <div className="act-tag act-cash">Your ETH</div>
              <h3>Collect your bounty</h3>
              <p>You have {eth(myBounty)} waiting from tribute paid so far. This is <b>bounty()</b>.</p>
              <button className="btn btn-cash" style={{ width: "100%", justifyContent: "center" }}
                onClick={() => bounty(r.id)}>
                Collect {eth(myBounty)}
              </button>
            </div>
          )}

          {/* Take a stake */}
          {connected && !iOwn && ownerHasSupply && (
            <div className="act card">
              <div className="act-tag act-code">Become a holder</div>
              <h3>Take a stake</h3>
              <p>Acquire Arrows from the owner to become a holder, then earn bounty from future tribute. (MVP moves balances; real version is a DEX trade.)</p>
              <div className="act-row">
                <input type="number" placeholder="100000" value={stakeAmt}
                  onChange={(e) => setStakeAmt(e.target.value)} />
                <button className="btn btn-primary" onClick={() => { if (takeStake(r.id, stakeAmt)) setStakeAmt(""); }}>
                  Take stake
                </button>
              </div>
            </div>
          )}

          {!connected && (
            <div className="act card rd-connect">
              Connect your wallet to pay tribute, collect bounty, or take a stake.
            </div>
          )}
        </div>

        {/* Holders */}
        <aside className="rd-holders card">
          <div className="rd-holders-h">Arrow holders <span className="mute">· {holders.length}</span></div>
          {holders.map(([addr, bal]) => (
            <div className="hr" key={addr}>
              <span className="mono">
                {addr}{addr === ME && <span className="you">YOU</span>}
                {addr === r.owner && <span className="owner">OWNER</span>}
              </span>
              <span>{fmt(bal)} <span className="mute">({pct(bal)})</span></span>
            </div>
          ))}
        </aside>
      </div>

      <style>{styles}</style>
    </div>
  );
}

function Stat({ k, v, sub, cls }) {
  return (
    <div className="rd-stat">
      <div className="rd-stat-k">{k}</div>
      <div className={`rd-stat-v ${cls || ""}`}>{v} {sub && <span className="sym">{sub}</span>}</div>
    </div>
  );
}

const styles = `
.rd { padding: 40px 24px 30px; }
.rd-back { color: var(--text-soft); font-size: 14px; }
.rd-back:hover { color: var(--green); }
.rd-head { margin: 18px 0 24px; }
.rd-head h1 { font-size: clamp(26px, 4vw, 38px); }
.rd-meta { color: var(--text-soft); font-size: 14.5px; margin-top: 8px; }
.rd-gh { display: inline-block; margin-top: 12px; font-size: 13.5px; color: var(--green); font-family: var(--font-mono); }
.rd-gh:hover { text-decoration: underline; }

.rd-stats { display: grid; grid-template-columns: repeat(4, 1fr); overflow: hidden; }
.rd-stat { padding: 20px 22px; border-right: 1px solid var(--line); }
.rd-stat:last-child { border-right: none; }
.rd-stat-k { font-family: var(--font-mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--text-mute); }
.rd-stat-v { font-family: var(--font-display); font-size: 24px; font-weight: 600; margin-top: 6px; }
.rd-stat-v.mute { color: var(--text-mute); }

.rd-body { display: grid; grid-template-columns: 1.3fr .7fr; gap: 18px; margin-top: 18px; align-items: start; }

.act { padding: 20px 22px; margin-bottom: 16px; }
.act:last-child { margin-bottom: 0; }
.act-tag { display: inline-block; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase;
  padding: 4px 9px; border-radius: 6px; margin-bottom: 12px; }
.act-code { background: var(--green-dim); color: var(--green); }
.act-cash { background: rgba(232,183,58,.12); color: var(--cash); }
.act h3 { font-size: 18px; }
.act p { color: var(--text-soft); font-size: 14px; margin: 8px 0 15px; }
.act p b { color: var(--text); font-family: var(--font-mono); font-size: 13px; }
.act-row { display: flex; gap: 10px; }
.act-row input { flex: 1; font-family: var(--font-body); font-size: 14.5px; padding: 11px 13px;
  background: var(--bg-2); border: 1px solid var(--line-hi); border-radius: 10px; color: var(--text); }
.act-row input:focus { outline: none; border-color: var(--green); box-shadow: 0 0 0 3px var(--green-dim); }
.btn-cash { background: var(--cash); color: #1a1200; border-color: var(--cash); font-weight: 700; }
.btn-cash:hover { filter: brightness(1.08); }
.rd-connect { color: var(--text-soft); font-size: 14px; text-align: center; }

.rd-holders { padding: 18px 20px; position: sticky; top: 84px; }
.rd-holders-h { font-family: var(--font-mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase;
  color: var(--text-mute); padding-bottom: 12px; border-bottom: 1px solid var(--line); margin-bottom: 6px; }
.hr { display: flex; justify-content: space-between; align-items: center; padding: 11px 0; border-bottom: 1px dashed var(--line); font-size: 13px; }
.hr:last-child { border-bottom: none; }
.you { background: var(--green-dim); color: var(--green); font-size: 9.5px; padding: 1px 6px; border-radius: 4px; margin-left: 7px; }
.owner { background: #ffffff12; color: var(--text-soft); font-size: 9.5px; padding: 1px 6px; border-radius: 4px; margin-left: 6px; }

@media (max-width: 860px) {
  .rd-body { grid-template-columns: 1fr; }
  .rd-holders { position: static; }
  .rd-stats { grid-template-columns: 1fr 1fr; }
  .rd-stat:nth-child(2) { border-right: none; }
  .rd-stat:nth-child(1), .rd-stat:nth-child(2) { border-bottom: 1px solid var(--line); }
}
@media (max-width: 480px) { .rd-stats { grid-template-columns: 1fr; } .rd-stat { border-right: none; } }
`;
