import { useState, useEffect, useCallback } from "react";
import { useChain } from "../store/ChainProvider.jsx";
import { readMarket, quoteBuy, quoteSell, IS_MARKET_LIVE } from "../lib/market.js";
import { eth, fmt } from "../mocks/fakeChain.js";
import { useCurrency } from "../store/CurrencyContext.jsx";

/* Buy/sell an Arrow against its AMM pool. Live mode only, when a Market is
   configured. Testnet prototype — see CLAUDE.md guardrails. */
export default function MarketPanel({ arrow, symbol, myBal, supply }) {
  const { connected, marketBuy, marketSell, marketSeed } = useChain();
  const { money } = useCurrency();
  const [pool, setPool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [buyEth, setBuyEth] = useState("");
  const [buyQuote, setBuyQuote] = useState(0);
  const [sellArrows, setSellArrows] = useState("");
  const [sellQuote, setSellQuote] = useState(0);
  const [seedEth, setSeedEth] = useState("");
  const [seedArrows, setSeedArrows] = useState("");
  const sym = symbol ? `$${symbol}` : "Arrows";

  const load = useCallback(async () => {
    try { setPool(await readMarket(arrow)); } catch { setPool(null); }
    setLoading(false);
  }, [arrow]);
  useEffect(() => { setLoading(true); load(); }, [load]);

  useEffect(() => {
    if (!pool?.exists) return;
    const t = setTimeout(() => quoteBuy(arrow, buyEth).then(setBuyQuote).catch(() => setBuyQuote(0)), 350);
    return () => clearTimeout(t);
  }, [buyEth, pool, arrow]);
  useEffect(() => {
    if (!pool?.exists) return;
    const t = setTimeout(() => quoteSell(arrow, sellArrows).then(setSellQuote).catch(() => setSellQuote(0)), 350);
    return () => clearTimeout(t);
  }, [sellArrows, pool, arrow]);

  const run = async (fn) => { setBusy(true); const ok = await fn(); setBusy(false); if (ok) await load(); return ok; };

  const styles = <style>{css}</style>;

  if (!IS_MARKET_LIVE)
    return (
      <div className="mkt card">
        <div className="mkt-h">Market</div>
        <p className="mkt-sub">Trading launches on <b>Robinhood Chain mainnet</b> (via Uniswap). On testnet you can still register, pay tribute, and collect bounty.</p>
        {styles}
      </div>
    );

  if (loading)
    return <div className="mkt card"><div className="mkt-h">Market</div><p className="mkt-sub">Loading market…</p>{styles}</div>;

  if (!pool?.exists)
    return (
      <div className="mkt card">
        <div className="mkt-h">Market</div>
        {myBal > 0 ? (
          <>
            <p className="mkt-sub">No market yet. Seed a pool with ETH + {sym} to make it tradeable — others can buy in and share future tribute.</p>
            <div className="mkt-row"><input type="number" placeholder="ETH to add (e.g. 0.1)" value={seedEth} onChange={(e) => setSeedEth(e.target.value)} /></div>
            <div className="mkt-row"><input type="number" placeholder="Arrows to add (e.g. 100000)" value={seedArrows} onChange={(e) => setSeedArrows(e.target.value)} /></div>
            <button className="btn btn-primary mkt-wide" disabled={busy || !connected}
              onClick={() => run(() => marketSeed(arrow, seedEth, seedArrows)).then((ok) => { if (ok) { setSeedEth(""); setSeedArrows(""); } })}>
              {busy ? "Seeding…" : "Seed the market"}
            </button>
          </>
        ) : (
          <p className="mkt-sub">No market for this Arrow yet. The owner can seed a pool to make it tradeable.</p>
        )}
        {styles}
      </div>
    );

  return (
    <div className="mkt card">
      <div className="mkt-h">Market</div>
      <div className="mkt-stats">
        <div className="mkt-stat">
          <div className="mkt-k">Price</div>
          <div className="mkt-v">{money(pool.pricePerArrow)}<span className="mkt-mut"> / {sym.replace(/s$/, "")}</span></div>
        </div>
        <div className="mkt-stat">
          <div className="mkt-k">Market cap</div>
          <div className="mkt-v eth">{money(pool.pricePerArrow * (supply || 0))}</div>
        </div>
      </div>
      <div className="mkt-liq">Liquidity {eth(pool.ethReserve)} + {fmt(Math.round(pool.arrowReserve))} {sym}</div>

      <div className="mkt-act">
        <div className="mkt-tag mkt-tag-code">Buy — become a holder</div>
        <div className="mkt-row">
          <input type="number" placeholder="ETH in" value={buyEth} onChange={(e) => setBuyEth(e.target.value)} />
          <button className="btn btn-primary" disabled={busy || !connected}
            onClick={() => run(() => marketBuy(arrow, buyEth)).then((ok) => { if (ok) setBuyEth(""); })}>Buy</button>
        </div>
        {buyEth && buyQuote > 0 && <div className="mkt-quote">≈ {fmt(Math.round(buyQuote))} {sym}</div>}
      </div>

      <div className="mkt-act">
        <div className="mkt-tag mkt-tag-cash">Sell — cash out</div>
        <div className="mkt-row">
          <input type="number" placeholder="Arrows in" value={sellArrows} onChange={(e) => setSellArrows(e.target.value)} />
          <button className="btn btn-cash" disabled={busy || !connected}
            onClick={() => run(() => marketSell(arrow, sellArrows)).then((ok) => { if (ok) setSellArrows(""); })}>Sell</button>
        </div>
        {sellArrows && sellQuote > 0 && <div className="mkt-quote eth">≈ {eth(sellQuote)}</div>}
        {myBal > 0 && <div className="mkt-hold">You hold {fmt(myBal)} {sym}</div>}
      </div>
      {styles}
    </div>
  );
}

const css = `
.mkt { padding: 20px 22px; margin-bottom: 16px; }
.mkt-h { font-family: var(--font-display); font-size: 18px; display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.mkt-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; margin: 12px 0; }
.mkt-stat { background: var(--panel); padding: 12px 14px; }
.mkt-k { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--text-mute); }
.mkt-v { font-family: var(--font-display); font-size: 19px; font-weight: 600; margin-top: 3px; }
.mkt-mut { color: var(--text-mute); font-size: 12px; font-family: var(--font-mono); font-weight: 400; }
.mkt-liq { color: var(--text-mute); font-size: 12px; font-family: var(--font-mono); margin-top: 4px; }
.mkt-sub { color: var(--text-soft); font-size: 13.5px; margin: 8px 0 14px; }
.mkt-act { border-top: 1px solid var(--line); margin-top: 15px; padding-top: 14px; }
.mkt-tag { display: inline-block; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; padding: 4px 9px; border-radius: 6px; margin-bottom: 10px; }
.mkt-tag-code { background: var(--green-dim); color: var(--green); }
.mkt-tag-cash { background: rgba(232,183,58,.12); color: var(--cash); }
.mkt-row { display: flex; gap: 10px; margin-bottom: 8px; }
.mkt-row input { flex: 1; font-family: var(--font-body); font-size: 14.5px; padding: 11px 13px;
  background: var(--bg-2); border: 1px solid var(--line-hi); border-radius: 10px; color: var(--text); }
.mkt-row input:focus { outline: none; border-color: var(--green); box-shadow: 0 0 0 3px var(--green-dim); }
.mkt-wide { width: 100%; justify-content: center; }
.mkt-quote { font-family: var(--font-mono); font-size: 13px; color: var(--text-soft); }
.mkt-hold { color: var(--text-mute); font-size: 12px; margin-top: 6px; }
`;
