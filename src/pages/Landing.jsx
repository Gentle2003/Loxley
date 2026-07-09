import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Reveal from "../components/Reveal.jsx";
import {
  seedRepos, glossary, quiverStats, fmt, eth, ago,
} from "../mocks/fakeChain.js";

/* count-up when scrolled into view */
function useCountUp(target, dur = 1400) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        const t0 = performance.now();
        const tick = (t) => {
          const p = Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(target * eased);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [target, dur]);
  return [val, ref];
}

function Stat({ value, format, label }) {
  const [v, ref] = useCountUp(value);
  return (
    <div className="stat" ref={ref}>
      <div className="stat-v">{format(v)}</div>
      <div className="stat-k">{label}</div>
    </div>
  );
}

const STEPS = [
  { n: "01", t: "Register a repo", d: "Point Sherwood at a GitHub repo. It records it on-chain and mints its Arrow — the full supply to you.", tag: "registerRepo()" },
  { n: "02", t: "Mint its Arrow", d: "Each repo gets its own ERC-20. Holding an Arrow is holding a share of everything that repo earns.", tag: "Arrow.sol" },
  { n: "03", t: "Anyone pays Tribute", d: "Users, sponsors, or grateful downstreams send ETH to the repo. It splits pro-rata across all holders instantly.", tag: "tribute()" },
  { n: "04", t: "Holders collect Bounty", d: "Your share accrues with every tribute. Pull it to your wallet whenever you want — the math is O(1).", tag: "bounty()" },
];

