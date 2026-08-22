import { useState } from "react";
import {
  SettingsIcon, DashboardIcon, ServiceIcon, PhoneCaseIcon, BoardIcon,
  PartsIcon, FinanceIcon, CustomersIcon, WarrantyIcon, UsersNavIcon, TrashNavIcon, LogoutIcon, BuybackIcon, LeaveIcon, RepairPriceIcon, CashSettlementIcon, InvoiceIcon,
} from "./icons";

export default function Sidebar({
  tab, setTab, setTicketModal, isAdmin, locFilter, setLocFilter, allowedLocations,
  myLocationId, locName, profile, user, signOut, lastActiveLocationId,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Mobilon a fül-váltás (vagy az "Új munkalap" gyorsgomb) automatikusan zárja a lenyíló menüt,
  // hogy a felhasználó rögtön a kiválasztott tartalmat lássa, ne kelljen külön becsuknia.
  function go(nextTab) {
    setTab(nextTab);
    setMobileOpen(false);
  }
  return (
    <div className={`sidebar${mobileOpen ? " mobile-open" : ""}`}>
      <button type="button" className={`sidebar-mobile-bar${mobileOpen ? " open" : ""}`} onClick={() => setMobileOpen((v) => !v)}>
        <span className="sidebar-mobile-hamburger"><span /><span /><span /></span>
        <span className="sidebar-mobile-title">TELEFONOS</span>
      </button>
      <div className="sidebar-inner">
        <div className="nav-lbl">Napi munka</div>
        <button className={`navbtn ${tab === "pult" ? "active" : ""}`} onClick={() => go("pult")}><BoardIcon className="nav-ic" />Pult</button>
        <div className="navrow">
          <button className={`navbtn ${tab === "service" ? "active" : ""}`} onClick={() => go("service")}><ServiceIcon className="nav-ic" />Szerviz</button>
          <button type="button" className="nav-quick-add" title="Új munkalap" onClick={() => { go("service"); setTicketModal("add"); }}>+</button>
        </div>
        <button className={`navbtn ${tab === "stock" ? "active" : ""}`} onClick={() => go("stock")}><PhoneCaseIcon className="nav-ic" />Telefonok</button>
        <button className={`navbtn ${tab === "parts" ? "active" : ""}`} onClick={() => go("parts")}><PartsIcon className="nav-ic" />Alkatrészek</button>
        <button className={`navbtn ${tab === "customers" ? "active" : ""}`} onClick={() => go("customers")}><CustomersIcon className="nav-ic" />Kliensek</button>
        <button className={`navbtn ${tab === "warranty" ? "active" : ""}`} onClick={() => go("warranty")}><WarrantyIcon className="nav-ic" />Garancia</button>

        <div className="nav-lbl">Pénzügyek</div>
        <button className={`navbtn ${tab === "finance" ? "active" : ""}`} onClick={() => go("finance")}><FinanceIcon className="nav-ic" />Bevételek &amp; Kiadások</button>
        {isAdmin && (
          <button className={`navbtn ${tab === "invoices" ? "active" : ""}`} onClick={() => go("invoices")}><InvoiceIcon className="nav-ic" />Számlák</button>
        )}
        {isAdmin && (
          <button className={`navbtn ${tab === "cash-settlement" ? "active" : ""}`} onClick={() => go("cash-settlement")}><CashSettlementIcon className="nav-ic" />Elszámolás</button>
        )}

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
      </div>
      <div className="sidebar-bottom">
        <a className="shop-preview-link" href="/" target="_blank" rel="noopener noreferrer">Webshop megtekintése ↗</a>
        {isAdmin && !lastActiveLocationId && (
          <div style={{ fontSize: 11.5, color: "#B91C1C", marginBottom: 4, fontWeight: 600 }}>
            Válaszd ki, melyik üzletben vagy most ↓
          </div>
        )}
        {isAdmin ? (
          <div className="loc-sw">
            <button className={`loc-btn ${locFilter === "all" ? "active" : ""}`} onClick={() => setLocFilter("all")}>Mind</button>
            {allowedLocations.map((l) => (
              <button key={l.id} className={`loc-btn ${locFilter === l.id ? "active" : ""}`} onClick={() => setLocFilter(l.id)}>{l.name}</button>
            ))}
          </div>
        ) : (
          <div className="loc-static">{myLocationId ? locName(myLocationId) : "Nincs helyszín"}</div>
        )}
        <div className="user-row">
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
      </div>
    </div>
  );
}
