import { useState, useEffect, useMemo } from "react";
import { supabase } from "./lib/supabaseClient";
import { CustomerAuthProvider, useCustomerAuth } from "./lib/CustomerAuthContext";
import { myPurchaseFromApi, myTicketFromApi, customerRequestFromApi } from "./lib/mappers";
import { money, warrantyExpiry, isWarrantyActive, statusCls, subStatusLabel } from "./lib/utils";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";

const NAV_ITEMS = [
  { key: "overview", label: "Áttekintés" },
  { key: "purchases", label: "Vásárlásaim" },
  { key: "tickets", label: "Szervizeim" },
  { key: "warranties", label: "Garanciáim" },
  { key: "requests", label: "Kéréseim" },
];

function AuthForm() {
  const { signIn, signUp } = useCustomerAuth();
  const [mode, setMode] = useState("login"); // login | register
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Add meg az email címed."); return; }
    if (!password) { setError("Add meg a jelszavad."); return; }
    if (mode === "register" && (!fullName.trim() || !phone.trim())) { setError("Add meg a neved és a telefonszámod."); return; }
    setBusy(true);
    try {
      if (mode === "register") {
        await signUp(email, password, fullName.trim(), phone.trim());
        setRegistered(true);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err.message || "Hiba történt.");
    } finally {
      setBusy(false);
    }
  }

  if (registered) {
    return (
      <div className="login-card" style={{ maxWidth: 380 }}>
        <div className="login-title">Sikeres regisztráció</div>
        <p style={{ fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 1.5 }}>
          A fiókod létrejött — most már be tudsz jelentkezni email címeddel és jelszavaddal.
        </p>
        <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} onClick={() => { setRegistered(false); setMode("login"); setPassword(""); }}>
          Bejelentkezés
        </button>
      </div>
    );
  }

  return (
    <div className="login-card" style={{ maxWidth: 380 }}>
      <div className="login-title">{mode === "login" ? "Bejelentkezés" : "Fiók létrehozása"}</div>
      {error && <div className="errbar">{error}</div>}
      <form onSubmit={submit} autoComplete="on">
        {mode === "register" && (
          <>
            <div className="field"><label>Név</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Kovács János" /></div>
            <div className="field"><label>Telefonszám</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xx xxx xxx" /></div>
          </>
        )}
        <div className="field"><label>Email</label><input type="email" name="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="te@pelda.hu" /></div>
        <div className="field"><label>Jelszó</label><input type="password" name="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
        <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={busy} type="submit">
          {busy ? "Kérlek várj..." : mode === "login" ? "Bejelentkezés" : "Regisztráció"}
        </button>
      </form>
      <div className="login-note">
        {mode === "login" ? (
          <>Nincs még fiókod? <a href="#" onClick={(e) => { e.preventDefault(); setError(""); setMode("register"); }}>Regisztrálj</a></>
        ) : (
          <>Van már fiókod? <a href="#" onClick={(e) => { e.preventDefault(); setError(""); setMode("login"); }}>Jelentkezz be</a></>
        )}
      </div>
    </div>
  );
}

function NoCustomerAccess() {
  const { signOut } = useCustomerAuth();
  return (
    <div className="login-card" style={{ maxWidth: 380 }}>
      <div className="login-title">Ez a fiók nem ügyfél-fiók</div>
      <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5, margin: "0 0 16px" }}>
        Ezzel az e-mail címmel nincs ügyfél-fiókod. Ha alkalmazott/admin vagy, a{" "}
        <a href="/admin">belső rendszerben</a> jelentkezz be.
      </p>
      <button className="btn sec" style={{ width: "100%", justifyContent: "center" }} onClick={signOut}>Kijelentkezés</button>
    </div>
  );
}

