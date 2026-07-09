import { useEffect } from "react";

/* Reusable right-hand slide-in drawer. Matches CLAUDE.md wireframes 5b/5c. */
export default function Drawer({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div className={`dw-backdrop ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`dw ${open ? "open" : ""}`} role="dialog" aria-modal="true">
        <div className="dw-in">
          <div className="dw-head">
            <div>
              <h3>{title}</h3>
              {subtitle && <p className="dw-sub">{subtitle}</p>}
            </div>
            <button className="dw-close" onClick={onClose} aria-label="Close">×</button>
          </div>
          {children}
        </div>
      </aside>

      <style>{`
        .dw-backdrop { position: fixed; inset: 0; background: #04060580; backdrop-filter: blur(2px);
          opacity: 0; pointer-events: none; transition: opacity .2s; z-index: 60; }
        .dw-backdrop.open { opacity: 1; pointer-events: auto; }
        .dw { position: fixed; top: 0; right: 0; height: 100%; width: min(460px, 100%);
          background: var(--bg-1); border-left: 1px solid var(--line-hi);
          transform: translateX(100%); transition: transform .28s cubic-bezier(.4,0,.2,1);
          z-index: 70; overflow-y: auto; box-shadow: -30px 0 80px -30px #000; }
        .dw.open { transform: translateX(0); }
        .dw-in { padding: 26px; }
        .dw-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 8px; }
        .dw-head h3 { font-size: 22px; }
        .dw-sub { color: var(--text-soft); font-size: 13px; margin-top: 6px; max-width: 40ch; }
        .dw-close { background: none; border: none; color: var(--text-mute); font-size: 26px; line-height: 1;
          cursor: pointer; padding: 0; transition: color .15s; }
        .dw-close:hover { color: var(--text); }
      `}</style>
    </>
  );
}
