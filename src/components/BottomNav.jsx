import { useState } from "react";
import {
  BoardIcon, ServiceIcon, PhoneCaseIcon, FinanceIcon, MoreIcon,
  PartsIcon, CustomersIcon, WarrantyIcon, CashSettlementIcon, InvoiceIcon, LeaveIcon,
  DashboardIcon, UsersNavIcon, TrashNavIcon, BuybackIcon, RepairPriceIcon, ReviewsIcon, PayrollIcon, ChatIcon, LockIcon, RefurbIcon,
} from "./icons";
import BottomSheet from "./BottomSheet";

// A "Telefonok" korábban itt volt fix tab, de a csapat-chat gyakoribb napi művelet mobilon
// (a ContentTopbar, ahol desktopon nyílik, mobilon el van rejtve) — ezért a chat vette át a
// helyét a fix sávban, a Telefonok pedig lejjebb, a "Több" lap Napi munka szekciójába költözött.
const FIXED_LEFT = [
  { key: "pult", label: "Pult", Icon: BoardIcon },
  { key: "service", label: "Szerviz", Icon: ServiceIcon },
];
const FIXED_RIGHT = [
  { key: "finance", label: "Cashflow", Icon: FinanceIcon },
];

export default function BottomNav({
  tab, setTab, isAdmin, pultPendingCounts, inboxUnreadCount, refurbCount,
  chatOpen, setChatOpen, chatUnread, markChatRead,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const fixedKeys = [...FIXED_LEFT, ...FIXED_RIGHT].map((f) => f.key);
  const isMoreActive = !fixedKeys.includes(tab);
  const pultTotal = pultPendingCounts ? pultPendingCounts.webOrders + pultPendingCounts.waiting + pultPendingCounts.notes : 0;

  function go(nextTab) {
    setTab(nextTab);
    setMoreOpen(false);
  }

  function renderFixed({ key, label, Icon }) {
    return (
      <button key={key} type="button" className={`bnav-btn${tab === key ? " active" : ""}`} onClick={() => go(key)}>
        <span className="bnav-ic-wrap">
          <Icon className="bnav-ic" />
          {key === "pult" && pultTotal > 0 && <span className="bnav-badge">{pultTotal}</span>}
        </span>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <>
      <nav className="bottom-nav">
        {FIXED_LEFT.map(renderFixed)}
        <button
          type="button"
          className={`bnav-btn${chatOpen ? " active" : ""}`}
          onClick={() => { setChatOpen((o) => !o); if (!chatOpen) markChatRead(); }}
        >
          <span className="bnav-ic-wrap">
            <ChatIcon className="bnav-ic" />
            {chatUnread > 0 && <span className="bnav-badge">{chatUnread > 9 ? "9+" : chatUnread}</span>}
          </span>
          <span>Chat</span>
        </button>
        {FIXED_RIGHT.map(renderFixed)}
        <button type="button" className={`bnav-btn${moreOpen || isMoreActive ? " active" : ""}`} onClick={() => setMoreOpen(true)}>
          <MoreIcon className="bnav-ic" /><span>Több</span>
        </button>
      </nav>

      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)}>
        <div className="nav-lbl" style={{ marginTop: 0 }}>Napi munka</div>
        <button className={`navbtn ${tab === "stock" ? "active" : ""}`} onClick={() => go("stock")}><PhoneCaseIcon className="nav-ic" />Telefonok</button>
        <button className={`navbtn ${tab === "parts" ? "active" : ""}`} onClick={() => go("parts")}><PartsIcon className="nav-ic" />Alkatrészek</button>
        <button className={`navbtn ${tab === "refurb" ? "active" : ""}`} onClick={() => go("refurb")}>
          <RefurbIcon className="nav-ic" />Felújítás
          {refurbCount > 0 && <span className="nav-pill-group"><span className="nav-pill amber">{refurbCount}</span></span>}
        </button>
        {!isAdmin && (
          <button className={`navbtn ${tab === "vault" ? "active" : ""}`} onClick={() => go("vault")}><LockIcon className="nav-ic" />Belépések</button>
        )}

        <div className="nav-lbl">Ügyfelek</div>
        <button className={`navbtn ${tab === "inbox" ? "active" : ""}`} onClick={() => go("inbox")}>
          <ChatIcon className="nav-ic" />Üzenetek
          {inboxUnreadCount > 0 && <span className="nav-pill-group"><span className="nav-pill blue">{inboxUnreadCount}</span></span>}
        </button>
        <button className={`navbtn ${tab === "customers" ? "active" : ""}`} onClick={() => go("customers")}><CustomersIcon className="nav-ic" />Kliensek</button>
        <button className={`navbtn ${tab === "warranty" ? "active" : ""}`} onClick={() => go("warranty")}><WarrantyIcon className="nav-ic" />Garancia</button>

        <div className="nav-lbl">Pénzügyek</div>
        {isAdmin && (
          <button className={`navbtn ${tab === "cash-settlement" ? "active" : ""}`} onClick={() => go("cash-settlement")}><CashSettlementIcon className="nav-ic" />Elszámolás</button>
        )}
        {isAdmin && (
          <button className={`navbtn ${tab === "payroll" ? "active" : ""}`} onClick={() => go("payroll")}><PayrollIcon className="nav-ic" />Költségek</button>
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
            <button className={`navbtn ${tab === "vault" ? "active" : ""}`} onClick={() => go("vault")}><LockIcon className="nav-ic" />Belépések</button>
            <button className={`navbtn ${tab === "trash" ? "active" : ""}`} onClick={() => go("trash")}><TrashNavIcon className="nav-ic" />Kuka</button>

            <div className="nav-lbl">Webshop</div>
            <button className={`navbtn ${tab === "buyback" ? "active" : ""}`} onClick={() => go("buyback")}><BuybackIcon className="nav-ic" />Felvásárlás</button>
            <button className={`navbtn ${tab === "repair-prices" ? "active" : ""}`} onClick={() => go("repair-prices")}><RepairPriceIcon className="nav-ic" />Szerviz árbecslő</button>
            <button className={`navbtn ${tab === "reviews" ? "active" : ""}`} onClick={() => go("reviews")}><ReviewsIcon className="nav-ic" />Vélemények</button>
          </>
        )}
      </BottomSheet>
    </>
  );
}
