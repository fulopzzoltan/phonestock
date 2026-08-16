import { brandColor } from "../lib/utils";
import { AppleIcon, SamsungIcon } from "./icons";

const BRAND_ICONS = { Apple: AppleIcon, Samsung: SamsungIcon };

// Márka-monogramos színes avatar — Telefonok táblázat/kártya és Szerviz kanban/history közös eleme.
// Néhány márkánál (Apple, Samsung) a monogram helyett egy felismerhető ikon jelenik meg.
export default function Thumb({ brand, size }) {
  const Icon = BRAND_ICONS[brand];
  return (
    <div className={`stk-thumb${size === "sm" ? " sm" : size === "lg" ? " lg" : ""}`} style={{ background: brandColor(brand) }}>
      {Icon ? <Icon /> : (brand || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}
