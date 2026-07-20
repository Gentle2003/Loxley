import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { connectWallet, registerRepo, SHERWOOD_ADDRESS, IS_LIVE, short } from "../lib/sherwood.js";

/* ------------------------------------------------------------------
   /cli — the wallet hand-off for the Loxley CLI.

   `loxley register` verifies GitHub ownership in the terminal, then opens
   this page with the registration params. The user connects the wallet they
   already have and signs; no private key ever goes near the CLI. The CLI
   watches the registry on-chain for the result, so this page doesn't need to
   call back to localhost.
   ------------------------------------------------------------------ */

export default function CliConnect() {
  const [params] = useSearchParams();
  const repoFullName = params.get("repo") || "";
  const symbol = (params.get("symbol") || "").toUpperCase();
  const supply = params.get("supply") || "";
  const language = params.get("language") || "";

  const [phase, setPhase] = useState("idle"); // idle|signing|done|error
  const [error, setError] = useState("");
  const [account, setAccount] = useState(null);
  const [txHash, setTxHash] = useState("");

  const valid = useMemo(
    () => /^[\w.-]+\/[\w.-]+$/.test(repoFullName) && /^[A-Z0-9]{2,6}$/.test(symbol) && /^\d+$/.test(supply) && Number(supply) > 0,
    [repoFullName, symbol, supply]
  );

  useEffect(() => { document.title = "Loxley CLI — confirm registration"; }, []);

  const run = async () => {
    setError("");
    setPhase("signing");
    try {
      const { walletClient, account: acct } = await connectWallet();
      setAccount(acct);
      const hash = await registerRepo(walletClient, acct, { repoFullName, language, symbol, supply });
      setTxHash(hash);
      setPhase("done");
    } catch (e) {
      setError(e?.shortMessage || e?.message || "Registration failed.");
      setPhase("error");
    }
  };

  return (
    <div className="wrap cli">
      <p className="eyebrow">Loxley CLI</p>
      <h1>Confirm registration</h1>

      {!IS_LIVE && (
        <p className="cli-warn">
          This deployment isn't pointed at a registry (VITE_SHERWOOD_ADDRESS is unset), so nothing can be
          registered from here.
        </p>
      )}

      {!valid ? (
        <p className="cli-warn">
          Missing or malformed registration details. Start from your terminal with{" "}
          <code>loxley register &lt;repo&gt;</code>.
        </p>
      ) : (
        <>
          <div className="card cli-card">
            <Row k="Repo" v={repoFullName} />
            <Row k="Arrow" v={`$${symbol}`} />
            <Row k="Supply" v={Number(supply).toLocaleString("en-US")} />
            {language && <Row k="Language" v={language} />}
            <Row k="Registry" v={short(SHERWOOD_ADDRESS) || "—"} />
          </div>

          {phase === "done" ? (
            <div className="cli-done">
              <p className="ok">Registered — {repoFullName} is in the Quiver.</p>
              <p className="soft mono">tx {short(txHash)}</p>
              <p className="soft">You can close this tab and return to your terminal.</p>
            </div>
          ) : (
            <>
              <button
                className="btn btn-primary cli-go"
                onClick={run}
                disabled={phase === "signing" || !IS_LIVE}
              >
                {phase === "signing" ? "Confirm in your wallet…" : "Connect wallet & register"}
              </button>
              {account && phase === "signing" && <p className="soft mono">connected {short(account)}</p>}
              {phase === "error" && <p className="cli-err">{error}</p>}
              <p className="cli-note">
                You'll pay network gas only — Loxley charges no registration fee. The Arrow supply is minted
                to the wallet you connect.
              </p>
            </>
          )}
        </>
      )}

      <style>{styles}</style>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="cli-row">
      <span className="cli-k">{k}</span>
      <span className="cli-v mono">{v}</span>
    </div>
  );
}

const styles = `
.cli { padding: 60px 24px 40px; max-width: 620px; }
.cli h1 { font-size: clamp(26px, 4vw, 36px); margin: 10px 0 22px; }
.cli-card { padding: 6px 20px; margin-bottom: 22px; }
.cli-row { display: flex; justify-content: space-between; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--line); }
.cli-row:last-child { border-bottom: none; }
.cli-k { font-family: var(--font-mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--text-mute); }
.cli-v { color: var(--text); font-size: 14.5px; text-align: right; word-break: break-all; }
.cli-go { width: 100%; justify-content: center; }
.cli-note { color: var(--text-mute); font-size: 12.5px; margin-top: 14px; line-height: 1.6; }
.cli-warn { color: var(--cash); font-size: 14px; line-height: 1.6; }
.cli-err { color: var(--danger); font-size: 13.5px; margin-top: 12px; line-height: 1.6; }
.cli-done .ok { color: var(--green); font-size: 16px; margin-bottom: 10px; }
.cli-done .soft { color: var(--text-soft); font-size: 13.5px; margin-top: 6px; }
`;
