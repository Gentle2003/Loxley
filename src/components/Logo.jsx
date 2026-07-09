/* Loxley arrow-mark — a bow-drawn arrow pointing up-right (growth). */
export default function Logo({ size = 34 }) {
  return (
    <span
      className="lox-glyph"
      style={{
        width: size, height: size,
        display: "grid", placeItems: "center",
        background: "linear-gradient(140deg,#0f1512,#050706)",
        border: "1px solid var(--line-hi)",
        borderRadius: 9, color: "var(--green)",
        boxShadow: "0 0 20px -6px var(--green-glow)",
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21 21 3" />
        <path d="M21 3h-6M21 3v6" />
        <path d="M3 21l4-1-3-3-1 4z" />
      </svg>
    </span>
  );
}
