import { useState, useEffect, Fragment } from "react";
import { supabase } from "./lib/supabaseClient";
import { money, statusCls, subStatusLabel, warrantyExpiry, isWarrantyActive, SERVICE_WARRANTY_TERMS } from "./lib/utils";
import { t } from "./lib/i18n";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import SignaturePad from "./components/SignaturePad";
import FoliaUpsellBanner from "./components/FoliaUpsellBanner";
import WarrantyTermsToggle from "./components/WarrantyTermsToggle";
import { CallIcon, PhoneCaseIcon, ChevronLeftIcon } from "./components/icons";

const INTAKE_CONSENT_TEXT = "Átadom a készüléket javításra, elfogadom a leírt hibát/állapotot";
// A hűségpont/ajánlói rendszer még nincs élesítve — amíg nem az, ne mutassuk a
// vásárlóknak, hogy ne keltsünk hamis elvárást egy nem működő funkcióról.
const LOYALTY_LIVE = false;

const STEP_MAP = { "Átvett": 0, "Javítás alatt": 1, "Minőségellenőrzés": 1, "Átadásra": 2 };
// Minden lépéshez 3 külön szöveg tartozik: mit írjunk ki, ha ez a lépés zajlik éppen (active),
// ha már túl vagyunk rajta (done), és ha még csak ezután jön (upcoming) — enélkül egy jövőbeli
// lépés simán "lezárva"/"megtörtént" szöveget kapna, ami félrevezető lenne, mielőtt megtörténne.
// A lang szerinti szöveg (s) miatt függvényként épül fel, nem statikus konstansként.
function timelineSteps(s) {
  return [
    { label: s.stepReported },
    { label: s.stepInProgress, activeCaption: s.capInProgressActive, doneCaption: s.capInProgressDone, upcomingCaption: s.capInProgressUpcoming },
    { label: s.stepReady, activeCaption: s.capReadyActive, doneCaption: s.capReadyDone, upcomingCaption: s.capReadyUpcoming },
    { label: s.stepPickedUp, upcomingCaption: s.capPickedUpUpcoming },
  ];
}

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

