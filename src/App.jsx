import { useEffect, useState } from "react";
import { useAuth } from "./lib/AuthContext";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import Login from "./Login";
import { useInternalChat } from "./lib/useInternalChat";
import { useLiveSync } from "./lib/useLiveSync";
import { useAppState } from "./app/useAppState";
import { computeBasics } from "./app/computeBasics";
import { useDerivedData } from "./app/useDerivedData";
import { createPrintActions } from "./app/actions/print";
import { createDataActions } from "./app/actions/data";
import { createTrashActions } from "./app/actions/trash";
import { createCoreActions } from "./app/actions/core";
import { createStockActions } from "./app/actions/stock";
import { createPartsActions } from "./app/actions/parts";
import { createBuybackActions } from "./app/actions/buyback";
import { createPayrollActions } from "./app/actions/payroll";
import { createLeaveActions } from "./app/actions/leave";
import { createFinanceActions } from "./app/actions/finance";
import { createWebshopActions } from "./app/actions/webshop";
import { createAdminActions } from "./app/actions/admin";
import { createReviewsActions } from "./app/actions/reviews";
import { createInboxActions } from "./app/actions/inbox";
import { createWarrantyActions } from "./app/actions/warranty";
import { createCustomersActions } from "./app/actions/customers";
import { createPultActions } from "./app/actions/pult";
import { createServiceActions } from "./app/actions/service";
import AppView from "./app/AppView";

function NoStaffAccess() {
  const { signOut } = useAuth();
  return (
    <div className="pub-shop">
      <PublicHeader activeNav="login" />
      <main className="pub-lookup-main">
        <div className="login-card" style={{ maxWidth: 380 }}>
          <div className="login-title">Ez a fiók nem admin-fiók</div>
          <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5, margin: "0 0 16px" }}>
            Ezzel az e-mail címmel nincs alkalmazotti/admin hozzáférésed a belső rendszerhez —
            ha ügyfél-fiókod van, azt a <a href="/fiok">Fiókom</a> oldalon éred el. Ha alkalmazott
            vagy, kérj meghívót egy adminisztrátortól.
          </p>
          <button className="btn sec" style={{ width: "100%", justifyContent: "center" }} onClick={signOut}>Kijelentkezés</button>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

function PasswordRecoveryGate() {
  const { completePasswordRecovery, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Legalább 6 karakter legyen a jelszó."); return; }
    if (password !== password2) { setError("A két jelszó nem egyezik."); return; }
    setBusy(true);
    try {
      await completePasswordRecovery(password);
    } catch (err) {
      setError(err.message || "Hiba történt.");
      setBusy(false);
    }
  }

  return (
    <div className="pub-shop">
      <PublicHeader activeNav="login" />
      <main className="pub-lookup-main">
        <div className="login-card" style={{ maxWidth: 380 }}>
          <div className="login-title">Új jelszó megadása</div>
          <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5, margin: "0 0 16px" }}>
            Ez a link jelszó-visszaállításra szolgál — add meg az új jelszavad, utána újra be
            kell majd jelentkezned vele. (Ez nem lép be automatikusan a rendszerbe.)
          </p>
          {error && <div className="errbar">{error}</div>}
          <form onSubmit={submit}>
            <div className="field"><label>Új jelszó</label><input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
            <div className="field"><label>Új jelszó mégegyszer</label><input type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="••••••••" /></div>
            <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={busy} type="submit">
              {busy ? "Mentés..." : "Jelszó mentése"}
            </button>
          </form>
          <button type="button" className="login-note" style={{ background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }} onClick={signOut}>
            Mégse, vissza a bejelentkezéshez
          </button>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

export default function App() {
  const { session, loading, noStaffProfile, passwordRecovery } = useAuth();
  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F4F6F3", color: "#6B7280", fontSize: 13 }}>Betöltés...</div>;
  if (passwordRecovery) return <PasswordRecoveryGate />;
  if (!session) return <Login />;
  if (noStaffProfile) return <NoStaffAccess />;
  return <AppShell />;
}

function AppShell() {
  const { user, profile, signOut, signIn } = useAuth();
  const state = useAppState();
  const { messages: chatMessages, unreadCount: chatUnread, send: sendChatMessage, markRead: markChatRead } = useInternalChat(profile);
  const ctx = {
    user, profile, signOut, signIn,
    chatMessages, chatUnread, sendChatMessage, markChatRead,
    ...state,
  };
  Object.assign(ctx, computeBasics(ctx));
  Object.assign(ctx, useDerivedData(ctx));
  Object.assign(ctx, createPrintActions(ctx));
  Object.assign(ctx, createDataActions(ctx));
  Object.assign(ctx, createTrashActions(ctx));
  Object.assign(ctx, createCoreActions(ctx));
  Object.assign(ctx, createStockActions(ctx));
  Object.assign(ctx, createPartsActions(ctx));
  Object.assign(ctx, createBuybackActions(ctx));
  Object.assign(ctx, createPayrollActions(ctx));
  Object.assign(ctx, createLeaveActions(ctx));
  Object.assign(ctx, createFinanceActions(ctx));
  Object.assign(ctx, createWebshopActions(ctx));
  Object.assign(ctx, createAdminActions(ctx));
  Object.assign(ctx, createReviewsActions(ctx));
  Object.assign(ctx, createInboxActions(ctx));
  Object.assign(ctx, createWarrantyActions(ctx));
  Object.assign(ctx, createCustomersActions(ctx));
  Object.assign(ctx, createPultActions(ctx));
  Object.assign(ctx, createServiceActions(ctx));

  const {
    loadAll, loadTrash, setDayCloses, setInboxMessages, setStock, setStockImportQueue, setStockModal,
    setTickets, setTransactions, stockImportQueue, stockModal, tab,
  } = ctx;
  useEffect(() => { loadAll(); }, []);
  // Visszaváltáskor csendes felzárkózó újratöltés (pl. alvó laptop után) — a folyamatos
  // változásokat a lenti useLiveSync hozza, ez csak biztonsági háló (loadAll-ban throttle-olva).
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") loadAll({ silent: true });
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);
  // Élő szinkron (Supabase Realtime): a kollégák mentései a változott sorként érkeznek,
  // teljes újratöltés nélkül. Kapcsolat-kiesés után a hook egy csendes loadAll-lal pótol.
  useLiveSync({ enabled: !!profile, setTickets, setTransactions, setDayCloses, setInboxMessages, setStock, loadAll });
  useEffect(() => { if (tab === "trash") loadTrash(); }, [tab]);
  // Amint a "Telefon"-felvevő modal bezárul (mentve vagy mégse), és van még hátralévő
  // darab a sorban-állóban, nyissuk meg a következőt — így egyenként, emberi ellenőrzéssel
  // mennek fel a telefonok (állapot, tárhely, szín, IMEI, eladási ár mindig kézzel kell).
  useEffect(() => {
    if (stockModal === null && stockImportQueue.length > 0) {
      const [next, ...rest] = stockImportQueue;
      setStockImportQueue(rest);
      setStockModal({ model: next.model, costPrice: next.costPrice, locationId: next.locationId, source: next.source });
    }
  }, [stockModal]);

  return <AppView ctx={ctx} />;
}
