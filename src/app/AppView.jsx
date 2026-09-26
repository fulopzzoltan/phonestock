import MacDock from "../components/MacDock";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";
import MobileTopbar from "../components/MobileTopbar";
import ContentTopbar from "../components/ContentTopbar";
import { PlusIcon } from "../components/icons";
import LiquidToggle from "../components/LiquidToggle";
import { today } from "../lib/utils";
import ConfirmDelete from "../components/ConfirmDelete";
import AppTabs from "./AppTabs";
import AppModals from "./AppModals";

// Az admin-felület elrendezése: navigáció, felső sáv, aktív fül, modálok.
export default function AppView({ ctx }) {
  const {
    activeWarranties, allowedLocations, attentionCount, busy, chatOpen, chatUnread, closeDay,
    customersTable, defaultLocId, hardDeleteAllTrash, headerTodayClose, inboxUnreadCount, isAdmin,
    lastActiveLocationId, locFilter, locName, markChatRead, myLocationId, parts, profile,
    pultPendingCounts, refurbCount, reopenDay, reviewBulkOpen, setChatOpen, setCustomerKey,
    setCustomerModal, setDetailId, setInviteError, setInviteModal, setIssueInvoiceModal,
    setLeaveRequestModal, setLocFilter, setPartDetailId, setPartModal, setProductDetailId,
    setReviewBulkOpen, setReviewModal, setStockModal, setTab, setTicketModal, setVaultModal,
    setWarrantyDetailKey, setWarrantyModal, signOut, stock, tab, tickets, trash, useMacDock, user,
  } = ctx;
  return (
    <div className={`shell${useMacDock ? " mac-pult" : ""}`}>
      {useMacDock ? (
        <MacDock tab={tab} setTab={setTab} isAdmin={isAdmin} inboxUnreadCount={inboxUnreadCount} attentionCount={attentionCount} />
      ) : (
        <Sidebar
          tab={tab} setTab={setTab} setTicketModal={setTicketModal} isAdmin={isAdmin}
          lastActiveLocationId={lastActiveLocationId} pultPendingCounts={pultPendingCounts}
          inboxUnreadCount={inboxUnreadCount} refurbCount={refurbCount}
        />
      )}
      <BottomNav
        tab={tab} setTab={setTab} isAdmin={isAdmin} pultPendingCounts={pultPendingCounts} inboxUnreadCount={inboxUnreadCount}
        refurbCount={refurbCount}
      />
      <MobileTopbar
        isAdmin={isAdmin} locFilter={locFilter} setLocFilter={setLocFilter}
        allowedLocations={allowedLocations} myLocationId={myLocationId} locName={locName}
        profile={profile} user={user} signOut={signOut} setTab={setTab}
        chatOpen={chatOpen} setChatOpen={setChatOpen} chatUnread={chatUnread} markChatRead={markChatRead}
        tab={tab} busy={busy} onAddTicket={() => setTicketModal("add")} onAddProduct={() => setStockModal("add")} onAddPart={() => setPartModal("add")}
      />

      <div className="content-col">
      <ContentTopbar
        tab={tab} setTab={setTab} isAdmin={isAdmin} locFilter={locFilter} setLocFilter={setLocFilter}
        allowedLocations={allowedLocations} myLocationId={myLocationId} locName={locName} profile={profile} user={user}
        signOut={signOut} chatOpen={chatOpen} setChatOpen={setChatOpen} chatUnread={chatUnread} markChatRead={markChatRead}
        stock={stock} tickets={tickets} customersTable={customersTable} parts={parts} warranties={activeWarranties}
        onOpenProduct={(id) => setProductDetailId(id)}
        onOpenTicket={(id) => setDetailId(id)}
        onOpenCustomer={(id) => setCustomerKey(id)}
        onOpenPart={(id) => setPartDetailId(id)}
        onOpenWarranty={(key) => { setTab("warranty"); setWarrantyDetailKey(key); }}
        pageHeader={tab === "stock" ? (
          <div className="page-title" style={{ fontSize: 20, whiteSpace: "nowrap" }}>Telefonok</div>
        ) : tab === "parts" ? (
          <>
            <div className="page-title" style={{ fontSize: 20, whiteSpace: "nowrap" }}>Alkatrész raktár</div>
            <button type="button" className="btn header-add-btn" disabled={busy} title="Új alkatrész" onClick={() => setPartModal("add")}><span className="header-add-ring" /><span className="header-add-ring ring2" /><PlusIcon width={16} height={16} /></button>
          </>
        ) : tab === "payroll" ? (
          <div className="page-title" style={{ fontSize: 20, whiteSpace: "nowrap" }}>Költségek</div>
        ) : tab === "customers" ? (
          <>
            <div className="page-title" style={{ fontSize: 20, whiteSpace: "nowrap" }}>Kliensek</div>
            <button type="button" className="btn header-add-btn" disabled={busy} title="Új ügyfél" onClick={() => setCustomerModal("add")}><span className="header-add-ring" /><span className="header-add-ring ring2" /><PlusIcon width={16} height={16} /></button>
          </>
        ) : tab === "warranty" ? (
          <>
            <div className="page-title" style={{ fontSize: 20, whiteSpace: "nowrap" }}>Garancia</div>
            <button type="button" className="btn header-add-btn" disabled={busy} title="Garancia felvétele" onClick={() => setWarrantyModal("add")}><span className="header-add-ring" /><span className="header-add-ring ring2" /><PlusIcon width={16} height={16} /></button>
          </>
        ) : tab === "dashboard" ? (
          <div className="page-title" style={{ fontSize: 20, whiteSpace: "nowrap" }}>Áttekintés</div>
        ) : tab === "service" ? (
          <div className="page-title" style={{ fontSize: 20, whiteSpace: "nowrap" }}>Szerviz</div>
        ) : tab === "buyback" ? (
          <div className="page-title" style={{ fontSize: 20, whiteSpace: "nowrap" }}>Felvásárlás</div>
        ) : tab === "cash-settlement" ? (
          <div className="page-title" style={{ fontSize: 20, whiteSpace: "nowrap" }}>Elszámolás</div>
        ) : tab === "invoices" ? (
          <>
            <div className="page-title" style={{ fontSize: 20, whiteSpace: "nowrap" }}>Számlák</div>
            <button className="btn" style={{ padding: "8px 14px" }} onClick={() => setIssueInvoiceModal(true)}>+ Kiállítás</button>
          </>
        ) : tab === "finance" ? (
          <>
            <div className="page-title" style={{ fontSize: 20, whiteSpace: "nowrap" }}>Bevételek és kiadások</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}>
              <LiquidToggle
                on={!!headerTodayClose}
                disabled={busy}
                title={headerTodayClose ? "Nap visszanyitása" : "Nap zárása"}
                onChange={(next) => (next ? closeDay(today(), defaultLocId) : reopenDay(headerTodayClose.id))}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: headerTodayClose ? "#B91C1C" : "#9CA3AF", whiteSpace: "nowrap" }}>
                {headerTodayClose ? "Nap lezárva" : "Nap zárása"}
              </span>
            </div>
          </>
        ) : tab === "leave" ? (
          <>
            <div className="page-title" style={{ fontSize: 20, whiteSpace: "nowrap" }}>Szabadság</div>
            <button className="btn" style={{ padding: "8px 14px" }} disabled={busy} onClick={() => setLeaveRequestModal(true)}>+ Szabadság kérése</button>
          </>
        ) : tab === "repair-prices" ? (
          <div className="page-title" style={{ fontSize: 20, whiteSpace: "nowrap" }}>Szerviz árbecslő</div>
        ) : tab === "settings" ? (
          <div className="page-title" style={{ fontSize: 20, whiteSpace: "nowrap" }}>Beállítások</div>
        ) : tab === "vault" ? (
          <>
            <div className="page-title" style={{ fontSize: 20, whiteSpace: "nowrap" }}>Belépések</div>
            {isAdmin && <button className="btn" style={{ padding: "8px 14px" }} onClick={() => setVaultModal("add")}>+ Új belépés</button>}
          </>
        ) : tab === "reviews" ? (
          <>
            <div className="page-title" style={{ fontSize: 20, whiteSpace: "nowrap" }}>Vélemények</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn sec" style={{ padding: "8px 14px" }} onClick={() => setReviewBulkOpen((v) => !v)}>{reviewBulkOpen ? "Tömeges felvitel bezárása" : "Tömeges felvitel"}</button>
              <button type="button" className="btn" style={{ padding: "8px 14px" }} onClick={() => setReviewModal("add")}>+ Új vélemény</button>
            </div>
          </>
        ) : tab === "trash" ? (
          <>
            <div className="page-title" style={{ fontSize: 20, whiteSpace: "nowrap" }}>Kuka</div>
            {trash && (trash.products.length + trash.parts.length + trash.transactions.length + trash.tickets.length) > 0 && (
              <ConfirmDelete
                variant="full"
                disabled={busy}
                label="Kuka ürítése"
                confirmLabel={`Biztos? ${trash.products.length + trash.parts.length + trash.transactions.length + trash.tickets.length} tétel véglegesen törlődik.`}
                onConfirm={hardDeleteAllTrash}
              />
            )}
          </>
        ) : tab === "users" ? (
          <>
            <div className="page-title" style={{ fontSize: 20, whiteSpace: "nowrap" }}>Felhasználók</div>
            <button type="button" className="btn header-add-btn" disabled={busy} title="Új kolléga meghívása" onClick={() => { setInviteError(""); setInviteModal(true); }}><span className="header-add-ring" /><span className="header-add-ring ring2" /><PlusIcon width={16} height={16} /></button>
          </>
        ) : null}
        contextNav={isAdmin && tab === "finance" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button type="button" className="loc-drop" style={{ width: "auto" }} onClick={() => setTab("cash-settlement")}>Elszámolás</button>
            <button type="button" className="loc-drop" style={{ width: "auto" }} onClick={() => setTab("payroll")}>Költségek</button>
          </div>
        ) : (tab === "cash-settlement" || tab === "payroll") ? (
          <button type="button" className="loc-drop" style={{ width: "auto" }} onClick={() => setTab("finance")}>← Bevételek és kiadások</button>
        ) : null}
      />
      <AppTabs ctx={ctx} />
      {useMacDock && (
        <div className="mac-pult-fade" aria-hidden="true">
          <div className="mac-pult-fade-1" />
          <div className="mac-pult-fade-2" />
          <div className="mac-pult-fade-3" />
          <div className="mac-pult-fade-4" />
          <div className="mac-pult-fade-5" />
          <div className="mac-pult-fade-6" />
          <div className="mac-pult-fade-7" />
          <div className="mac-pult-fade-8" />
        </div>
      )}
      </div>

      <AppModals ctx={ctx} />
    </div>
  );
}
