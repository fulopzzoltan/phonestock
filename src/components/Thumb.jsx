import { brandColor } from "../lib/utils";
import { AppleIcon } from "./icons";

// Márka-monogramos színes avatar — Telefonok táblázat/kártya és Szerviz kanban/history közös eleme.
// Apple-nél a monogram helyett a felismerhető alma-logó jelenik meg.
export default function Thumb({ brand, size }) {
  return (
    <div className={`stk-thumb${size === "sm" ? " sm" : ""}`} style={{ background: brandColor(brand) }}>
      {brand === "Apple" ? <AppleIcon /> : (brand || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}
