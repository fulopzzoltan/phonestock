import {
  DashboardIcon, ServiceIcon, PhoneCaseIcon, BoardIcon,
  PartsIcon, FinanceIcon, CustomersIcon, WarrantyIcon, UsersNavIcon, TrashNavIcon, BuybackIcon, LeaveIcon, RepairPriceIcon, CashSettlementIcon, InvoiceIcon, ReviewsIcon,
} from "./icons";

// Mobilon (<=640px) ez a teljes komponens el van rejtve — ott a BottomNav.jsx veszi át a
// navigáció szerepét (alsó sáv + "Több" bottom sheet), hogy applikáció-szerű legyen a felület.
// A helyszín-választó, webshop-link, chat és felhasználói menü a ContentTopbar-ban van.
export default function Sidebar({
  tab, setTab, isAdmin, lastActiveLocationId, pultPendingCounts,
}) {
  function go(nextTab) {
    setTab(nextTab);
  }

  return (
    <div className="sidebar">
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
        <button className={`navbtn ${tab === "service" ? "active" : ""}`} onClick={() => go("service")}><ServiceIcon className="nav-ic" />Szerviz</button>
        <button className={`navbtn ${tab === "stock" ? "active" : ""}`} onClick={() => go("stock")}><PhoneCaseIcon className="nav-ic" />Telefonok</button>
        <button className={`navbtn ${tab === "parts" ? "active" : ""}`} onClick={() => go("parts")}><PartsIcon className="nav-ic" />Alkatrészek</button>
        <button className={`navbtn ${tab === "customers" ? "active" : ""}`} onClick={() => go("customers")}><CustomersIcon className="nav-ic" />Kliensek</button>
        <button className={`navbtn ${tab === "warranty" ? "active" : ""}`} onClick={() => go("warranty")}><WarrantyIcon className="nav-ic" />Garancia</button>

        <div className="nav-lbl">Pénzügyek</div>
        <button className={`navbtn ${tab === "finance" ? "active" : ""}`} onClick={() => go("finance")}><FinanceIcon className="nav-ic" />Bevételek és Kiadások</button>
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

            <div className="nav-lbl">Admin</div>
            <button className={`navbtn ${tab === "dashboard" ? "active" : ""}`} onClick={() => go("dashboard")}><DashboardIcon className="nav-ic" />Áttekintés</button>
            <button className={`navbtn ${tab === "leave" ? "active" : ""}`} onClick={() => go("leave")}><LeaveIcon className="nav-ic" />Szabadság</button>
            <button className={`navbtn ${tab === "users" ? "active" : ""}`} onClick={() => go("users")}><UsersNavIcon className="nav-ic" />Felhasználók</button>
            <button className={`navbtn ${tab === "trash" ? "active" : ""}`} onClick={() => go("trash")}><TrashNavIcon className="nav-ic" />Kuka</button>
          </>
        )}
      </div>
    </div>
  );
}
