import { useState } from "react";
import { LeaveIcon, DashboardIcon, UsersNavIcon, TrashNavIcon, BuybackIcon, RepairPriceIcon, ReviewsIcon, LockIcon, MoreIcon, RefurbIcon, CashSettlementIcon, PayrollIcon } from "./icons";
import {
  AppIcon, Toggle, Wrench, Phone, Chip, Bubble, People, Shield, Euro,
  Lock,
} from "./MacDock";
import BottomSheet from "./BottomSheet";

// A mobil alsó sáv és a "Több" lap most ugyanazt a vizuális nyelvet követi, mint a
// desktop Mac-dokk: színes, gradiens "app-ikon" csempék egyszerű egyszínű glyphok
// helyett — konzisztencia a két nézet között. A "Több" lap pedig szándékosan iOS
// kezdőképernyő-szerű rács, nem függőleges lista — egy pillantásra átláthatóbb,
// és illik a dokk-metaforához (macOS dokk asztalon, iOS rács mobilon).
const FIXED = [
  { key: "pult", label: "Pult", icon: <AppIcon from="#1DB954" to="#159C46" size={36} radius={11}><Toggle stroke="#fff" width={19} height={19} /></AppIcon> },
  { key: "service", label: "Szerviz", icon: <AppIcon from="#FB923C" to="#EA580C" size={36} radius={11}><Wrench stroke="#fff" width={19} height={19} /></AppIcon> },
];

const MORE_SECTIONS = [
  {
    label: "Napi munka",
    items: [
      { key: "stock", label: "Telefonok", from: "#22D3EE", to: "#0891B2", Icon: Phone, countKey: "refurb" },
      { key: "consignment", label: "Bizomány", from: "#67E8F9", to: "#0E7490", Icon: Phone },
      { key: "refurb", label: "Felújítás", from: "#38BDF8", to: "#0369A1", Icon: RefurbIcon },
      { key: "parts", label: "Alkatrészek", from: "#A78BFA", to: "#7C3AED", Icon: Chip },
      { key: "vault", label: "Belépések", from: "#94A3B8", to: "#1E293B", Icon: Lock, employeeOnly: true },
    ],
  },
  {
    label: "Ügyfelek",
    items: [
      { key: "customers", label: "Kliensek", from: "#F472B6", to: "#DB2777", Icon: People },
      { key: "warranty", label: "Garancia", from: "#818CF8", to: "#4F46E5", Icon: Shield },
    ],
  },
  {
    label: "Pénzügyek",
    items: [
      { key: "leave", label: "Szabadság", from: "#2DD4BF", to: "#0D9488", Icon: LeaveIcon, employeeOnly: true },
      { key: "cash-settlement", label: "Elszámolás", from: "#FCD34D", to: "#B45309", Icon: CashSettlementIcon, adminOnly: true },
      { key: "payroll", label: "Költségek", from: "#FDBA74", to: "#C2410C", Icon: PayrollIcon, adminOnly: true },
    ],
  },
  {
    label: "Admin",
    adminOnly: true,
    items: [
      { key: "dashboard", label: "Áttekintés", from: "#60A5FA", to: "#2563EB", Icon: DashboardIcon },
      { key: "leave", label: "Szabadság", from: "#2DD4BF", to: "#0D9488", Icon: LeaveIcon },
      { key: "users", label: "Felhasználók", from: "#C084FC", to: "#7E22CE", Icon: UsersNavIcon },
      { key: "vault", label: "Belépések", from: "#94A3B8", to: "#1E293B", Icon: LockIcon },
      { key: "trash", label: "Kuka", from: "#F87171", to: "#B91C1C", Icon: TrashNavIcon },
    ],
  },
  {
    label: "Webshop",
    adminOnly: true,
    items: [
      { key: "buyback", label: "Felvásárlás", from: "#2DD4BF", to: "#0D9488", Icon: BuybackIcon },
      { key: "repair-prices", label: "Szerviz árbecslő", from: "#FB923C", to: "#C2410C", Icon: RepairPriceIcon },
      { key: "reviews", label: "Vélemények", from: "#FDE047", to: "#CA8A04", Icon: ReviewsIcon },
    ],
  },
];