export default function Landing() {
  const stats = quiverStats(seedRepos);
  const ticker = [...seedRepos, ...seedRepos]; // duplicate for seamless loop

  return (
    <div className="landing">
      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="wrap hero-in">
          <motion.div
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="pill"><span className="dot" /> Prototype · Base Sepolia · no real money</span>
            <h1 className="hero-h">
              Turn a repo into an <span className="grad">Arrow</span><br />
              that pays everyone who holds it.
            </h1>
            <p className="hero-p">
              Loxley makes open source a cashflow asset. Register a GitHub repo, mint its Arrow,
              and let anyone pay <em>tribute</em> in ETH — split pro-rata to every holder, collectable on-chain.
              <br />Open source, funded like Robin Hood.
            </p>
            <div className="hero-cta">
              <Link to="/quiver" className="btn btn-primary">Enter the Quiver →</Link>
              <a href="#how" className="btn btn-ghost">How it works</a>
            </div>
            <div className="hero-legend">
              <span><i style={{ background: "var(--green)" }} /> code &amp; Arrow actions</span>
              <span><i style={{ background: "var(--cash)" }} /> tribute &amp; bounty (ETH)</span>
            </div>
          </motion.div>

          {/* floating arrow-card visual */}
          <motion.div
            className="hero-art"
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="art-card"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="art-head">
                <span className="mono">maintainer/parserfast</span>
                <span className="sym">$PARSE</span>
              </div>
              <div className="art-big eth">Ξ2.400</div>
              <div className="art-sub">total tribute · split to 3 holders</div>
              <div className="art-bar"><span style={{ width: "70%" }} /></div>
              <div className="art-row"><span>Your Arrows</span><span className="sym">200,000</span></div>
              <div className="art-row"><span>Your bounty</span><span className="eth">Ξ0.480</span></div>
              <button className="btn btn-primary btn-sm" style={{ width: "100%", marginTop: 14, justifyContent: "center" }}>
                Collect Ξ0.480
              </button>
            </motion.div>
            <div className="art-glow" />
          </motion.div>
        </div>
      </section>

      {/* ============ TICKER ============ */}
      <div className="ticker">
        <div className="ticker-track">
          {ticker.map((r, i) => {
            const up = r.totalTribute > 0;
            return (
              <span className="tick" key={i}>
                <b className="sym">${r.symbol}</b>
                <span className="mono" style={{ color: "var(--text-mute)" }}>{r.repoFullName}</span>
                <span className={up ? "up" : "down"}>{up ? "▲" : "▬"} {up ? eth(r.totalTribute) : "—"}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="block">
        <div className="wrap">
          <Reveal><p className="eyebrow">How it works</p></Reveal>
          <Reveal delay={0.05}>
            <h2 className="block-h">Four steps from repo to revenue.</h2>
          </Reveal>
          <div className="steps">
            {STEPS.map((s, i) => (
              <Reveal delay={0.08 * i} key={s.n}>
                <div className="step card">
                  <div className="step-n">{s.n}</div>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                  <span className="step-tag mono">{s.tag}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ MECHANIC + STATS ============ */}
      <section id="mechanic" className="block">
        <div className="wrap mech">
          <div>
            <Reveal><p className="eyebrow">The mechanic</p></Reveal>
            <Reveal delay={0.05}>
              <h2 className="block-h">Cashflow that scales to any number of holders.</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mech-p">
                Arrow uses the magnified-dividend pattern. Every tribute bumps a single
                cumulative-per-share number, so paying tribute is <b>O(1)</b> no matter how many
                holders exist — and Arrow transfers carry unclaimed bounties correctly.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <pre className="code-snip mono">{`tribute():  perShare += msg.value / totalSupply
bountyOf(a): balance(a) * perShare − collected(a)
bounty():   send you your share, mark collected`}</pre>
            </Reveal>
          </div>
          <div className="stats card">
            <Stat value={stats.repoCount} format={(v) => fmt(Math.round(v))} label="Repos in the quiver" />
            <Stat value={stats.totalTribute} format={(v) => eth(v)} label="Total tribute paid" />
            <Stat value={stats.holderCount} format={(v) => fmt(Math.round(v))} label="Arrow holders" />
            <Stat value={5_000_000} format={(v) => fmt(Math.round(v))} label="Arrows minted" />
          </div>
        </div>
      </section>

      {/* ============ FEATURED QUIVER ============ */}
      <section className="block">
        <div className="wrap">
          <div className="row-head">
            <div>
              <Reveal><p className="eyebrow">The quiver</p></Reveal>
              <Reveal delay={0.05}><h2 className="block-h">Repos already earning.</h2></Reveal>
            </div>
            <Reveal delay={0.1}><Link to="/quiver" className="btn btn-ghost btn-sm">See all →</Link></Reveal>
          </div>
          <Reveal delay={0.1}>
            <div className="card q-table">
              <div className="q-head mono">
                <span>Repo</span><span>Lang</span><span>Stars</span><span>Arrow</span>
                <span>Tribute</span><span>Registered</span>
              </div>
              {seedRepos.map((r) => (
                <Link to={`/repo/${r.id}`} className="q-line" key={r.id}>
                  <span className="mono repo-name">{r.repoFullName}</span>
                  <span style={{ color: "var(--text-soft)" }}>{r.language}</span>
                  <span style={{ color: "var(--text-soft)" }}>★ {fmt(r.stars)}</span>
                  <span className="sym">${r.symbol}</span>
                  <span className={r.totalTribute ? "eth" : ""} style={r.totalTribute ? {} : { color: "var(--text-mute)" }}>
                    {r.totalTribute ? eth(r.totalTribute) : "—"}
                  </span>
                  <span style={{ color: "var(--text-mute)", fontSize: 13 }}>{ago(r.registeredAt)}</span>
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ LORE / GLOSSARY ============ */}
      <section id="lore" className="block">
        <div className="wrap">
          <Reveal><p className="eyebrow">The lore</p></Reveal>
          <Reveal delay={0.05}><h2 className="block-h">Robin Hood, on-chain.</h2></Reveal>
          <div className="lore">
            {glossary.map((g, i) => (
              <Reveal delay={0.06 * i} key={g.term}>
                <div className="lore-card card">
                  <div className="lore-term">{g.term}</div>
                  <p>{g.meaning}</p>
                  <span className="lore-on mono">{g.on}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ GUARDRAILS ============ */}
      <section className="block">
        <div className="wrap">
          <Reveal>
            <div className="guard card">
              <h3>What Loxley is <span className="up">not</span>.</h3>
              <div className="guard-grid">
                <div><b>Testnet only.</b> Base Sepolia. Never mainnet in this MVP.</div>
                <div><b>No token sale.</b> Arrows are minted to registrants — there's no presale or ICO.</div>
                <div><b>No $LOX yet.</b> The governance token is branding only until deliberately designed.</div>
                <div><b>Not audited.</b> Don't hold real value here. A cashflow token is likely a security.</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="block">
        <div className="wrap">
          <Reveal>
            <div className="cta">
              <div className="cta-glow" />
              <h2>Arm your repo.</h2>
              <p>Register a repo, mint its Arrow, and turn open-source work into something that pays back.</p>
              <div className="hero-cta" style={{ justifyContent: "center" }}>
                <Link to="/quiver" className="btn btn-primary">Enter the Quiver →</Link>
                <a href="#how" className="btn btn-ghost">Read the mechanic</a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
.landing { padding-top: 8px; }
.block { padding: 74px 0; }
.block-h { font-size: clamp(28px, 4vw, 44px); margin: 12px 0 26px; max-width: 20ch; }

/* hero */
.hero { padding: 56px 0 30px; }
.hero-in { display: grid; grid-template-columns: 1.15fr .85fr; gap: 48px; align-items: center; }
.hero-h { font-size: clamp(34px, 5.4vw, 62px); line-height: 1.02; margin: 20px 0 20px; letter-spacing: -0.03em; }
.grad { background: linear-gradient(100deg, var(--green), var(--lime)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.hero-p { color: var(--text-soft); font-size: 17px; max-width: 54ch; }
.hero-p em { color: var(--text); font-style: normal; }
.hero-cta { display: flex; gap: 12px; margin: 28px 0 22px; flex-wrap: wrap; }
.hero-legend { display: flex; gap: 22px; font-size: 12.5px; color: var(--text-mute); font-family: var(--font-mono); }
.hero-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 7px; vertical-align: middle; }

.hero-art { position: relative; display: grid; place-items: center; }
.art-card { position: relative; z-index: 2; width: 320px; max-width: 100%; padding: 22px; border-radius: var(--radius-lg);
  background: linear-gradient(160deg, #0f1613, #080b09); border: 1px solid var(--line-hi);
  box-shadow: 0 30px 80px -30px #000, inset 0 1px 0 #ffffff08; }
.art-head { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.art-big { font-size: 40px; font-weight: 600; margin-top: 16px; letter-spacing: -0.02em; }
.art-sub { color: var(--text-mute); font-size: 12.5px; margin-bottom: 16px; }
.art-bar { height: 7px; border-radius: 99px; background: var(--bg-2); overflow: hidden; margin-bottom: 16px; }
.art-bar span { display: block; height: 100%; background: linear-gradient(90deg, var(--green), var(--lime)); }
.art-row { display: flex; justify-content: space-between; font-size: 13.5px; padding: 7px 0; border-top: 1px dashed var(--line); }
.art-glow { position: absolute; width: 300px; height: 300px; border-radius: 50%;
  background: radial-gradient(circle, var(--green-glow), transparent 65%); filter: blur(20px); z-index: 1; }

/* ticker */
.ticker { border-block: 1px solid var(--line); background: #070b09; overflow: hidden; padding: 13px 0; }
.ticker-track { display: inline-flex; gap: 44px; white-space: nowrap; animation: scroll-x 30s linear infinite; }
.ticker:hover .ticker-track { animation-play-state: paused; }
.tick { display: inline-flex; align-items: center; gap: 12px; font-size: 13.5px; }
@keyframes scroll-x { from { transform: translateX(0); } to { transform: translateX(-50%); } }

/* steps */
.steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.step { padding: 24px 22px; position: relative; overflow: hidden; transition: border-color .2s, transform .2s; }
.step:hover { border-color: var(--line-hi); transform: translateY(-3px); }
.step-n { font-family: var(--font-mono); font-size: 13px; color: var(--green); letter-spacing: .1em; }
.step h3 { font-size: 19px; margin: 14px 0 9px; }
.step p { color: var(--text-soft); font-size: 14.5px; }
.step-tag { display: inline-block; margin-top: 16px; font-size: 12px; color: var(--text-mute);
  border: 1px solid var(--line); border-radius: 6px; padding: 3px 8px; }

/* mechanic */
.mech { display: grid; grid-template-columns: 1.2fr .8fr; gap: 44px; align-items: center; }
.mech-p { color: var(--text-soft); font-size: 16px; max-width: 52ch; }
.mech-p b { color: var(--green); }
.code-snip { margin-top: 22px; background: #070b09; border: 1px solid var(--line); border-radius: var(--radius);
  padding: 16px 18px; font-size: 13px; color: var(--text-soft); line-height: 1.7; overflow-x: auto; }
.stats { display: grid; grid-template-columns: 1fr 1fr; }
.stat { padding: 26px 22px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.stat:nth-child(even) { border-right: none; }
.stat:nth-child(3), .stat:nth-child(4) { border-bottom: none; }
.stat-v { font-family: var(--font-display); font-size: 30px; font-weight: 600; letter-spacing: -0.02em; }
.stat-k { color: var(--text-mute); font-size: 12.5px; margin-top: 5px; }

/* featured quiver */
.row-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; gap: 16px; }
.row-head .block-h { margin-bottom: 0; }
.q-table { overflow: hidden; }
.q-head, .q-line { display: grid; grid-template-columns: 2.4fr 1fr .9fr .9fr 1fr 1.1fr; align-items: center; gap: 12px; padding: 15px 20px; }
.q-head { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--text-mute); border-bottom: 1px solid var(--line); }
.q-line { border-bottom: 1px solid var(--line); transition: background .12s; }
.q-line:last-child { border-bottom: none; }
.q-line:hover { background: var(--panel-hi); }
.repo-name { color: var(--text); font-size: 14.5px; }

/* lore */
.lore { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
.lore-card { padding: 20px 18px; transition: border-color .2s, transform .2s; }
.lore-card:hover { border-color: var(--green); transform: translateY(-3px); }
.lore-term { font-family: var(--font-display); font-weight: 600; font-size: 18px; color: var(--green); margin-bottom: 8px; }
.lore-card p { color: var(--text-soft); font-size: 13.5px; min-height: 60px; }
.lore-on { font-size: 11.5px; color: var(--text-mute); }

/* guardrails */
.guard { padding: 34px 34px; }
.guard h3 { font-size: 24px; margin-bottom: 22px; }
.guard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 40px; }
.guard-grid div { color: var(--text-soft); font-size: 14.5px; }
.guard-grid b { color: var(--text); }

/* cta */
.cta { position: relative; text-align: center; padding: 66px 30px; border-radius: 22px; overflow: hidden;
  background: linear-gradient(160deg, #0c130f, #070b09); border: 1px solid var(--line-hi); }
.cta h2 { font-size: clamp(30px, 4.5vw, 50px); margin-bottom: 12px; }
.cta p { color: var(--text-soft); max-width: 48ch; margin: 0 auto 26px; font-size: 16.5px; }
.cta-glow { position: absolute; inset: 0; z-index: 0;
  background: radial-gradient(60% 120% at 50% 0%, var(--green-glow), transparent 60%); pointer-events: none; }
.cta > * { position: relative; z-index: 1; }

/* responsive */
@media (max-width: 940px) {
  .hero-in { grid-template-columns: 1fr; }
  .hero-art { order: -1; }
  .steps { grid-template-columns: 1fr 1fr; }
  .mech { grid-template-columns: 1fr; }
  .lore { grid-template-columns: 1fr 1fr; }
  .guard-grid { grid-template-columns: 1fr; }
  .q-head, .q-line { grid-template-columns: 2fr 1fr 1fr; }
  .q-head span:nth-child(n+4), .q-line span:nth-child(n+4) { display: none; }
}
@media (max-width: 560px) {
  .steps { grid-template-columns: 1fr; }
  .lore { grid-template-columns: 1fr; }
  .stats { grid-template-columns: 1fr; }
  .stat { border-right: none; }
}
`;
