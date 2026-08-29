import { useState, useRef, useEffect } from "react";
import {
  SettingsIcon, DashboardIcon, ServiceIcon, PhoneCaseIcon, BoardIcon,
  PartsIcon, FinanceIcon, CustomersIcon, WarrantyIcon, UsersNavIcon, TrashNavIcon, LogoutIcon, BuybackIcon, LeaveIcon, RepairPriceIcon, CashSettlementIcon, InvoiceIcon, ReviewsIcon,
  PinIcon, ChevronDownIcon, ExternalLinkIcon,
} from "./icons";
import { SITE_URL } from "../lib/utils";

const ADMIN_GROUP_TABS = ["dashboard", "leave", "users", "trash"];

// Mobilon (<=640px) ez a teljes komponens el van rejtve — ott a BottomNav.jsx veszi át a
// navigáció szerepét (alsó sáv + "Több" bottom sheet), hogy applikáció-szerű legyen a felület.
export default function Sidebar({
  tab, setTab, setTicketModal, isAdmin, locFilter, setLocFilter, allowedLocations,
  myLocationId, locName, profile, user, signOut, lastActiveLocationId, pultPendingCounts,
}) {
  const [locMenuOpen, setLocMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const locMenuRef = useRef(null);

  // Ha valaki (pl. egy másik fülről mutató linkkel) az Admin-csoport valamelyik
  // aloldalára érkezik, a csoport nyíljon ki magától, hogy lássa, hol tart.
  useEffect(() => {
    if (ADMIN_GROUP_TABS.includes(tab)) setAdminOpen(true);
  }, [tab]);

  useEffect(() => {
    function onClickOutside(e) {
      if (locMenuRef.current && !locMenuRef.current.contains(e.target)) setLocMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function go(nextTab) {
    setTab(nextTab);
  }

  const currentLocLabel = isAdmin
    ? (locFilter === "all" ? "Mind" : (allowedLocations.find((l) => l.id === locFilter)?.name || "Mind"))
    : (myLocationId ? locName(myLocationId) : "Nincs helyszín");

  return (
    <div className="sidebar">
      <div className="util-row">
        {isAdmin ? (
          <div className="loc-drop-wrap" ref={locMenuRef}>
            <button type="button" className="loc-drop" onClick={() => setLocMenuOpen((v) => !v)}>
              <span className="loc-drop-left"><PinIcon width={12} height={12} />{currentLocLabel}</span>
              <ChevronDownIcon width={10} height={10} />
            </button>
            {locMenuOpen && (
              <div className="loc-drop-menu">
                <button type="button" className={`loc-drop-item${locFilter === "all" ? " active" : ""}`} onClick={() => { setLocFilter("all"); setLocMenuOpen(false); }}>Mind</button>
                {allowedLocations.map((l) => (
                  <button key={l.id} type="button" className={`loc-drop-item${locFilter === l.id ? " active" : ""}`} onClick={() => { setLocFilter(l.id); setLocMenuOpen(false); }}>{l.name}</button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="loc-drop static"><span className="loc-drop-left"><PinIcon width={12} height={12} />{currentLocLabel}</span></div>
        )}
        <a className="util-icon-btn" href={SITE_URL} target="_blank" rel="noopener noreferrer" title="Webshop megtekintése">
          <ExternalLinkIcon width={14} height={14} />
        </a>
      </div>

      <div className="sidebar-inner">
        {isAdmin && !lastActiveLocationId && (
          <div style={{ fontSize: 11, color: "#B91C1C", marginBottom: 10, fontWeight: 600, padding: "0 12px" }}>
            Válaszd ki, melyik üzletben vagy most ↑
          </div>
        )}
        <div className="nav-lbl">Napi munka</div>
        <button className={`navbtn ${tab === "pult" ? "active" : ""}`} onClick={() => go("pult")}>
          <BoardIcon className="nav-ic" />Pult
          {pultPendingCounts && (
            <span className="nav-pill-group">
              {pultPendingCounts.webOrders > 0 && <span className="nav-pill blue" title="Webes rendelés">{pultPendingCounts.webOrders}</span>}
              {pultPendingCounts.waiting > 0 && <span className="nav-pill amber" title="Várakozik valamire">{pultPendingCounts.waiting}</span>}
              {pultPendingCounts.notes > 0 && <span className="nav-pill violet" title="Nyitott cetli">{pultPendingCounts.notes}</span>}
            </span>
          )}
        </button>
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
          <button className={`navbtn ${tab === "cash-settlement" ? "active" : ""}`} onClick={() => go("cash-settlement")}><CashSettlementIcon className="nav-ic" />Elszámolás</button>
        )}
        <button className={`navbtn ${tab === "invoices" ? "active" : ""}`} onClick={() => go("invoices")}><InvoiceIcon className="nav-ic" />Számlák</button>

        {!isAdmin && (
          <button className={`navbtn ${tab === "leave" ? "active" : ""}`} onClick={() => go("leave")}><LeaveIcon className="nav-ic" />Szabadság</button>
        )}

        {isAdmin && (
          <>
            <div className="nav-lbl">Webshop</div>
            <button className={`navbtn ${tab === "buyback" ? "active" : ""}`} onClick={() => go("buyback")}><BuybackIcon className="nav-ic" />Felvásárlás</button>
            <button className={`navbtn ${tab === "repair-prices" ? "active" : ""}`} onClick={() => go("repair-prices")}><RepairPriceIcon className="nav-ic" />Szerviz árbecslő</button>
            <button className={`navbtn ${tab === "reviews" ? "active" : ""}`} onClick={() => go("reviews")}><ReviewsIcon className="nav-ic" />Vélemények</button>

            <button type="button" className="group-toggle" onClick={() => setAdminOpen((v) => !v)}>
              Admin
              <ChevronDownIcon width={10} height={10} style={{ transform: adminOpen ? "none" : "rotate(-90deg)", transition: "transform .15s" }} />
            </button>
            {adminOpen && (
              <div className="group-body">
                <button className={`navbtn ${tab === "dashboard" ? "active" : ""}`} onClick={() => go("dashboard")}><DashboardIcon className="nav-ic" />Áttekintés</button>
                <button className={`navbtn ${tab === "leave" ? "active" : ""}`} onClick={() => go("leave")}><LeaveIcon className="nav-ic" />Szabadság</button>
                <button className={`navbtn ${tab === "users" ? "active" : ""}`} onClick={() => go("users")}><UsersNavIcon className="nav-ic" />Felhasználók</button>
                <button className={`navbtn ${tab === "trash" ? "active" : ""}`} onClick={() => go("trash")}><TrashNavIcon className="nav-ic" />Kuka</button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="sidebar-bottom">
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
