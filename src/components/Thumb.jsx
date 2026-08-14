import { brandColor } from "../lib/utils";

// Márka-monogramos színes avatar — Telefonok táblázat/kártya és Szerviz kanban/history közös eleme.
export default function Thumb({ brand, size }) {
  return (
    <div className={`stk-thumb${size === "sm" ? " sm" : ""}`} style={{ background: brandColor(brand) }}>
      {(brand || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}
