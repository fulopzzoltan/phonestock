import { useState, useEffect, useMemo } from "react";
import { supabase } from "./lib/supabaseClient";
import { CustomerAuthProvider, useCustomerAuth } from "./lib/CustomerAuthContext";
import { myPurchaseFromApi, myTicketFromApi, customerRequestFromApi } from "./lib/mappers";
import { money, warrantyExpiry, isWarrantyActive, statusCls, subStatusLabel, SITE_URL } from "./lib/utils";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import { CartIcon, ServiceIcon, WarrantyIcon, NoteIcon, PhoneCaseIcon, ChargerIcon, HeadphoneIcon, GiftIcon, CheckIcon } from "./components/icons";

const TIER_ICONS = [PhoneCaseIcon, ChargerIcon, HeadphoneIcon, GiftIcon];

const NAV_ITEMS = [
  { key: "overview", label: "Áttekintés" },
  { key: "purchases", label: "Vásárlásaim" },
  { key: "tickets", label: "Szervizeim" },
  { key: "warranties", label: "Garanciáim" },
  { key: "requests", label: "Kéréseim" },
  { key: "settings", label: "Beállítások" },
];

// Adaptív, email-first belépés — a Flip.ro és a Back Market bejelentkezését mintázza:
// előbb csak az email címet kérjük, és a rendszer maga dönti el, hogy meglévő fiókról
// van-e szó (jelszót kérünk) vagy újról (fiók-létrehozó mezőket mutatunk) — nem kell a
// felhasználónak előre eldöntenie/megkeresnie a "Regisztráció" vagy "Bejelentkezés" fület.
function AuthForm() {
  const { signIn, signUp, resetPassword } = useCustomerAuth();
  const prefill = new URLSearchParams(window.location.search);
  const prefillEmail = prefill.get("email") || "";
  const prefillPhone = prefill.get("phone") || "";
  const prefillName = prefill.get("name") || "";
  const prefillRef = prefill.get("ref") || "";
  const [step, setStep] = useState("email"); // email | login | register | forgot
  const [fullName, setFullName] = useState(prefillName);
  const [phone, setPhone] = useState(prefillPhone);
  const [email, setEmail] = useState(prefillEmail);
  const [refCode, setRefCode] = useState(prefillRef);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [checkedOnce, setCheckedOnce] = useState(false);

  async function checkEmail(e) {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Add meg az email címed."); return; }
    setBusy(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc("customer_account_exists", { p_email: email.trim() });
      if (rpcErr) throw rpcErr;
      setStep(data ? "login" : "register");
    } catch (err) {
      setError(err.message || "Hiba történt.");
    } finally {
      setBusy(false);
      setCheckedOnce(true);
    }
  }

  // Ha a linkben már email is érkezett (pl. korábbi rendelésből), ne kelljen külön
  // rákattintani a Folytatásra — automatikusan eldöntjük, be- vagy regisztrálni kell-e.
  useEffect(() => {
    if (prefillEmail && !checkedOnce) checkEmail({ preventDefault() {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (step === "forgot") {
      setBusy(true);
      try {
        await resetPassword(email.trim());
        setResetSent(true);
      } catch (err) {
        setError(err.message || "Hiba történt.");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!password) { setError("Add meg a jelszavad."); return; }
    if (step === "register" && (!fullName.trim() || !phone.trim())) { setError("Add meg a neved és a telefonszámod."); return; }
    setBusy(true);
    try {
      if (step === "register") {
        await signUp(email, password, fullName.trim(), phone.trim(), refCode.trim());
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
        <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} onClick={() => { setRegistered(false); setStep("login"); setPassword(""); }}>
          Bejelentkezés
        </button>
      </div>
    );
  }

  if (step === "forgot" && resetSent) {
    return (
      <div className="login-card" style={{ maxWidth: 380 }}>
        <div className="login-title">Elküldve</div>
        <p style={{ fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 1.5 }}>
          Ha létezik fiók ezzel az email címmel ({email}), küldtünk rá egy linket, amivel új jelszót állíthatsz be.
        </p>
        <button className="btn sec" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} onClick={() => { setResetSent(false); setStep("login"); }}>
          Vissza a bejelentkezéshez
        </button>
      </div>
    );
  }

  if (step === "email") {
    return (
      <div className="login-card" style={{ maxWidth: 380 }}>
        <div className="login-title">Szia!</div>
        <p style={{ fontSize: 12.5, color: "#6B7280", textAlign: "center", margin: "0 0 20px", lineHeight: 1.5 }}>
          Kezdd az email címed megadásával. Ha még nincs fiókod, a következő lépésben létrehozzuk.
        </p>
        {error && <div className="errbar">{error}</div>}
        <form onSubmit={checkEmail} autoComplete="on">
          <div className="field"><label>Email</label><input type="email" name="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="te@pelda.hu" /></div>
          <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} disabled={busy} type="submit">
            {busy ? "Kérlek várj..." : "Folytatás"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="login-card" style={{ maxWidth: 380 }}>
      <div className="login-title">{step === "login" ? "Bejelentkezés" : step === "forgot" ? "Jelszó visszaállítása" : "Fiók létrehozása"}</div>
      <div className="login-note" style={{ marginBottom: 18 }}>
        {email} — <a href="#" onClick={(e) => { e.preventDefault(); setError(""); setPassword(""); setStep("email"); }}>nem te vagy?</a>
      </div>
      {error && <div className="errbar">{error}</div>}
      {step === "register" && (
        <p style={{ fontSize: 12.5, color: "#6B7280", margin: "0 0 16px", lineHeight: 1.5 }}>
          Ehhez az email címhez még nincs fiókunk — hozzuk létre most.
        </p>
      )}
      {step === "forgot" && (
        <p style={{ fontSize: 12.5, color: "#6B7280", margin: "0 0 16px", lineHeight: 1.5 }}>
          Küldünk egy linket erre a címre, amivel új jelszót állíthatsz be.
        </p>
      )}
      <form onSubmit={submit} autoComplete="on">
        {step === "register" && (
          <>
            <div className="field"><label>Név</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Kovács János" autoFocus /></div>
            <div className="field"><label>Telefonszám</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xx xxx xxx" /></div>
            <div className="field"><label>Ajánlói kód (opcionális)</label><input value={refCode} onChange={(e) => setRefCode(e.target.value)} placeholder="pl. C2F85C" /></div>
          </>
        )}
        {step !== "forgot" && (
          <div className="field"><label>Jelszó</label><input type="password" name="password" autoComplete={step === "login" ? "current-password" : "new-password"} autoFocus={step === "login"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
        )}
        <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} disabled={busy} type="submit">
          {busy ? "Kérlek várj..." : step === "login" ? "Bejelentkezés" : step === "forgot" ? "Link küldése" : "Fiók létrehozása"}
        </button>
      </form>
      {step === "login" && (
        <div className="login-note" style={{ marginTop: 10 }}>
          <a href="#" onClick={(e) => { e.preventDefault(); setError(""); setStep("forgot"); }}>Elfelejtetted a jelszavad?</a>
        </div>
      )}
      {step === "forgot" && (
        <div className="login-note" style={{ marginTop: 6 }}>
          <a href="#" onClick={(e) => { e.preventDefault(); setError(""); setStep("login"); }}>Vissza a bejelentkezéshez</a>
        </div>
      )}
    </div>
  );
}

function ReferralLinkBox({ code, count }) {
  const [copied, setCopied] = useState(false);
  const link = `${SITE_URL}/fiok?ref=${code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="cp-referral-card">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
          Hívd meg barátaidat! Te is és ők is +200 pontot kaptok, ha regisztrálnak.
        </div>
        <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, whiteSpace: "nowrap" }}>{count} sikeres meghívás</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <span className="mono" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", background: "#F9FAFB", border: "1px solid var(--pub-line)", borderRadius: 8, padding: "8px 12px", fontSize: 11.5 }}>{link}</span>
        <button type="button" className="btn sec sm" style={{ flexShrink: 0 }} onClick={copy}>{copied ? "Másolva!" : "Másolás"}</button>
      </div>
    </div>
  );
}

function LoyaltyRing({ pct, balance }) {
  const r = 66, c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <svg width={160} height={160} viewBox="0 0 160 160">
      <circle cx="80" cy="80" r={r} fill="none" stroke="#EEF0F2" strokeWidth="13" />
      <circle
        cx="80" cy="80" r={r} fill="none" stroke="var(--primary)" strokeWidth="13" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 80 80)"
        style={{ transition: "stroke-dashoffset .5s ease" }}
      />
      <text x="80" y="76" textAnchor="middle" fontSize="28" fontWeight="800" fill="#111827">{balance}</text>
      <text x="80" y="98" textAnchor="middle" fontSize="12" fill="#6B7280">pont</text>
    </svg>
  );
}

function ChangePasswordForm() {
  const { updatePassword } = useCustomerAuth();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setDone(false);
    if (password.length < 6) { setError("A jelszó legalább 6 karakter legyen."); return; }
    if (password !== password2) { setError("A két jelszó nem egyezik."); return; }
    setBusy(true);
    try {
      await updatePassword(password);
      setPassword("");
      setPassword2("");
      setDone(true);
    } catch (err) {
      setError(err.message || "Hiba történt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dp-section">
      <div className="dp-section-title">Jelszó módosítása</div>
      {error && <div className="errbar">{error}</div>}
      {done && <div style={{ fontSize: 12.5, color: "#15803D", fontWeight: 700, marginBottom: 8 }}>✓ A jelszavad megváltozott.</div>}
      <form onSubmit={submit} style={{ maxWidth: 320 }}>
        <div className="field"><label>Új jelszó</label><input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
        <div className="field"><label>Új jelszó mégegyszer</label><input type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="••••••••" /></div>
        <button className="btn" disabled={busy} type="submit">{busy ? "Kérlek várj..." : "Jelszó mentése"}</button>
      </form>
    </div>
  );
}

function PasswordRecoveryForm() {
  const { updatePassword } = useCustomerAuth();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("A jelszó legalább 6 karakter legyen."); return; }
    if (password !== password2) { setError("A két jelszó nem egyezik."); return; }
    setBusy(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (err) {
      setError(err.message || "Hiba történt.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="login-card" style={{ maxWidth: 380 }}>
        <div className="login-title">Jelszó megváltoztatva</div>
        <p style={{ fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 1.5 }}>
          Az új jelszavaddal mostantól be tudsz jelentkezni.
        </p>
      </div>
    );
  }

  return (
    <div className="login-card" style={{ maxWidth: 380 }}>
      <div className="login-title">Új jelszó megadása</div>
      {error && <div className="errbar">{error}</div>}
      <form onSubmit={submit}>
        <div className="field"><label>Új jelszó</label><input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
        <div className="field"><label>Új jelszó mégegyszer</label><input type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="••••••••" /></div>
        <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={busy} type="submit">
          {busy ? "Kérlek várj..." : "Jelszó mentése"}
        </button>
      </form>
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
  const [loyalty, setLoyalty] = useState(null); // { pointsBalance, referralCode }
  const [rewards, setRewards] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [pRes, tRes, rRes, loyRes, rewardsRes] = await Promise.all([
          supabase.rpc("get_my_purchases"),
          supabase.rpc("get_my_tickets"),
          supabase.from("customer_requests").select("*").eq("customer_profile_id", profile.id).order("created_at", { ascending: false }),
          supabase.rpc("get_my_loyalty_status"),
          supabase.rpc("get_loyalty_rewards"),
        ]);
        if (pRes.error) throw pRes.error;
        if (tRes.error) throw tRes.error;
        if (rRes.error) throw rRes.error;
        setPurchases((pRes.data || []).map(myPurchaseFromApi));
        setTickets((tRes.data || []).map(myTicketFromApi));
        setRequests((rRes.data || []).map(customerRequestFromApi));
        const loy = loyRes.data?.[0];
        if (loy) setLoyalty({ pointsBalance: loy.points_balance || 0, referralCode: loy.referral_code || "", successfulReferrals: loy.successful_referrals || 0 });
        setRewards((rewardsRes.data || []).map((r) => ({ rewardKey: r.reward_key, label: r.label, pointCost: r.point_cost })));
      } catch (err) {
        setError(err.message || "Hiba történt az adatok betöltése közben.");
      } finally {
        setLoadingData(false);
      }
    })();
  }, [profile.id]);

  const tierGroups = useMemo(() => {
    const byPoints = new Map();
    for (const r of rewards) {
      if (!byPoints.has(r.pointCost)) byPoints.set(r.pointCost, []);
      byPoints.get(r.pointCost).push(r);
    }
    return Array.from(byPoints.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([pointCost, items]) => ({
        pointCost,
        rewardKey: items.map((r) => r.rewardKey).join("+"),
        label: items.map((r) => r.label).join(" vagy "),
      }));
  }, [rewards]);
  const nextReward = useMemo(() => {
    if (!loyalty) return null;
    const locked = tierGroups.filter((t) => t.pointCost > loyalty.pointsBalance);
    return locked[0] || null;
  }, [tierGroups, loyalty]);

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
          <>
            <div className="login-title" style={{ textAlign: "left", marginBottom: 18 }}>Szia, {profile.fullName || "!"}!</div>
            <div className="cp-stats-grid">
              {[
                { icon: CartIcon, num: purchases.length, label: "Vásárlások" },
                { icon: ServiceIcon, num: tickets.length, label: "Szervizmunkák" },
                { icon: WarrantyIcon, num: activeWarranties.length, label: "Aktív garanciák" },
                { icon: NoteIcon, num: requests.filter((r) => r.status !== "lezarva").length, label: "Nyitott kérések" },
              ].map((s) => (
                <div key={s.label} className="cp-stat-card">
                  <div className="cp-stat-card-top">
                    <div className="cp-stat-num">{s.num}</div>
                    <div className="cp-stat-icon"><s.icon width={17} height={17} /></div>
                  </div>
                  <div className="cp-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
            {loyalty && (
              <div className="cp-loyalty-card">
                <div className="dp-section-title" style={{ marginBottom: 14 }}>Hűségpontjaim</div>
                <div className="cp-loyalty-ring-wrap">
                  <LoyaltyRing balance={loyalty.pointsBalance} pct={nextReward ? (loyalty.pointsBalance / nextReward.pointCost) * 100 : 100} />
                  {nextReward ? (
                    <div className="cp-loyalty-ring-label">
                      Még <b>{nextReward.pointCost - loyalty.pointsBalance} pont</b> hiányzik a(z) <b>{nextReward.label}</b> ingyenes választásához!
                    </div>
                  ) : tierGroups.length > 0 ? (
                    <div className="cp-loyalty-ring-label" style={{ color: "#15803D", fontWeight: 700 }}>Minden elérhető jutalmat kiváltasz a pontjaiddal! 🎉</div>
                  ) : null}
                </div>
                {tierGroups.length > 0 && (
                  <div className="cp-tier-grid">
                    {tierGroups.map((r, i) => {
                      const reached = loyalty.pointsBalance >= r.pointCost;
                      const Icon = TIER_ICONS[i % TIER_ICONS.length];
                      return (
                        <div key={r.rewardKey} className={`cp-tier-card${reached ? " reached" : ""}`}>
                          {reached && <span className="cp-tier-badge"><CheckIcon width={13} height={13} /></span>}
                          <div className="cp-tier-icon"><Icon width={17} height={17} /></div>
                          <div className="cp-tier-label">{r.label}</div>
                          <div className="cp-tier-sub">
                            {r.pointCost} pont<br />
                            {reached ? "Már elérhető!" : `${r.pointCost - loyalty.pointsBalance} pont még`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {loyalty?.referralCode && <ReferralLinkBox code={loyalty.referralCode} count={loyalty.successfulReferrals || 0} />}
          </>
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
        ) : active === "requests" ? (
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
        ) : (
          <ChangePasswordForm />
        )}
      </div>
    </div>
  );
}

function PortalInner() {
  const { session, loading, profile, noCustomerProfile, passwordRecovery } = useCustomerAuth();

  return (
    <div className="pub-shop">
      <PublicHeader activeNav="login" langSwitchHref={null} />
      <main className="pub-lookup-main">
        {passwordRecovery ? (
          <PasswordRecoveryForm />
        ) : loading ? (
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
