import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { priceEth } from "../mocks/fakeChain.js";

/* Display currency for market values (price + market cap). Toggles between ETH
   and USD using a live ETH/USD rate. NOTE: this is testnet ETH — the USD figure
   is illustrative only (see the toggle tooltip + the site's testnet labels). */
const CurrencyContext = createContext(null);
export const useCurrency = () => useContext(CurrencyContext);

function usdFmt(v) {
  return "$" + v.toLocaleString("en-US", v >= 1 ? { maximumFractionDigits: 2 } : { maximumSignificantDigits: 3 });
}

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(() => {
    try { return localStorage.getItem("lox_ccy") || "ETH"; } catch { return "ETH"; }
  });
  const [ethUsd, setEthUsd] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
        const d = await r.json();
        if (!cancelled && d?.ethereum?.usd) setEthUsd(d.ethereum.usd);
      } catch { /* keep last value; USD shows a placeholder until it loads */ }
    };
    load();
    const id = setInterval(load, 120000); // refresh every 2 min
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const toggle = useCallback(() => {
    setCurrency((c) => {
      const next = c === "ETH" ? "USD" : "ETH";
      try { localStorage.setItem("lox_ccy", next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Format an ETH-denominated value in the selected currency.
  const money = useCallback((ethValue) => {
    if (!ethValue) return "—";
    if (currency === "USD") return ethUsd ? usdFmt(ethValue * ethUsd) : "…";
    return priceEth(ethValue);
  }, [currency, ethUsd]);

  return (
    <CurrencyContext.Provider value={{ currency, toggle, ethUsd, money }}>
      {children}
    </CurrencyContext.Provider>
  );
}