// Rács-alapú idővonal (nem flex+space-between) — a dot-oszlop mindig ugyanolyan
// széles, ezért egy hosszabb dátum/felirat sem tudja elcsúsztatni a sorokat.
function StatusTimeline({ status, handedOver, dateIn, dateOut, s }) {
  const activeStep = handedOver ? 3 : (STEP_MAP[status] ?? 0);
  const steps = timelineSteps(s);
  return (
    <div className="ticket-timeline">
      {steps.map((step, i) => {
        const reached = i <= activeStep;
        const current = i === activeStep && !handedOver;
        const isLast = i === steps.length - 1;
        let caption;
        if (i === 0) caption = dateIn || s.capReportedFallback;
        else if (i === 3 && handedOver) caption = dateOut || step.label;
        else if (current) caption = step.activeCaption;
        else if (i < activeStep || handedOver) caption = step.doneCaption;
        else caption = step.upcomingCaption;
        return (
          <Fragment key={step.label}>
            <div className="ticket-tl-dotcol">
              <span className={`ticket-tl-dot${reached ? " reached" : ""}${current ? " status-node-pulse" : ""}`} />
              {!isLast && <span className={`ticket-tl-line${i < activeStep || handedOver ? " reached" : ""}`} />}
            </div>
            <div className={`ticket-tl-body${isLast ? " last" : ""}`}>
              <div className="ticket-tl-title-row">
                <span className={`ticket-tl-title${current ? " current" : ""}${!reached ? " upcoming" : ""}`}>{step.label}</span>
                {current && <span className="status-live-dot" style={{ width: 5, height: 5 }} />}
              </div>
              <div className={`ticket-tl-caption${!reached ? " upcoming" : ""}`}>{caption}</div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

export default function StatusLookup({ token, shortCode, signStage, minimal = false, lang = "hu" }) {
  // Nincs külön RO tartalma ennek az oldalnak — a ?lang=ro csak a fejléc/lábléc keretet
  // (és a nyelvváltó saját állapotát) tartja meg a látogató nyelvén, ugyanaz a minta,
  // mint az ÁSZF/Adatvédelem oldalaknál.
  const otherLangHref = `${window.location.pathname}${lang === "ro" ? "" : "?lang=ro"}`;
  const s = t(lang);
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
          setError(s.statusInvalidLink);
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
        setError(err.message || s.statusSearchError);
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // A telefonszám-keresés nem közvetlen RPC-t hív, hanem a status-phone-lookup Edge
      // Function-t — az intézi az IP- és cél-szám-alapú rate-limitet, és a visszaadott nevet
      // is maszkolja (csak annyi látszik, amennyi több találatnál a megkülönböztetéshez kell) —
      // ld. a felhasználóval egyeztetett biztonsági intézkedést.
      const { data, error: fnError } = await supabase.functions.invoke("status-phone-lookup", { body: { phone } });
      if (fnError) throw fnError;
      if (data?.error === "rate_limited") throw new Error(s.statusRateLimited);
      if (data?.error === "invalid_phone") throw new Error(s.statusInvalidPhone);
      if (data?.error) throw new Error(s.statusSearchError);
      const combined = [
        ...(data?.tickets || []).map((t) => ({ kind: "ticket", ...t })),
        ...(data?.purchases || []).map((r) => ({ kind: "purchase", ...r })),
      ];
      if (combined.length === 0) {
        setError(s.statusNotFound);
      } else if (combined.length === 1) {
        setResult(combined[0]);
      } else {
        setMatches(combined);
      }
    } catch (err) {
      setError(err.message || s.statusSearchError);
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
      {isTicket ? (
        <div style={{ width: "100%", maxWidth: 400, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {matches && (
            <button type="button" className="ticket-back-link" onClick={() => setResult(null)}>
              <ChevronLeftIcon width={12} height={12} /> {s.backToResults}
            </button>
          )}
          <div style={{ marginBottom: 18 }}>
            <LiveBadge label={s.statusLiveBadge} />
          </div>

          <div className="ticket-card">
            <div className="ticket-head">
              <div className="ticket-head-row">
                <span className="ticket-eyebrow">{s.statusKindTicket}</span>
                <span className={`st ${statusCls(result.status)}`}>{result.sub_status ? subStatusLabel(result.status, result.sub_status) : result.status}</span>
              </div>
              <div className="ticket-no">#{result.ticket_no}</div>
              <div className="ticket-device">{[result.brand, result.model].filter(Boolean).join(" ") || s.statusDeviceFallback}</div>
              <div className="ticket-customer">{result.customer_name}</div>
            </div>

            <div className="ticket-perf">
              <span className="ticket-notch l" /><span className="ticket-notch r" />
              <div className="ticket-perf-line" />
            </div>

            <StatusTimeline status={result.status} handedOver={handedOver} dateIn={result.date_in} dateOut={result.date_out} s={s} />

            <div className="ticket-rows">
              <div className="ticket-row">
                <span className="ticket-row-label">{s.chipRepairCost}</span>
                <span className="ticket-row-value">{money(result.price)}</span>
              </div>
              <div className="ticket-row">
                <span className="ticket-row-label">{s.chipWarranty}</span>
                {!handedOver ? (
                  <span className="ticket-row-value muted">—</span>
                ) : result.warranty ? (
                  <span className={`st ${ticketActive ? "st-kesz" : "st-kiadva"}`}>{ticketActive ? s.warrantyActive : s.warrantyExpired}</span>
                ) : (
                  <span className="st st-sikertelen">{s.warrantyNone}</span>
                )}
              </div>
              {handedOver && result.warranty && (
                <div className="ticket-row">
                  <span className="ticket-row-label">{s.rowWarrantyExpiry}</span>
                  <span className="ticket-row-value muted">{ticketExpiry}</span>
                </div>
              )}
              <div className="ticket-row-tags">
                <span className="ticket-row-tags-label">{s.rowIssues}</span>
                <span className="ticket-row-tags-value">{probs.length ? probs.map((p, i) => <span key={i} className="prob-pill">{p}</span>) : "—"}</span>
              </div>
            </div>

            <div className="ticket-shop-row">
              <CallIcon width={13} height={13} style={{ color: "var(--pub-ink-soft)" }} />
              <span className="ticket-shop-link">{result.location_name || "—"}{result.location_phone ? ` · ${result.location_phone}` : ""}</span>
            </div>
          </div>

          {result.location_phone && (
            <a href={`tel:${result.location_phone.replace(/\s+/g, "")}`} className="ticket-cta">
              <CallIcon width={13} height={13} /> {s.callUsBtn}
            </a>
          )}
          <div className="ticket-updated">
            <span className="status-live-dot" style={{ width: 5, height: 5 }} />
            <span className="ticket-updated-label">{s.statusUpdatedNow}</span>
          </div>

          <div style={{ width: "100%", marginTop: 16 }}>
            {token && result.ticket_kind === "Ügyfél" && !handedOver && !result.folia_upsell_requested && (
              <FoliaUpsellBanner token={token} deviceLabel={[result.brand, result.model].filter(Boolean).join(" ")} onDone={() => setResult({ ...result, folia: true, folia_upsell_requested: true, folia_upsell_price: 30, price: (Number(result.price) || 0) + 30 })} />
            )}
            {result.folia_upsell_requested && (
              <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "8px 12px", marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "#15803D" }}>
                  {s.foliaOrderedNote(money(result.folia_upsell_price))}
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
                      {foliaCancelBusy ? s.foliaCancelling : s.foliaCancelBtn}
                    </button>
                  </>
                )}
              </div>
            )}
            {LOYALTY_LIVE && <LoyaltyBox balance={result.customer_points_balance} code={result.customer_referral_code} />}
            <WarrantyTermsToggle title={s.warrantyTermsTitle} text={SERVICE_WARRANTY_TERMS} />
            {signMode && signStage === "service_handover" && !handoverAllowed && (
              <div className="errbar" style={{ marginBottom: 14 }}>{s.handoverNotReady}</div>
            )}
            {signMode && (signStage === "service_intake" || handoverAllowed) && (
              signature ? (
                <div className="ticket-extra-card" style={{ textAlign: "center" }}>
                  <div style={{ color: "#22C55E", fontWeight: 700, fontSize: 14 }}>✓ {s.signedLabel} {signature.signer_name}</div>
                  <div style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>{new Date(signature.signed_at).toLocaleString("hu-HU")}</div>
                </div>
              ) : (
                <div className="ticket-extra-card">
                  <div className="dp-section-title">{signStage === "service_intake" ? s.intakeSignTitle : s.handoverSignTitle}</div>
                  {signStage === "service_intake" && (
                    <div style={{ fontSize: 12.5, color: "#374151", marginBottom: 10, lineHeight: 1.5 }}>{INTAKE_CONSENT_TEXT}</div>
                  )}
                  {signError && <div className="errbar" style={{ marginBottom: 10 }}>{signError}</div>}
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label>{s.signerNameLabel}</label>
                    <input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder={s.nameLabel} />
                  </div>
                  <SignaturePad onSave={submitSignature} busy={signBusy} />
                </div>
              )
            )}
            {!token && !shortCode && (
              <div style={{ display: "flex", gap: 8 }}>
                {matches && <button className="btn sec" style={{ flex: 1, justifyContent: "center" }} onClick={() => setResult(null)}>{s.backToResults}</button>}
                <button className="btn sec" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setResult(null); setMatches(null); setPhone(""); }}>{s.newSearch}</button>
              </div>
            )}
          </div>
        </div>
      ) : (
      <div className="login-card" style={{ maxWidth: 460 }}>
        {!result && !matches && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <LiveBadge label={s.statusLiveBadge} />
          </div>
        )}
        {!result && <div className="login-title">{s.statusPageTitle}</div>}
        {error && <div className="errbar">{error}</div>}
        {busy && !result && <div style={{ textAlign: "center", color: "#6B7280", fontSize: 13, padding: "10px 0" }}>{s.loading}</div>}
        {!token && !shortCode && !result && !matches && !busy && (
          <form onSubmit={submit}>
            <div className="field"><label>{s.phoneLabel}</label><input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={s.statusPhonePlaceholder} /></div>
            <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={busy} type="submit">
              {busy ? s.statusSearching : s.statusViewBtn}
            </button>
          </form>
        )}
        {matches && !result && (
          <div>
            <div className="login-note" style={{ marginBottom: 10 }}>{s.statusMultipleFound}</div>
            <div className="match-list">
              {matches.map((m) => (
                <div key={`${m.kind}-${m.kind === "ticket" ? m.ticket_no : m.receipt_no}`} className="match-row" onClick={() => setResult(m)}>
                  <div className="match-row-top">
                    <span className="badge-loc">{m.kind === "ticket" ? s.statusKindTicket : s.statusKindPurchase}</span>
                    <span className="match-row-no mono">#{m.kind === "ticket" ? m.ticket_no : m.receipt_no}</span>
                  </div>
                  <div className="match-row-title">{m.kind === "ticket" ? [m.brand, m.model].filter(Boolean).join(" ") : m.description}</div>
                  <div className="match-row-bottom">
                    <span className="match-row-customer">{m.customer_name}</span>
                    {m.kind === "ticket" ? (
                      <span className={`st ${statusCls(m.status)}`}>{m.sub_status ? subStatusLabel(m.status, m.sub_status) : m.status}</span>
                    ) : (
                      <span className="match-row-amount mono">{money(m.amount)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn sec" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} onClick={() => setMatches(null)}>{s.statusBackBtn}</button>
          </div>
        )}
        {isPurchase && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <LiveBadge label={s.statusPurchaseBadge} />
            </div>
            <EntityTile
              icon={PhoneCaseIcon}
              title={result.description}
              subtitle={`#${result.receipt_no}`}
              statusLabel={s.purchasedLabel}
              statusClass="st-beveve"
            />
            <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
              <StatChip label={s.chipPrice}>
                <span className="mono" style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>{money(result.amount)}</span>
              </StatChip>
              <StatChip label={s.chipWarranty}>
                {result.warranty ? (
                  <span className={`st ${purchaseActive ? "st-kesz" : "st-kiadva"}`}>{purchaseActive ? s.warrantyActive : s.warrantyExpired}</span>
                ) : (
                  <span className="st st-sikertelen">{s.warrantyNone}</span>
                )}
              </StatChip>
            </div>
            <div className="dp-section">
              <div className="dp-row"><span className="dp-key">{s.rowShop}</span><span className="dp-val">{result.location_name || "—"}{result.location_phone ? ` · ${result.location_phone}` : ""}</span></div>
              <div className="dp-row"><span className="dp-key">{s.rowPurchaseDate}</span><span className="dp-val">{result.date || "—"}</span></div>
              {result.warranty && (
                <div className="dp-row"><span className="dp-key">{s.rowWarrantyExpiry}</span><span className="dp-val">{purchaseExpiry}</span></div>
              )}
            </div>
            {result.location_phone && (
              <a href={`tel:${result.location_phone.replace(/\s+/g, "")}`} className="btn" style={{ width: "100%", justifyContent: "center", marginBottom: 14, textDecoration: "none" }}>
                <CallIcon width={13} height={13} /> {s.callUsBtn}
              </a>
            )}
            {LOYALTY_LIVE && <LoyaltyBox balance={result.customer_points_balance} code={result.customer_referral_code} />}
            {!token && !shortCode && (
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {matches && <button className="btn sec" style={{ flex: 1, justifyContent: "center" }} onClick={() => setResult(null)}>{s.backToResults}</button>}
                <button className="btn sec" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setResult(null); setMatches(null); setPhone(""); }}>{s.newSearch}</button>
              </div>
            )}
          </div>
        )}
        {!token && !shortCode && !result && !matches && <div className="login-note">{s.statusPhoneHint}</div>}
        {!token && !shortCode && !result && !matches && !minimal && (
          <div className="login-note" style={{ marginTop: 6 }}>
            {s.backToStockPrefix} <a href="/">{s.backToStockLink}</a>.
          </div>
        )}
      </div>
      )}
      </main>
      <PublicFooter minimal={minimal} lang={lang} />
    </div>
  );
}
