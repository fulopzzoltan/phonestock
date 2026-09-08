import { BuybackIcon, RepairPriceIcon, ReviewsIcon, DashboardIcon, LeaveIcon, UsersNavIcon, TrashNavIcon, LockIcon } from "./icons";

// Mac-stílusú lebegő dokk a Pult oldalhoz — a Sidebar-t helyettesíti csak ezen a fülön
// (lásd App.jsx: tab === "pult" esetén MacDock, egyébként Sidebar). A napi munka ikonjai
// (Pult…Felújítás) mindig kint vannak; a ritkábban nyitott csoportok (Ügyfelek, Pénzügyek,
// Webshop, Admin) egy-egy ikonba sűrítve, fölé vitt egérrel nyílnak ki — ugyanaz a mintázat,
// amit a design-canvason ("Pult — Mac Dokk Irányok" A-verzió) jóváhagytunk.
function Home(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /></svg>; }
function Wrench(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a6 6 0 0 1-7.9 7.9L6.4 20.6a2.1 2.1 0 0 1-3-3L10.2 10.8a6 6 0 0 1 7.9-7.9Z" /></svg>; }
function Phone(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M10 18h4" /></svg>; }
function Chip(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="7" y="7" width="10" height="10" rx="1.6" /><path d="M9 7V3.5M12 7V3.5M15 7V3.5M9 21v-3.5M12 21v-3.5M15 21v-3.5M7 9H3.5M7 12H3.5M7 15H3.5M17 9h3.5M17 12h3.5M17 15h3.5" /></svg>; }
function Refresh(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></svg>; }
function Bubble(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.6 8.6 0 0 1-3.3-.7L3 20l1-4.9A8.3 8.3 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" /></svg>; }
function People(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="3.6" /><path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" /></svg>; }
function Shield(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 4 6v6c0 5 3.4 8.7 8 9.9 4.6-1.2 8-4.9 8-9.9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>; }
function Wallet(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M3 10h18" /><circle cx="16.5" cy="14.3" r="1.3" /></svg>; }
function TrendCard(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M7 15l3.5-4 3 2.5L18 8" /></svg>; }
function ClipboardCheck(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 11.2 11.2 13.5 15.5 8.5" /><rect x="3" y="4" width="18" height="16" rx="2.5" /></svg>; }
function Invoice(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="3" width="16" height="18" rx="2.5" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>; }
function Bag(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>; }
function Lock(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="5" y="11" width="14" height="9" rx="2.2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /><circle cx="12" cy="15" r="1.1" /><path d="M12 16.1v1.4" /></svg>; }

function DockItem({ label, icon, active, badge, onClick }) {
  return (
    <button type="button" className={`md-item${active ? " active" : ""}`} onClick={onClick} title={label}>
      <span className="md-label">{label}</span>
      {icon}
      {badge > 0 && <span className="md-badge">{badge > 9 ? "9+" : badge}</span>}
      <span className="md-dot" />
    </button>
  );
}

function DockCluster({ label, icon, active, badge, children }) {
  return (
    <div className={`md-item md-cluster${active ? " active" : ""}`}>
      <span className="md-label">{label}</span>
      {icon}
      {badge > 0 && <span className="md-badge">{badge > 9 ? "9+" : badge}</span>}
      <span className="md-dot" />
      <div className="md-flyout">{children}</div>
    </div>
  );
}

export default function MacDock({ tab, setTab, isAdmin, inboxUnreadCount, refurbCount }) {
  function go(t) { return () => setTab(t); }
  const WEBSHOP_TABS = ["buyback", "repair-prices", "reviews"];
  const ADMIN_TABS = ["dashboard", "leave", "users", "vault", "trash"];

  return (
    <div className="md-wrap">
      <div className="md-dock">
        <DockItem label="Pult" icon={<Home />} active={tab === "pult"} onClick={go("pult")} />
        <DockItem label="Szerviz" icon={<Wrench />} active={tab === "service"} onClick={go("service")} />
        <DockItem label="Telefonok" icon={<Phone />} active={tab === "stock"} onClick={go("stock")} />
        <DockItem label="Alkatrészek" icon={<Chip />} active={tab === "parts"} onClick={go("parts")} />
        <DockItem label="Felújítás" icon={<Refresh />} active={tab === "refurb"} badge={refurbCount} onClick={go("refurb")} />
        {!isAdmin && <DockItem label="Belépések" icon={<Lock />} active={tab === "vault"} onClick={go("vault")} />}

        <div className="md-sep" />

        <DockItem label="Üzenetek" icon={<Bubble />} active={tab === "inbox"} badge={inboxUnreadCount} onClick={go("inbox")} />
        <DockItem label="Kliensek" icon={<People />} active={tab === "customers"} onClick={go("customers")} />
        <DockItem label="Garancia" icon={<Shield />} active={tab === "warranty"} onClick={go("warranty")} />

        <div className="md-sep" />

        <DockItem label="Árulás" icon={<TrendCard />} active={tab === "finance"} onClick={go("finance")} />
        {isAdmin && <DockItem label="Elszámolás" icon={<ClipboardCheck />} active={tab === "cash-settlement"} onClick={go("cash-settlement")} />}
        {isAdmin && <DockItem label="Költségek" icon={<Wallet />} active={tab === "payroll"} onClick={go("payroll")} />}
        <DockItem label="Számlák" icon={<Invoice />} active={tab === "invoices"} onClick={go("invoices")} />
        {!isAdmin && <DockItem label="Szabadság" icon={<LeaveIcon />} active={tab === "leave"} onClick={go("leave")} />}

        {isAdmin && (
          <>
            <div className="md-sep" />
            <DockCluster label="Webshop" icon={<Bag />} active={WEBSHOP_TABS.includes(tab)}>
              <DockItem label="Felvásárlás" icon={<BuybackIcon />} active={tab === "buyback"} onClick={go("buyback")} />
              <DockItem label="Szerviz árbecslő" icon={<RepairPriceIcon />} active={tab === "repair-prices"} onClick={go("repair-prices")} />
              <DockItem label="Vélemények" icon={<ReviewsIcon />} active={tab === "reviews"} onClick={go("reviews")} />
            </DockCluster>
            <DockCluster label="Admin" icon={<Lock />} active={ADMIN_TABS.includes(tab)}>
              <DockItem label="Áttekintés" icon={<DashboardIcon />} active={tab === "dashboard"} onClick={go("dashboard")} />
              <DockItem label="Szabadság" icon={<LeaveIcon />} active={tab === "leave"} onClick={go("leave")} />
              <DockItem label="Felhasználók" icon={<UsersNavIcon />} active={tab === "users"} onClick={go("users")} />
              <DockItem label="Belépések" icon={<LockIcon />} active={tab === "vault"} onClick={go("vault")} />
              <DockItem label="Kuka" icon={<TrashNavIcon />} active={tab === "trash"} onClick={go("trash")} />
            </DockCluster>
          </>
        )}
      </div>
    </div>
  );
}