function RequestForm({ purchases, tickets, onSubmit, onCancel, busy }) {
  const [type, setType] = useState("return");
  const [linkKey, setLinkKey] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!description.trim()) { setError("Írd le röviden, miről van szó."); return; }
    const [kind, id] = linkKey ? linkKey.split(":") : [null, null];
    onSubmit({
      type,
      description: description.trim(),
      linkedTransactionId: kind === "purchase" ? id : null,
      linkedTicketId: kind === "ticket" ? id : null,
    });
  }

  return (
    <form onSubmit={submit} className="dp-section" style={{ background: "#F9FAFB", border: "1px solid #EEF0F2", borderRadius: 12, padding: 16, marginBottom: 16 }}>
      {error && <div className="errbar">{error}</div>}
      <div className="field">
        <label>Típus</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="return">Visszaküldés</option>
          <option value="warranty_claim">Garancia-igénylés</option>
        </select>
      </div>
      <div className="field">
        <label>Melyik vásárláshoz/munkalaphoz kapcsolódik? (opcionális)</label>
        <select value={linkKey} onChange={(e) => setLinkKey(e.target.value)}>
          <option value="">— nincs kiválasztva —</option>
          {purchases.map((p) => <option key={p.id} value={`purchase:${p.id}`}>{p.brand} {p.model} — {p.date}</option>)}
          {tickets.map((t) => <option key={t.id} value={`ticket:${t.id}`}>Munkalap #{t.ticketNo} — {[t.brand, t.model].filter(Boolean).join(" ")}</option>)}
        </select>
      </div>
      <div className="field"><label>Leírás</label><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Írd le röviden, miről van szó..." /></div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn sec sm" onClick={onCancel}>Mégse</button>
        <button type="submit" className="btn sm" disabled={busy}>{busy ? "Küldés..." : "Kérés elküldése"}</button>
      </div>
    </form>
  );
}

function Dashboard({ profile }) {
  const { signOut } = useCustomerAuth();
  const [active, setActive] = useState("overview");
  const [purchases, setPurchases] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [pRes, tRes, rRes] = await Promise.all([
          supabase.rpc("get_my_purchases"),
          supabase.rpc("get_my_tickets"),
          supabase.from("customer_requests").select("*").eq("customer_profile_id", profile.id).order("created_at", { ascending: false }),
        ]);
        if (pRes.error) throw pRes.error;
        if (tRes.error) throw tRes.error;
        if (rRes.error) throw rRes.error;
        setPurchases((pRes.data || []).map(myPurchaseFromApi));
        setTickets((tRes.data || []).map(myTicketFromApi));
        setRequests((rRes.data || []).map(customerRequestFromApi));
      } catch (err) {
        setError(err.message || "Hiba történt az adatok betöltése közben.");
      } finally {
        setLoadingData(false);
      }
    })();
  }, [profile.id]);

  const activeWarranties = useMemo(() => {
    const items = [];
    purchases.forEach((p) => {
      if (p.warranty && isWarrantyActive(p.date, p.warranty)) {
        items.push({ key: `p-${p.id}`, label: `${p.brand} ${p.model}`, warranty: p.warranty, expiry: warrantyExpiry(p.date, p.warranty), href: `/receipt/${p.publicToken}` });
      }
    });
    tickets.forEach((t) => {
      if (t.subStatus === "Átadva" && t.warranty && t.dateOut && isWarrantyActive(t.dateOut, t.warranty)) {
        items.push({ key: `t-${t.id}`, label: [t.brand, t.model].filter(Boolean).join(" ") || `Munkalap #${t.ticketNo}`, warranty: t.warranty, expiry: warrantyExpiry(t.dateOut, t.warranty), href: `/status/${t.publicToken}` });
      }
    });
    return items;
  }, [purchases, tickets]);

  async function submitRequest(data) {
    setBusy(true);
    setError("");
    try {
      const { error: err } = await supabase.rpc("submit_customer_request", {
        p_type: data.type, p_description: data.description,
        p_linked_transaction_id: data.linkedTransactionId, p_linked_ticket_id: data.linkedTicketId,
      });
      if (err) throw err;
      const { data: fresh } = await supabase.from("customer_requests").select("*").eq("customer_profile_id", profile.id).order("created_at", { ascending: false });
      setRequests((fresh || []).map(customerRequestFromApi));
      setRequestFormOpen(false);
    } catch (err) {
      setError(err.message || "Hiba történt a kérés beküldése közben.");
    } finally {
      setBusy(false);
    }
  }

  const REQUEST_TYPE_LABEL = { return: "Visszaküldés", warranty_claim: "Garancia-igénylés" };
  const REQUEST_STATUS_LABEL = { uj: "Új", attekintve: "Áttekintve", lezarva: "Lezárva" };

  return (
    <div className="account-shell">
      <nav className="account-nav">
        {NAV_ITEMS.map((it) => (
          <button key={it.key} type="button" className={`account-nav-btn${active === it.key ? " active" : ""}`} onClick={() => setActive(it.key)}>{it.label}</button>
        ))}
        <button type="button" className="account-nav-btn account-nav-signout" onClick={signOut}>Kijelentkezés</button>
      </nav>
      <div className="account-main">
        {error && <div className="errbar">{error}</div>}
        {loadingData ? (
          <div style={{ textAlign: "center", color: "#6B7280", fontSize: 13, padding: "20px 0" }}>Betöltés...</div>
        ) : active === "overview" ? (
          <div className="dp-section">
            <div className="login-title" style={{ textAlign: "left" }}>Szia, {profile.fullName || "!"}!</div>
            <div className="dp-row"><span className="dp-key">Vásárlások</span><span className="dp-val">{purchases.length}</span></div>
            <div className="dp-row"><span className="dp-key">Szervizmunkák</span><span className="dp-val">{tickets.length}</span></div>
            <div className="dp-row"><span className="dp-key">Aktív garanciák</span><span className="dp-val">{activeWarranties.length}</span></div>
            <div className="dp-row"><span className="dp-key">Nyitott kéréseim</span><span className="dp-val">{requests.filter((r) => r.status !== "lezarva").length}</span></div>
          </div>
        ) : active === "purchases" ? (
          purchases.length === 0 ? <div className="dp-section" style={{ color: "#9CA3AF", fontSize: 13 }}>Nincs még rögzített vásárlásod.</div> : (
            <div className="dp-section">
              {purchases.map((p) => (
                <div key={p.id} className="dp-row">
                  <span className="dp-key">{p.brand} {p.model}<br /><span style={{ color: "#9CA3AF", fontWeight: 400 }}>{p.date} · {money(p.amount)}</span></span>
                  <span className="dp-val"><a href={`/receipt/${p.publicToken}`}>Bizonylat megtekintése</a></span>
                </div>
              ))}
            </div>
          )
        ) : active === "tickets" ? (
          tickets.length === 0 ? <div className="dp-section" style={{ color: "#9CA3AF", fontSize: 13 }}>Nincs még szervizmunkád.</div> : (
            <div className="dp-section">
              {tickets.map((t) => (
                <div key={t.id} className="dp-row">
                  <span className="dp-key">
                    Munkalap #{t.ticketNo} · {[t.brand, t.model].filter(Boolean).join(" ") || "—"}<br />
                    <span className={`st ${statusCls(t.status)}`} style={{ marginTop: 4, display: "inline-block" }}>{t.subStatus ? subStatusLabel(t.status, t.subStatus) : t.status}</span>
                  </span>
                  <span className="dp-val"><a href={`/status/${t.publicToken}`}>Állapot megtekintése</a></span>
                </div>
              ))}
            </div>
          )
        ) : active === "warranties" ? (
          activeWarranties.length === 0 ? <div className="dp-section" style={{ color: "#9CA3AF", fontSize: 13 }}>Nincs jelenleg aktív garanciád.</div> : (
            <div className="dp-section">
              {activeWarranties.map((w) => (
                <div key={w.key} className="dp-row">
                  <span className="dp-key">{w.label}<br /><span style={{ color: "#9CA3AF", fontWeight: 400 }}>{w.warranty} — lejár: {w.expiry}</span></span>
                  <span className="dp-val"><a href={w.href}>Megtekintés</a></span>
                </div>
              ))}
            </div>
          )
        ) : (
          <div>
            {!requestFormOpen && <button type="button" className="btn sm" style={{ marginBottom: 14 }} onClick={() => setRequestFormOpen(true)}>+ Új kérés</button>}
            {requestFormOpen && (
              <RequestForm purchases={purchases} tickets={tickets} busy={busy} onCancel={() => setRequestFormOpen(false)} onSubmit={submitRequest} />
            )}
            {requests.length === 0 ? <div className="dp-section" style={{ color: "#9CA3AF", fontSize: 13 }}>Nincs még beküldött kérésed.</div> : (
              <div className="dp-section">
                {requests.map((r) => (
                  <div key={r.id} className="dp-row">
                    <span className="dp-key">{REQUEST_TYPE_LABEL[r.type] || r.type}<br /><span style={{ color: "#9CA3AF", fontWeight: 400 }}>{r.description}</span></span>
                    <span className="dp-val">{REQUEST_STATUS_LABEL[r.status] || r.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PortalInner() {
  const { session, loading, profile, noCustomerProfile } = useCustomerAuth();

  return (
    <div className="pub-shop">
      <PublicHeader activeNav="login" langSwitchHref={null} />
      <main className="pub-lookup-main">
        {loading ? (
          <div style={{ color: "#6B7280", fontSize: 13 }}>Betöltés...</div>
        ) : !session ? (
          <AuthForm />
        ) : noCustomerProfile ? (
          <NoCustomerAccess />
        ) : !profile ? (
          <div style={{ color: "#6B7280", fontSize: 13 }}>Betöltés...</div>
        ) : (
          <Dashboard profile={profile} />
        )}
      </main>
      <PublicFooter />
    </div>
  );
}

export default function CustomerPortal() {
  return (
    <CustomerAuthProvider>
      <PortalInner />
    </CustomerAuthProvider>
  );
}
