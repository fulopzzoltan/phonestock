import { BuybackIcon, RepairPriceIcon, ReviewsIcon, DashboardIcon, LeaveIcon, UsersNavIcon, TrashNavIcon, LockIcon } from "./icons";

// Mac-stílusú lebegő dokk a Pult oldalhoz — a Sidebar-t helyettesíti csak ezen a fülön
// (lásd App.jsx: tab === "pult" esetén MacDock, egyébként Sidebar). A napi munka ikonjai
// (Pult…Felújítás) mindig kint vannak; a ritkábban nyitott csoportok (Ügyfelek, Pénzügyek,
// Webshop, Admin) egy-egy ikonba sűrítve, fölé vitt egérrel nyílnak ki — ugyanaz a mintázat,
// amit a design-canvason ("Pult — Mac Dokk Irányok" A-verzió) jóváhagytunk.
export function Home(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /></svg>; }
export function Wrench(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a6 6 0 0 1-7.9 7.9L6.4 20.6a2.1 2.1 0 0 1-3-3L10.2 10.8a6 6 0 0 1 7.9-7.9Z" /></svg>; }
export function Phone(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M10 18h4" /></svg>; }
export function Chip(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="7" y="7" width="10" height="10" rx="1.6" /><path d="M9 7V3.5M12 7V3.5M15 7V3.5M9 21v-3.5M12 21v-3.5M15 21v-3.5M7 9H3.5M7 12H3.5M7 15H3.5M17 9h3.5M17 12h3.5M17 15h3.5" /></svg>; }
export function Refresh(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></svg>; }
export function Bubble(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.6 8.6 0 0 1-3.3-.7L3 20l1-4.9A8.3 8.3 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" /></svg>; }
export function People(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="3.6" /><path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" /></svg>; }
export function Shield(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 4 6v6c0 5 3.4 8.7 8 9.9 4.6-1.2 8-4.9 8-9.9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>; }
export function Wallet(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 8.5V6.8a2 2 0 0 0-2-2H6a2 2 0 0 0 0 4h14v3.2" /><path d="M4 6v13a2 2 0 0 0 2 2h14v-5" /><path d="M17 12.2a2 2 0 0 0 0 4h4v-4Z" /></svg>; }
export function TrendCard(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M7 15l3.5-4 3 2.5L18 8" /></svg>; }
export function ClipboardCheck(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 11.2 11.2 13.5 15.5 8.5" /><rect x="3" y="4" width="18" height="16" rx="2.5" /></svg>; }
export function Invoice(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="3" width="16" height="18" rx="2.5" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>; }
export function Bag(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>; }
export function Lock(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="5" y="11" width="14" height="9" rx="2.2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /><circle cx="12" cy="15" r="1.1" /><path d="M12 16.1v1.4" /></svg>; }
export function Chat(p) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>; }

// Színes, "valódi app-ikon" jellegű változat a dokk fő ikonjaihoz — ugyanazokat a
// már bevált vonal-glyph alakokat használja fehér színben (ne rajzoljunk újakat,
// ld. korábbi tanulság: az újrarajzolt ikonok inkonzisztensek lettek), csak egy
// színes, gradiens négyzet-alapra ültetve, mint a Figmából behúzott Üzenetek/Árulás ikon.
// Exportálva, hogy a BottomNav (mobil) is ugyanezt a mintát/színeket használhassa —
// egységes vizuális nyelv desktopon és mobilon.
export function AppIcon({ from, to, angle = 135, size, radius, children }) {
  return (
    <span
      className="md-item-appicon"
      style={{
        background: `linear-gradient(${angle}deg, ${from}, ${to})`, color: "#fff",
        ...(size ? { width: size, height: size } : {}),
        ...(radius ? { borderRadius: radius } : {}),
      }}
    >
      {children}
    </span>
  );
}

function DockItem({ label, icon, active, badge, onClick }) {
  return (
    <button type="button" className={`md-item${active ? " active" : ""}`} onClick={onClick} title={label}>
      <span className="md-label">{label}</span>
      {icon}
      {badge > 0 && <span className="md-badge">{badge}</span>}
      <span className="md-dot" />
    </button>
  );
}

function DockCluster({ label, icon, active, badge, children }) {
  return (
    <div className={`md-item md-cluster${active ? " active" : ""}`}>
      <span className="md-label">{label}</span>
      {icon}
      {badge > 0 && <span className="md-badge">{badge}</span>}
      <span className="md-dot" />
      <div className="md-flyout">{children}</div>
    </div>
  );
}

export default function MacDock({ tab, setTab, isAdmin, inboxUnreadCount, attentionCount }) {
  function go(t) { return () => setTab(t); }
  const WEBSHOP_TABS = ["buyback", "repair-prices", "reviews"];
  const ADMIN_TABS = ["dashboard", "leave", "users", "vault", "trash"];

  return (
    <div className="md-wrap">
      <div className="md-dock">
        <DockItem label="Pult" icon={<AppIcon from="#60A5FA" to="#2563EB"><Home stroke="#fff" width={22} height={22} /></AppIcon>} active={tab === "pult"} badge={attentionCount} onClick={go("pult")} />
        <DockItem label="Szerviz" icon={<AppIcon from="#FB923C" to="#EA580C"><Wrench stroke="#fff" width={22} height={22} /></AppIcon>} active={tab === "service"} onClick={go("service")} />
        <DockItem label="Telefonok" icon={<AppIcon from="#22D3EE" to="#0891B2"><Phone stroke="#fff" width={22} height={22} /></AppIcon>} active={tab === "stock"} onClick={go("stock")} />
        <DockItem label="Alkatrészek" icon={<AppIcon from="#A78BFA" to="#7C3AED"><Chip stroke="#fff" width={22} height={22} /></AppIcon>} active={tab === "parts"} onClick={go("parts")} />
        <DockItem label="Felújítás" icon={<AppIcon from="#4ADE80" to="#16A34A"><Refresh stroke="#fff" width={22} height={22} /></AppIcon>} active={tab === "refurb"} onClick={go("refurb")} />
        {!isAdmin && <DockItem label="Belépések" icon={<AppIcon from="#94A3B8" to="#1E293B"><Lock stroke="#fff" width={22} height={22} /></AppIcon>} active={tab === "vault"} onClick={go("vault")} />}

        <div className="md-sep" />

        <DockItem label="Üzenetek" icon={<AppIcon from="#34D399" to="#047857"><Bubble stroke="#fff" width={22} height={22} /></AppIcon>} active={tab === "inbox"} badge={inboxUnreadCount} onClick={go("inbox")} />
        <DockItem label="Kliensek" icon={<AppIcon from="#F472B6" to="#DB2777"><People stroke="#fff" width={22} height={22} /></AppIcon>} active={tab === "customers"} onClick={go("customers")} />
        <DockItem label="Garancia" icon={<AppIcon from="#818CF8" to="#4F46E5"><Shield stroke="#fff" width={22} height={22} /></AppIcon>} active={tab === "warranty"} onClick={go("warranty")} />

        <div className="md-sep" />

        <DockItem label="Árulás" icon={<AppIcon from="#4B5563" to="#111827"><TrendCard stroke="#fff" width={22} height={22} /></AppIcon>} active={tab === "finance"} onClick={go("finance")} />
        {isAdmin && <DockItem label="Elszámolás" icon={<AppIcon from="#FBBF24" to="#D97706"><ClipboardCheck stroke="#fff" width={22} height={22} /></AppIcon>} active={tab === "cash-settlement"} onClick={go("cash-settlement")} />}
        {isAdmin && <DockItem label="Költségek" icon={<AppIcon from="#FCD34D" to="#B45309"><Wallet stroke="#fff" width={22} height={22} /></AppIcon>} active={tab === "payroll"} onClick={go("payroll")} />}
        <DockItem label="Számlák" icon={<AppIcon from="#94A3B8" to="#475569"><Invoice stroke="#fff" width={22} height={22} /></AppIcon>} active={tab === "invoices"} onClick={go("invoices")} />
        {!isAdmin && <DockItem label="Szabadság" icon={<AppIcon from="#2DD4BF" to="#0D9488"><LeaveIcon stroke="#fff" width={22} height={22} /></AppIcon>} active={tab === "leave"} onClick={go("leave")} />}

        {isAdmin && (
          <>
            <div className="md-sep" />
            <DockCluster label="Webshop" icon={<AppIcon from="#FB7185" to="#E11D48"><Bag stroke="#fff" width={22} height={22} /></AppIcon>} active={WEBSHOP_TABS.includes(tab)}>
              <DockItem label="Felvásárlás" icon={<AppIcon from="#2DD4BF" to="#0D9488"><BuybackIcon stroke="#fff" width={20} height={20} /></AppIcon>} active={tab === "buyback"} onClick={go("buyback")} />
              <DockItem label="Szerviz árbecslő" icon={<AppIcon from="#FB923C" to="#C2410C"><RepairPriceIcon stroke="#fff" width={20} height={20} /></AppIcon>} active={tab === "repair-prices"} onClick={go("repair-prices")} />
              <DockItem label="Vélemények" icon={<AppIcon from="#FDE047" to="#CA8A04"><ReviewsIcon stroke="#fff" width={20} height={20} /></AppIcon>} active={tab === "reviews"} onClick={go("reviews")} />
            </DockCluster>
            <DockCluster label="Admin" icon={<AppIcon from="#94A3B8" to="#1E293B"><Lock stroke="#fff" width={22} height={22} /></AppIcon>} active={ADMIN_TABS.includes(tab)}>
              <DockItem label="Áttekintés" icon={<AppIcon from="#60A5FA" to="#2563EB"><DashboardIcon stroke="#fff" width={20} height={20} /></AppIcon>} active={tab === "dashboard"} onClick={go("dashboard")} />
              <DockItem label="Szabadság" icon={<AppIcon from="#2DD4BF" to="#0D9488"><LeaveIcon stroke="#fff" width={20} height={20} /></AppIcon>} active={tab === "leave"} onClick={go("leave")} />
              <DockItem label="Felhasználók" icon={<AppIcon from="#C084FC" to="#7E22CE"><UsersNavIcon stroke="#fff" width={20} height={20} /></AppIcon>} active={tab === "users"} onClick={go("users")} />
              <DockItem label="Belépések" icon={<AppIcon from="#94A3B8" to="#1E293B"><LockIcon stroke="#fff" width={20} height={20} /></AppIcon>} active={tab === "vault"} onClick={go("vault")} />
              <DockItem label="Kuka" icon={<AppIcon from="#F87171" to="#B91C1C"><TrashNavIcon stroke="#fff" width={20} height={20} /></AppIcon>} active={tab === "trash"} onClick={go("trash")} />
            </DockCluster>
          </>
        )}
      </div>
    </div>
  );
}
