import { useCurrency } from "../store/CurrencyContext.jsx";

export default function CurrencyToggle() {
  const { currency, toggle, ethUsd } = useCurrency();
  const title = ethUsd
    ? `1 ETH ≈ $${ethUsd.toLocaleString("en-US")} (live rate). Testnet ETH has no real value — USD is illustrative.`
    : "Fetching ETH price…";
  return (
    <button className="ccy" onClick={toggle} title={title} aria-label="Toggle display currency">
      <span className={currency === "ETH" ? "on" : ""}>Ξ</span>
      <span className={currency === "USD" ? "on" : ""}>$</span>
      <style>{`
        .ccy { display: inline-flex; align-items: stretch; padding: 0; overflow: hidden;
          border: 1px solid var(--line-hi); border-radius: 10px; background: var(--panel); cursor: pointer; height: 42px; }
        .ccy span { display: grid; place-items: center; width: 34px; font-family: var(--font-mono); font-size: 14px;
          color: var(--text-mute); transition: background .15s, color .15s; }
        .ccy span.on { background: var(--green); color: var(--on-neon); font-weight: 700; }
      `}</style>
    </button>
  );
}