export default function BottomNav({
  tab, setTab, isAdmin, pultPendingCounts, inboxUnreadCount, refurbCount,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const fixedKeys = [...FIXED.map((f) => f.key), "finance", "cash-settlement", "payroll", "inbox"];
  const isMoreActive = !fixedKeys.includes(tab);
  const pultTotal = pultPendingCounts ? pultPendingCounts.webOrders + pultPendingCounts.waiting + pultPendingCounts.notes : 0;
  const counts = { refurb: refurbCount, inbox: inboxUnreadCount };
  const moreItems = MORE_SECTIONS.filter((s) => !s.adminOnly || isAdmin)
    .flatMap((section) => section.items.filter((it) => (!it.employeeOnly || !isAdmin) && (!it.adminOnly || isAdmin)));

  function go(nextTab) {
    setTab(nextTab);
    setMoreOpen(false);
  }

  return (
    <>
      <nav className="bottom-nav">
        {FIXED.map(({ key, label, icon }) => (
          <button key={key} type="button" title={label} className={`bnav-btn${tab === key ? " active" : ""}`} onClick={() => go(key)}>
            <span className="bnav-ic-wrap">
              {icon}
              {key === "pult" && pultTotal > 0 && <span className="bnav-badge">{pultTotal}</span>}
            </span>
          </button>
        ))}
        <button type="button" title="Árulás" className={`bnav-btn${tab === "finance" || tab === "cash-settlement" || tab === "payroll" ? " active" : ""}`} onClick={() => go("finance")}>
          <span className="bnav-ic-wrap"><AppIcon from="#FBBF24" to="#D97706" size={36} radius={11}><Euro stroke="#fff" width={19} height={19} /></AppIcon></span>
        </button>
        <button type="button" title="Üzenetek" className={`bnav-btn${tab === "inbox" ? " active" : ""}`} onClick={() => go("inbox")}>
          <span className="bnav-ic-wrap">
            <AppIcon from="#34D399" to="#047857" size={36} radius={11}><Bubble stroke="#fff" width={19} height={19} /></AppIcon>
            {inboxUnreadCount > 0 && <span className="bnav-badge">{inboxUnreadCount > 9 ? "9+" : inboxUnreadCount}</span>}
          </span>
        </button>
        <button type="button" title="Több" className={`bnav-btn${moreOpen || isMoreActive ? " active" : ""}`} onClick={() => setMoreOpen(true)}>
          <span className="bnav-ic-wrap"><AppIcon from="#9CA3AF" to="#4B5563" size={36} radius={11}><MoreIcon stroke="#fff" width={19} height={19} /></AppIcon></span>
        </button>
      </nav>

      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)}>
        <div className="ios-app-grid">
          {Array.from({ length: (4 - (moreItems.length % 4)) % 4 }).map((_, i) => (
            <span key={`pad${i}`} className="ios-app-pad" aria-hidden="true" />
          ))}
          {moreItems.map(({ key, label, from, to, Icon, countKey, activeAlso }) => {
            const count = countKey ? counts[countKey] : 0;
            const active = tab === key || activeAlso?.includes(tab);
            return (
              <button key={key + label} type="button" className={`ios-app${active ? " active" : ""}`} onClick={() => go(key)}>
                <span className="ios-app-icon-wrap">
                  <AppIcon from={from} to={to} size={54} radius={14}><Icon stroke="#fff" width={24} height={24} /></AppIcon>
                  {count > 0 && <span className="ios-app-badge">{count > 99 ? "99+" : count}</span>}
                </span>
                <span className="ios-app-label">{label}</span>
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
