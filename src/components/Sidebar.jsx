import {
  EditIcon, DashboardIcon, ServiceIcon, PhoneCaseIcon,
  PartsIcon, FinanceIcon, CustomersIcon, WarrantyIcon, UsersNavIcon, TrashNavIcon, LogoutIcon, BuybackIcon, LeaveIcon, RepairPriceIcon,
} from "./icons";

export default function Sidebar({
  tab, setTab, setTicketModal, isAdmin, locFilter, setLocFilter, allowedLocations,
  myLocationId, locName, profile, user, signOut, setChangePasswordModal,
}) {
  return (
    <div className="sidebar">
      <div className="sidebar-inner">
        <div className="nav-lbl">Napi munka</div>
        <div className="navrow">
          <button className={`navbtn ${tab === "service" ? "active" : ""}`} onClick={() => setTab("service")}><ServiceIcon className="nav-ic" />Szerviz</button>
          <button type="button" className="nav-quick-add" title="Új munkalap" onClick={() => { setTab("service"); setTicketModal("add"); }}>+</button>
        </div>
        <button className={`navbtn ${tab === "stock" ? "active" : ""}`} onClick={() => setTab("stock")}><PhoneCaseIcon className="nav-ic" />Telefonok</button>
        <button className={`navbtn ${tab === "parts" ? "active" : ""}`} onClick={() => setTab("parts")}><PartsIcon className="nav-ic" />Alkatrészek</button>
        <button className={`navbtn ${tab === "customers" ? "active" : ""}`} onClick={() => setTab("customers")}><CustomersIcon className="nav-ic" />Kliensek</button>
        <button className={`navbtn ${tab === "warranty" ? "active" : ""}`} onClick={() => setTab("warranty")}><WarrantyIcon className="nav-ic" />Garancia</button>

        <div className="nav-lbl">Pénzügyek</div>
        <button className={`navbtn ${tab === "finance" ? "active" : ""}`} onClick={() => setTab("finance")}><FinanceIcon className="nav-ic" />Bevételek &amp; Kiadások</button>

        <button className={`navbtn ${tab === "leave" ? "active" : ""}`} onClick={() => setTab("leave")}><LeaveIcon className="nav-ic" />Szabadság</button>

        {isAdmin && (
          <>
            <div className="nav-lbl">Admin</div>
            <button className={`navbtn ${tab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")}><DashboardIcon className="nav-ic" />Áttekintés</button>
            <button className={`navbtn ${tab === "buyback" ? "active" : ""}`} onClick={() => setTab("buyback")}><BuybackIcon className="nav-ic" />Felvásárlás</button>
            <button className={`navbtn ${tab === "repair-prices" ? "active" : ""}`} onClick={() => setTab("repair-prices")}><RepairPriceIcon className="nav-ic" />Szerviz árbecslő</button>
            <button className={`navbtn ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}><UsersNavIcon className="nav-ic" />Felhasználók</button>
            <button className={`navbtn ${tab === "trash" ? "active" : ""}`} onClick={() => setTab("trash")}><TrashNavIcon className="nav-ic" />Kuka</button>
          </>
        )}
      </div>
      <div className="sidebar-bottom">
        <a className="shop-preview-link" href="/" target="_blank" rel="noopener noreferrer">Webshop megtekintése ↗</a>
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
          <button className="logout-btn" title="Jelszó módosítása" onClick={() => setChangePasswordModal(true)}>
            <EditIcon />
          </button>
          <button className="logout-btn" title="Kijelentkezés" onClick={signOut}>
            <LogoutIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
