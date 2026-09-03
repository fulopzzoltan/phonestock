import { useState, useEffect, Fragment } from "react";
import { supabase } from "./lib/supabaseClient";
import { money, statusCls, subStatusLabel, warrantyExpiry, isWarrantyActive, SERVICE_WARRANTY_TERMS } from "./lib/utils";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import SignaturePad from "./components/SignaturePad";
import FoliaUpsellBanner from "./components/FoliaUpsellBanner";
import WarrantyTermsToggle from "./components/WarrantyTermsToggle";
import { CallIcon, PhoneCaseIcon } from "./components/icons";

const INTAKE_CONSENT_TEXT = "Átadom a készüléket javításra, elfogadom a leírt hibát/állapotot";
// A hűségpont/ajánlói rendszer még nincs élesítve — amíg nem az, ne mutassuk a
// vásárlóknak, hogy ne keltsünk hamis elvárást egy nem működő funkcióról.
const LOYALTY_LIVE = false;

const STEP_MAP = { "Átvett": 0, "Javítás alatt": 1, "Minőségellenőrzés": 1, "Átadásra": 2 };
const TIMELINE_STEPS = [
  { label: "Bejelentve" },
  { label: "Szerviz alatt", activeCaption: "most zajlik", pendingCaption: "még nem kezdődött el" },
  { label: "Kész", activeCaption: "átvehető az üzletben", pendingCaption: "javítás lezárva" },
  { label: "Átvéve", pendingCaption: "nálad lesz a készülék" },
];

function LoyaltyBox({ balance, code }) {
  if (balance == null) return null;
  return (
    <div style={{ background: "var(--primary-soft)", border: "1px solid var(--primary)", borderRadius: 12, padding: "12px 14px", marginBottom: 14, fontSize: 12.5, color: "#374151", lineHeight: 1.6 }}>
      <b style={{ color: "var(--primary-ink)" }}>{balance} pontod van.</b>
      {code && <> Ajánlói kódod: <span className="mono" style={{ fontWeight: 700 }}>{code}</span> — add tovább egy barátnak, és ha nálunk vásárol vagy szervizeltet, mindketten +200 pontot kaptok!</>}
    </div>
  );
}

// "Élő" jelvény — csomagkövetős alkalmazások (UPS, DPDgroup) mintájára: azt kommunikálja
// első pillantásra, hogy ez nem egy statikus PDF-kép, hanem valós idejű állapot, amit a
// szerviz frissít.
function LiveBadge({ label = "Élő nyomonkövetés" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 700, color: "var(--primary-ink)", letterSpacing: 0.3, textTransform: "uppercase" }}>
      <span className="status-live-dot" />
      {label}
    </div>
  );
}

// A találat "fejléce" egy csomag-/eszközkártyaként — ikon, cím, alcím (jegyszám + ügyfél)
// és egy státusz-jelvény egy sorban, a korábbi külön "cím + #szám" sor és "Ügyfél" adatsor
// összevonva, hogy azonnal, egy pillantásra átlátható legyen, miről van szó.
function EntityTile({ icon: Icon, title, subtitle, statusLabel, statusClass }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, background: "var(--pub-paper)", border: "1px solid var(--pub-line)", marginBottom: 22 }}>
      <div style={{ width: 46, height: 46, borderRadius: 14, background: "var(--primary-soft)", border: "1px solid rgba(29,185,84,.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon width={20} height={20} style={{ color: "var(--primary-ink)" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{title}</div>
        <div className="mono" style={{ fontSize: 11.5, color: "#9CA3AF" }}>{subtitle}</div>
      </div>
      {statusLabel && <span className={`st ${statusClass}`} style={{ flexShrink: 0 }}>{statusLabel}</span>}
    </div>
  );
}

