import mark from "../assets/loxley-mark.png";

/* Loxley feather-mark — the neon logo asset with a real transparent
   background (alpha baked from brightness), so it sits cleanly on any
   surface. Landscape mark: `size` sets its height; width follows aspect. */
export default function Logo({ size = 30 }) {
  return (
    <img
      src={mark}
      alt="Loxley"
      draggable={false}
      style={{
        height: size,
        width: "auto",
        display: "block",
        userSelect: "none",
      }}
    />
  );
}
