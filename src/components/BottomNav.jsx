import { useState } from "react";
import {
  BoardIcon, ServiceIcon, PhoneCaseIcon, FinanceIcon, MoreIcon,
  PartsIcon, CustomersIcon, WarrantyIcon, CashSettlementIcon, InvoiceIcon, LeaveIcon,
  DashboardIcon, UsersNavIcon, TrashNavIcon, BuybackIcon, RepairPriceIcon, SettingsIcon, LogoutIcon,
} from "./icons";
import BottomSheet from "./BottomSheet";
import { SITE_URL } from "../lib/utils";

const FIXED = [
  { key: "pult", label: "Pult", Icon: BoardIcon },
  { key: "service", label: "Szerviz", Icon: ServiceIcon },
  { key: "stock", label: "Telefonok", Icon: PhoneCaseIcon },
  { key: "finance", label: "Bevétel", Icon: FinanceIcon },
];

export default function BottomNav({
  tab, setTab, isAdmin, locFilter, setLocFilter, allowedLocations,
  myLocationId, locName, profile, user, signOut,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const fixedKeys = FIXED.map((f) => f.key);
  const isMoreActive = !fixedKeys.includes(tab);

  function go(nextTab) {
    setTab(nextTab);
    setMoreOpen(false);
  }

  return (
    <>
      <nav className="bottom-nav">
        {FIXED.map(({ key, label, Icon }) => (
          <button key={key} type="button" className={`bnav-btn${tab === key ? " active" : ""}`} onClick={() => go(key)}>
            <Icon className="bnav-ic" /><span>{label}</span>
          </button>
        ))}
        <button type="button" className={`bnav-btn${moreOpen || isMoreActive ? " active" : ""}`} onClick={() => setMoreOpen(true)}>
          <MoreIcon className="bnav-ic" /><span>Több</span>
        </button>
      </nav>

      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)}>
        <div className="nav-lbl" style={{ marginTop: 0 }}>Napi munka</div>
        <button className={`navbtn ${tab === "parts" ? "active" : ""}`} onClick={() => go("parts")}><PartsIcon className="nav-ic" />Alkatrészek</button>
        <button className={`navbtn ${tab === "customers" ? "active" : ""}`} onClick={() => go("customers")}><CustomersIcon className="nav-ic" />Kliensek</button>
        <button className={`navbtn ${tab === "warranty" ? "active" : ""}`} onClick={() => go("warranty")}><WarrantyIcon className="nav-ic" />Garancia</button>

        <div className="nav-lbl">Pénzügyek</div>
        {isAdmin && (
          <button className={`navbtn ${tab === "cash-settlement" ? "active" : ""}`} onClick={() => go("cash-settlement")}><CashSettlementIcon className="nav-ic" />Elszámolás</button>
        )}
        <button className={`navbtn ${tab === "invoices" ? "active" : ""}`} onClick={() => go("invoices")}><InvoiceIcon className="nav-ic" />Számlák</button>
        {!isAdmin && (
          <button className={`navbtn ${tab === "leave" ? "active" : ""}`} onClick={() => go("leave")}><LeaveIcon className="nav-ic" />Szabadság</button>
        )}

        {isAdmin && (
          <>
            <div className="nav-lbl">Admin</div>
            <button className={`navbtn ${tab === "dashboard" ? "active" : ""}`} onClick={() => go("dashboard")}><DashboardIcon className="nav-ic" />Áttekintés</button>
            <button className={`navbtn ${tab === "leave" ? "active" : ""}`} onClick={() => go("leave")}><LeaveIcon className="nav-ic" />Szabadság</button>
            <button className={`navbtn ${tab === "users" ? "active" : ""}`} onClick={() => go("users")}><UsersNavIcon className="nav-ic" />Felhasználók</button>
            <button className={`navbtn ${tab === "trash" ? "active" : ""}`} onClick={() => go("trash")}><TrashNavIcon className="nav-ic" />Kuka</button>

            <div className="nav-lbl">Webshop</div>
            <button className={`navbtn ${tab === "buyback" ? "active" : ""}`} onClick={() => go("buyback")}><BuybackIcon className="nav-ic" />Felvásárlás</button>
            <button className={`navbtn ${tab === "repair-prices" ? "active" : ""}`} onClick={() => go("repair-prices")}><RepairPriceIcon className="nav-ic" />Szerviz árbecslő</button>
          </>
        )}

        <div className="nav-lbl">Fiók</div>
        <a className="shop-preview-link" href={SITE_URL} target="_blank" rel="noopener noreferrer">Webshop megtekintése ↗</a>
        {isAdmin ? (
          <div className="loc-sw" style={{ marginTop: 8 }}>
            <button className={`loc-btn ${locFilter === "all" ? "active" : ""}`} onClick={() => setLocFilter("all")}>Mind</button>
            {allowedLocations.map((l) => (
              <button key={l.id} className={`loc-btn ${locFilter === l.id ? "active" : ""}`} onClick={() => setLocFilter(l.id)}>{l.name}</button>
            ))}
          </div>
        ) : (
          <div className="loc-static" style={{ marginTop: 8 }}>{myLocationId ? locName(myLocationId) : "Nincs helyszín"}</div>
        )}
        <div className="user-row" style={{ marginTop: 8 }}>
          <div className="user-avatar">{(profile?.fullName || user?.email || "?").slice(0, 1).toUpperCase()}</div>
          <div className="user-meta">
            <div className="user-name">{profile?.fullName || user?.email}</div>
            <div className="user-role">{isAdmin ? "Admin" : "Alkalmazott"}</div>
          </div>
          <button className={`logout-btn ${tab === "settings" ? "active" : ""}`} title="Beállítások" onClick={() => go("settings")}>
            <SettingsIcon />
          </button>
          <button className="logout-btn" title="Kijelentkezés" onClick={signOut}>
            <LogoutIcon />
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