// Két gyors-pillantású kártya (ár + garancia) az idővonal alatt — ugyanaz a mintázat, mint
// egy csomagküldő app "várható kézbesítés / súly" chip-sora.
function StatChip({ label, children }) {
  return (
    <div style={{ flex: 1, padding: "13px 14px", borderRadius: 14, background: "var(--pub-paper)", border: "1px solid var(--pub-line)" }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 5 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

// Függőleges idővonal a korábbi vízszintes lépésjelző helyett — több hely jut a lépésekhez
// tartozó valós dátumnak/leírásnak, és jobban követi egy élő csomagkövetés megszokott nyelvét.
function StatusTimeline({ status, handedOver, dateIn, dateOut }) {
  const activeStep = handedOver ? 3 : (STEP_MAP[status] ?? 0);
  return (
    <div style={{ display: "flex", gap: 16, margin: "4px 0 22px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 2 }}>
        {TIMELINE_STEPS.map((s, i) => {
          const reached = i <= activeStep;
          const current = i === activeStep && !handedOver;
          return (
            <Fragment key={s.label}>
              <div
                className={current ? "status-node-pulse" : ""}
                style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, background: reached ? "var(--primary)" : "#F3F4F6", border: reached ? "none" : "1px solid #E5E7EB" }}
              />
              {i < TIMELINE_STEPS.length - 1 && (
                <div style={{ width: 2, flex: 1, minHeight: 26, margin: "2px 0", background: i < activeStep || handedOver ? "var(--primary)" : "#E5E7EB" }} />
              )}
            </Fragment>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
        {TIMELINE_STEPS.map((s, i) => {
          const reached = i <= activeStep;
          const current = i === activeStep && !handedOver;
          let caption;
          if (i === 0) caption = dateIn || "munkalap felvéve";
          else if (i === 3 && handedOver) caption = dateOut || "átvéve";
          else caption = current ? s.activeCaption : s.pendingCaption;
          return (
            <div key={s.label} style={{ paddingBottom: i < TIMELINE_STEPS.length - 1 ? 18 : 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: reached ? 800 : 700, color: reached ? "#111827" : "#9CA3AF" }}>{s.label}</div>
              <div style={{ fontSize: 11, color: reached ? "#6B7280" : "#C1C6CC" }}>{caption}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StatusLookup({ token, shortCode, signStage, minimal = false, lang = "hu" }) {
  // Nincs külön RO tartalma ennek az oldalnak — a ?lang=ro csak a fejléc/lábléc keretet
  // (és a nyelvváltó saját állapotát) tartja meg a látogató nyelvén, ugyanaz a minta,
  // mint az ÁSZF/Adatvédelem oldalaknál.
  const otherLangHref = `${window.location.pathname}${lang === "ro" ? "" : "?lang=ro"}`;
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(!!token || !!shortCode);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [matches, setMatches] = useState(null);
  const [signature, setSignature] = useState(null);
  const [signerName, setSignerName] = useState("");
  const [signBusy, setSignBusy] = useState(false);
  const [signError, setSignError] = useState("");
  const [foliaCancelBusy, setFoliaCancelBusy] = useState(false);
  const [foliaCancelError, setFoliaCancelError] = useState("");

  const signMode = signStage === "service_intake" || signStage === "service_handover";

  useEffect(() => {
    if (!token && !shortCode) return;
    (async () => {
      try {
        const { data, error: err } = shortCode
          ? await supabase.rpc("get_ticket_status_by_short_code", { p_code: shortCode })
          : await supabase.rpc("get_ticket_status_by_token", { p_token: token });
        if (err) throw err;
        if (!data || data.length === 0) {
          setError("Érvénytelen vagy lejárt link.");
          return;
        }
        setResult({ kind: "ticket", ...data[0] });
        setSignerName(data[0].customer_name || "");
        if (token && data[0].ticket_kind === "Ügyfél" && data[0].sub_status !== "Átadva" && !data[0].folia_upsell_requested) {
          try {
            await supabase.rpc("mark_folia_upsell_shown_by_token", { p_token: token });
          } catch {}
        }
        if (signMode && token) {
          const { data: sigs } = await supabase.rpc("get_public_signatures", { p_kind: "ticket", p_token: token });
          const existing = (sigs || []).find((s) => s.stage === signStage);
          if (existing) setSignature(existing);
        }
      } catch (err) {
        setError(err.message || "Hiba történt a keresés közben.");
      } finally {
        setBusy(false);
      }
    })();
  }, [token, shortCode]);

  async function submitSignature(dataUrl) {
    setSignBusy(true);
    setSignError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("submit-signature", {
        body: { token, kind: "ticket", stage: signStage, signerName, imageDataUrl: dataUrl },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setSignature({ stage: signStage, signer_name: data.signature.signerName, signed_at: data.signature.signedAt, image_path: data.signature.imagePath });
    } catch (err) {
      setSignError(err.message || "Hiba történt az aláírás mentése közben.");
    } finally {
      setSignBusy(false);
    }
  }

  async function cancelFoliaUpsell() {
    setFoliaCancelBusy(true);
    setFoliaCancelError("");
    try {
      const { data, error } = await supabase.rpc("cancel_folia_upsell_by_token", { p_token: token });
      if (error) throw error;
      const r = data?.[0];
      if (r?.success) {
        setResult((prev) => ({ ...prev, folia: false, folia_upsell_requested: false, price: Math.max(0, (Number(prev.price) || 0) - (Number(prev.folia_upsell_price) || 0)) }));
      } else {
        setFoliaCancelError(r?.message || "Hiba történt.");
      }
    } catch (err) {
      setFoliaCancelError(err.message || "Hiba történt.");
    } finally {
      setFoliaCancelBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    setMatches(null);
    try {
      const [ticketsRes, purchasesRes] = await Promise.all([
        supabase.rpc("get_ticket_status_by_phone", { p_phone: phone }),
        supabase.rpc("get_receipt_by_phone", { p_phone: phone }),
      ]);
      if (ticketsRes.error) throw ticketsRes.error;
      if (purchasesRes.error) throw purchasesRes.error;
      const combined = [
        ...(ticketsRes.data || []).map((t) => ({ kind: "ticket", ...t })),
        ...(purchasesRes.data || []).map((r) => ({ kind: "purchase", ...r })),
      ];
      if (combined.length === 0) {
        setError("Nem található munkalap vagy vásárlás ezzel a telefonszámmal.");
      } else if (combined.length === 1) {
        setResult(combined[0]);
      } else {
        setMatches(combined);
      }
    } catch (err) {
      setError(err.message || "Hiba történt a keresés közben.");
    } finally {
      setBusy(false);
    }
  }

  const isTicket = result?.kind === "ticket";
  const isPurchase = result?.kind === "purchase";
  const probs = (result?.issue || "").split(",").map((p) => p.trim()).filter(Boolean);
  const handedOver = result?.sub_status === "Átadva";
  const handoverAllowed = result?.status === "Átadásra" && result?.sub_status !== "Sikertelen";
  const warrantyFrom = result?.date_out || null;
  const ticketExpiry = handedOver ? warrantyExpiry(warrantyFrom, result?.warranty) : null;
  const ticketActive = handedOver ? isWarrantyActive(warrantyFrom, result?.warranty) : false;
  const purchaseExpiry = isPurchase ? warrantyExpiry(result.date, result.warranty) : null;
  const purchaseActive = isPurchase ? isWarrantyActive(result.date, result.warranty) : false;

  return (
    <div className="pub-shop">
      <PublicHeader activeNav="status" minimal={minimal} lang={lang} langSwitchHref={otherLangHref} />
      <main className="pub-lookup-main">
      <div className="login-card" style={{ maxWidth: 460 }}>
        {!result && !matches && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <LiveBadge />
          </div>
        )}
        {!result && <div className="login-title">Hol tart most a telefonod?</div>}
        {error && <div className="errbar">{error}</div>}
        {busy && !result && <div style={{ textAlign: "center", color: "#6B7280", fontSize: 13, padding: "10px 0" }}>Betöltés...</div>}
        {!token && !shortCode && !result && !matches && !busy && (
          <form onSubmit={submit}>
            <div className="field"><label>Telefonszám</label><input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xx xxx xxx" /></div>
            <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={busy} type="submit">
              {busy ? "Keresés..." : "Adatok lekérése"}
            </button>
          </form>
        )}
        {matches && !result && (
          <div>
            <div className="login-note" style={{ marginBottom: 10 }}>Több találatot is találtunk — válaszd ki, melyiket keresed:</div>
            <div className="dp-section">
              {matches.map((m) => (
                <div key={`${m.kind}-${m.kind === "ticket" ? m.ticket_no : m.receipt_no}`} className="dp-row" style={{ cursor: "pointer" }} onClick={() => setResult(m)}>
                  <span className="dp-key">
                    <span className="badge-loc" style={{ marginRight: 6 }}>{m.kind === "ticket" ? "Szerviz" : "Vásárlás"}</span>
                    #{m.kind === "ticket" ? m.ticket_no : m.receipt_no} · {m.kind === "ticket" ? [m.brand, m.model].filter(Boolean).join(" ") : m.description}
                    <br /><span style={{ color: "#9CA3AF", fontWeight: 500 }}>{m.customer_name}</span>
                  </span>
                  {m.kind === "ticket" ? (
                    <span className={`st ${statusCls(m.status)}`}>{m.sub_status ? subStatusLabel(m.status, m.sub_status) : m.status}</span>
                  ) : (
                    <span className="dp-val mono">{money(m.amount)}</span>
                  )}
                </div>
              ))}
            </div>
            <button className="btn sec" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} onClick={() => setMatches(null)}>Vissza</button>
          </div>
        )}
        {isTicket && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <LiveBadge label="Élő frissítés" />
            </div>
            <EntityTile
              icon={PhoneCaseIcon}
              title={[result.brand, result.model].filter(Boolean).join(" ") || "Készülék"}
              subtitle={`#${result.ticket_no} · ${result.customer_name}`}
              statusLabel={result.sub_status ? subStatusLabel(result.status, result.sub_status) : result.status}
              statusClass={statusCls(result.status)}
            />
            <StatusTimeline status={result.status} handedOver={handedOver} dateIn={result.date_in} dateOut={result.date_out} />
            <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
              <StatChip label="Javítási költség">
                <span className="mono" style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>{money(result.price)}</span>
              </StatChip>
              <StatChip label="Garancia">
                {!handedOver ? <span style={{ fontSize: 13, fontWeight: 800, color: "#9CA3AF" }}>—</span> : result.warranty ? (
                  <span className={`st ${ticketActive ? "st-kesz" : "st-kiadva"}`}>{ticketActive ? "Érvényes" : "Lejárt"}</span>
                ) : (
                  <span className="st st-sikertelen">Nincs</span>
                )}
              </StatChip>
            </div>
            <div className="dp-section">
              <div className="dp-row"><span className="dp-key">Helyszín</span><span className="dp-val">{result.location_name || "—"}{result.location_phone ? ` · ${result.location_phone}` : ""}</span></div>
              <div className="dp-row"><span className="dp-key">Bejelentett hibák</span><span className="dp-val">{probs.length ? probs.map((p, i) => <span key={i} className="prob-pill">{p}</span>) : "—"}</span></div>
              {handedOver && result.warranty && (
                <div className="dp-row"><span className="dp-key">Garancia lejárata</span><span className="dp-val">{ticketExpiry}</span></div>
              )}
            </div>
            {result.location_phone && (
              <a href={`tel:${result.location_phone.replace(/\s+/g, "")}`} className="btn" style={{ width: "100%", justifyContent: "center", marginBottom: 14, textDecoration: "none" }}>
                <CallIcon width={13} height={13} /> Hívás a szervizhez
              </a>
            )}
            {token && result.ticket_kind === "Ügyfél" && !handedOver && !result.folia_upsell_requested && (
              <FoliaUpsellBanner token={token} deviceLabel={[result.brand, result.model].filter(Boolean).join(" ")} onDone={() => setResult({ ...result, folia: true, folia_upsell_requested: true, folia_upsell_price: 30, price: (Number(result.price) || 0) + 30 })} />
            )}
            {result.folia_upsell_requested && (
              <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "8px 12px", marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "#15803D" }}>
                  ✓ Védőfólia megrendelve (+{money(result.folia_upsell_price)}) — átadáskor felhelyezzük.
                </div>
                {!handedOver && (
                  <>
                    {foliaCancelError && <div style={{ fontSize: 11.5, color: "#B91C1C", marginTop: 6 }}>{foliaCancelError}</div>}
                    <button
                      type="button"
                      onClick={cancelFoliaUpsell}
                      disabled={foliaCancelBusy}
                      style={{ background: "none", border: "none", padding: 0, marginTop: 6, fontSize: 11.5, color: "#6B7280", textDecoration: "underline", cursor: "pointer" }}
                    >
                      {foliaCancelBusy ? "Visszavonás..." : "Véletlenül nyomtam rá, mégsem kérem"}
                    </button>
                  </>
                )}
              </div>
            )}
            {LOYALTY_LIVE && <LoyaltyBox balance={result.customer_points_balance} code={result.customer_referral_code} />}
            <WarrantyTermsToggle title="Szerviz garancia feltételek" text={SERVICE_WARRANTY_TERMS} />
            {signMode && signStage === "service_handover" && !handoverAllowed && (
              <div className="errbar" style={{ marginBottom: 14 }}>Ez a munkalap még nincs átadásra kész.</div>
            )}
            {signMode && (signStage === "service_intake" || handoverAllowed) && (
              signature ? (
                <div className="dp-section" style={{ marginBottom: 14, textAlign: "center" }}>
                  <div style={{ color: "#22C55E", fontWeight: 700, fontSize: 14 }}>✓ Aláírva — {signature.signer_name}</div>
                  <div style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>{new Date(signature.signed_at).toLocaleString("hu-HU")}</div>
                </div>
              ) : (
                <div className="dp-section" style={{ marginBottom: 14 }}>
                  <div className="dp-section-title">{signStage === "service_intake" ? "Átvételi aláírás" : "Átadási aláírás"}</div>
                  {signStage === "service_intake" && (
                    <div style={{ fontSize: 12.5, color: "#374151", marginBottom: 10, lineHeight: 1.5 }}>{INTAKE_CONSENT_TEXT}</div>
                  )}
                  {signError && <div className="errbar" style={{ marginBottom: 10 }}>{signError}</div>}
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label>Aláíró neve</label>
                    <input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Név" />
                  </div>
                  <SignaturePad onSave={submitSignature} busy={signBusy} />
                </div>
              )
            )}
            {!token && !shortCode && (
              <div style={{ display: "flex", gap: 8 }}>
                {matches && <button className="btn sec" style={{ flex: 1, justifyContent: "center" }} onClick={() => setResult(null)}>← Vissza a találatokhoz</button>}
                <button className="btn sec" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setResult(null); setMatches(null); setPhone(""); }}>Új keresés</button>
              </div>
            )}
          </div>
        )}
        {isPurchase && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <LiveBadge label="Vásárlási bizonylat" />
            </div>
            <EntityTile
              icon={PhoneCaseIcon}
              title={result.description}
              subtitle={`#${result.receipt_no} · ${result.customer_name || "—"}`}
              statusLabel="Megvásárolva"
              statusClass="st-beveve"
            />
            <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
              <StatChip label="Ár">
                <span className="mono" style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>{money(result.amount)}</span>
              </StatChip>
              <StatChip label="Garancia">
                {result.warranty ? (
                  <span className={`st ${purchaseActive ? "st-kesz" : "st-kiadva"}`}>{purchaseActive ? "Érvényes" : "Lejárt"}</span>
                ) : (
                  <span className="st st-sikertelen">Nincs</span>
                )}
              </StatChip>
            </div>
            <div className="dp-section">
              <div className="dp-row"><span className="dp-key">Helyszín</span><span className="dp-val">{result.location_name || "—"}{result.location_phone ? ` · ${result.location_phone}` : ""}</span></div>
              <div className="dp-row"><span className="dp-key">Vásárlás dátuma</span><span className="dp-val">{result.date || "—"}</span></div>
              {result.warranty && (
                <div className="dp-row"><span className="dp-key">Garancia lejárata</span><span className="dp-val">{purchaseExpiry}</span></div>
              )}
            </div>
            {result.location_phone && (
              <a href={`tel:${result.location_phone.replace(/\s+/g, "")}`} className="btn" style={{ width: "100%", justifyContent: "center", marginBottom: 14, textDecoration: "none" }}>
                <CallIcon width={13} height={13} /> Hívás a szervizhez
              </a>
            )}
            {LOYALTY_LIVE && <LoyaltyBox balance={result.customer_points_balance} code={result.customer_referral_code} />}
            {!token && !shortCode && (
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {matches && <button className="btn sec" style={{ flex: 1, justifyContent: "center" }} onClick={() => setResult(null)}>← Vissza a találatokhoz</button>}
                <button className="btn sec" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setResult(null); setMatches(null); setPhone(""); }}>Új keresés</button>
              </div>
            )}
          </div>
        )}
        {!token && !shortCode && !result && !matches && <div className="login-note">Írd be a leadáskor/vásárláskor megadott telefonszámot — a szervizmunkáidat és a vásárlásaidat is megmutatjuk.</div>}
        {!token && !shortCode && !result && !matches && !minimal && (
          <div className="login-note" style={{ marginTop: 6 }}>
            Vissza a <a href="/">készlethez</a>.
          </div>
        )}
      </div>
      </main>
      <PublicFooter minimal={minimal} lang={lang} />
    </div>
  );
}
