import { useState, useEffect, Fragment } from "react";
import { supabase } from "./lib/supabaseClient";
import { money, statusCls, subStatusLabel, warrantyExpiry, isWarrantyActive, SERVICE_WARRANTY_TERMS } from "./lib/utils";
import { t } from "./lib/i18n";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import PublicBottomNav from "./components/PublicBottomNav";
import SignaturePad from "./components/SignaturePad";
import FoliaUpsellBanner from "./components/FoliaUpsellBanner";
import WarrantyTermsToggle from "./components/WarrantyTermsToggle";
import { CallIcon, PhoneCaseIcon, ChevronLeftIcon, ClockIcon, PinIcon, WhatsappIcon, CardIcon } from "./components/icons";

// Központi ügyfélszolgálati szám — ugyanaz, mint a lábléc "minimal" nézetében.
const SUPPORT_PHONE = "0773985278";
// wa.me nemzetközi formátumot vár (nincs vezető 0, országhívó helyette) — a Meta WhatsApp
// integrációhoz használt ügyfélszolgálati szám román előhívóval.
const SUPPORT_WHATSAPP = `40${SUPPORT_PHONE.replace(/^0/, "")}`;

// Ugyanaz a Google Maps link-térkép, mint a lábléc "minimal" nézetében — nincs cím
// rögzítve a locations táblában, ezért itt is ugyanerre a statikus térképre esünk vissza.
const LOCATION_MAPS_URL = {
  "Gyimes": "https://share.google/EnrnhRGT6LgrWxRVs",
  "Szentgyörgy": "https://share.google/1p5lZA2Erlnvk9XlF",
  "Csíkmadaras": "https://share.google/9pmy0iwklNkanY3EB",
};
function mapsHref(name) {
  return LOCATION_MAPS_URL[name] || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Telefonos ${name}`)}`;
}
const FRANCHISE_LOCATIONS = [{ name: "Csíkmadaras" }];

// Helyszínenként eltérő nyitvatartás (a locations táblában nincs ilyen mező) — a Kapcsolat
// panel kártyáin ez jelenik meg a generikus "H-P 9-18" felirat helyett.
const LOCATION_HOURS = {
  "Gyimes": {
    hu: ["H–P: 09:00–17:00", "Szo: 09:00–13:00"],
    ro: ["L–V: 09:00–17:00", "Sb: 09:00–13:00"],
  },
  "Szentgyörgy": {
    hu: ["H–P: 10:00–18:00"],
    ro: ["L–V: 10:00–18:00"],
  },
};

// "Kapcsolat" nézet (alsó tabsáv, csak minimal/nyomonkövetés oldalon) — WhatsApp-elsődleges
// kontaktlehetőség (a felhasználó kifejezett kérésére: "a hívást ennyire ne erőltessük,
// whatsappon kapja meg eleve a nagyobb %-ban az értesítést"), a hívás csak másodlagos link.
function ContactPanel({ s, lang, locations, onBack }) {
  return (
    <div style={{ width: "100%", maxWidth: 400, margin: "0 auto" }}>
      <button type="button" className="ticket-back-link" onClick={onBack} style={{ marginBottom: 18 }}>
        <ChevronLeftIcon width={12} height={12} /> {s.bottomNavStatus}
      </button>

      {locations.map((l) => {
        const hours = LOCATION_HOURS[l.name]?.[lang] || [s.contactHours];
        return (
          <a key={l.id} href={mapsHref(l.name)} target="_blank" rel="noopener noreferrer" className="ticket-extra-card" style={{ display: "flex", gap: 12, textDecoration: "none", color: "inherit" }}>
            <PinIcon width={18} height={18} style={{ color: "var(--primary-ink)", flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--pub-ink)", marginBottom: 2 }}>{l.name}</div>
              <div style={{ fontSize: 12, color: "var(--pub-ink-soft)", lineHeight: 1.5, marginBottom: 8 }}>
                {hours.map((line, i) => <div key={i}>{line}</div>)}
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--primary-ink)" }}>{l.phone || SUPPORT_PHONE}</span>
            </div>
          </a>
        );
      })}
      {FRANCHISE_LOCATIONS.map((l) => (
        <a key={l.name} href={mapsHref(l.name)} target="_blank" rel="noopener noreferrer" className="ticket-extra-card" style={{ display: "flex", gap: 12, textDecoration: "none", color: "inherit" }}>
          <PinIcon width={18} height={18} style={{ color: "#A5722A", flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--pub-ink)" }}>{l.name}</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: "#A5722A", background: "#F3E6D4", padding: "1px 6px", borderRadius: 999 }}>{s.contactFranchisePartner}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--pub-ink-soft)" }}>{s.contactFranchiseNote}</div>
          </div>
        </a>
      ))}

      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.3, textTransform: "uppercase", color: "var(--pub-ink-soft)", margin: "22px 0 10px" }}>{s.contactFaqTitle}</div>
      <div className="ticket-extra-card">
        <div style={{ paddingBottom: 14, borderBottom: "1px solid var(--pub-line)", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--pub-ink)", marginBottom: 4 }}>{s.contactFaqQ1}</div>
          <div style={{ fontSize: 12, color: "var(--pub-ink-soft)", lineHeight: 1.5 }}>{s.contactFaqA1}</div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--pub-ink)", marginBottom: 4 }}>{s.contactFaqQ2}</div>
          <div style={{ fontSize: 12, color: "var(--pub-ink-soft)", lineHeight: 1.5 }}>{s.contactFaqA2}</div>
        </div>
      </div>

      <a
        href={`https://wa.me/${SUPPORT_WHATSAPP}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "#1DB954", borderRadius: 14, padding: "14px 16px", marginTop: 22, boxShadow: "0 4px 12px rgba(29,185,84,.25)", textDecoration: "none" }}
      >
        <WhatsappIcon width={15} height={15} style={{ color: "#fff", flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{s.contactWhatsappBtn}</span>
      </a>
      <a href={`tel:${SUPPORT_PHONE}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--pub-ink-soft)", fontWeight: 600, fontSize: 12.5, padding: "10px 0", marginTop: 14, textDecoration: "none" }}>
        <CallIcon width={12} height={12} /> {s.contactCallAlt}
      </a>
    </div>
  );
}

// Egy funkció-ismertető sor a nyomonkövetés kezdőoldalán (kereső alatt) — miért érdemes
// itt keresni, mielőtt bármi eredmény van.
function FeatureRow({ icon: Icon, title, desc, last = false }) {
  return (
    <div className="ticket-extra-card" style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 14, marginBottom: last ? 0 : 10 }}>
      <span style={{ width: 36, height: 36, borderRadius: 0, background: "var(--primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon width={17} height={17} style={{ color: "var(--primary-ink)" }} />
      </span>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--pub-ink)", marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--pub-ink-soft)", lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

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
      <div style={{ width: 46, height: 46, borderRadius: 2, background: "var(--primary-soft)", border: "1px solid rgba(29,185,84,.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
    <div style={{ flex: 1, padding: "13px 14px", borderRadius: 0, background: "var(--pub-paper)", border: "1px solid var(--pub-line)" }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 5 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

// A jelenlegi lépéshez tartozó nagy cím + magyarázat a Munkafolyamat kártya tetején —
// nem lépésenkénti alsó felirat (azt korábban kifejezetten kivettük), hanem egyetlen,
// az aktuális állapotot elmagyarázó sor a kártya élén, ahogy a jóváhagyott makett mutatja.
function workflowHeadline(activeStep, handedOver, s) {
  if (handedOver) return s.workflowHeadlineDone;
  if (activeStep >= 2) return s.workflowHeadlineReady;
  if (activeStep === 1) return s.workflowHeadlineInProgress;
  return s.workflowHeadlineReported;
}

// Szegmentált folyamatsáv (nem függőleges pont+vonal idővonal) — 4 egyenlő szakasz,
// a jelenlegi szakaszon pulzáló "élő" jelzéssel, alatta a lépés-címkék egy sorban.
function StatusTimeline({ status, handedOver, s }) {
  const activeStep = handedOver ? 3 : (STEP_MAP[status] ?? 0);
  const steps = timelineSteps(s);
  const title = workflowHeadline(activeStep, handedOver, s);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 18 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: "var(--pub-ink)" }}>{title}</span>
        <span className="status-live-dot" style={{ width: 5, height: 5 }} />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {steps.map((step, i) => {
          const reached = i <= activeStep;
          const current = i === activeStep && !handedOver;
          return (
            <div key={step.label} style={{ flex: 1, height: 6, borderRadius: 999, background: reached ? "var(--primary)" : "#E5E7EB", position: "relative", overflow: "visible" }}>
              {current && <div className="status-step-pulse" style={{ position: "absolute", inset: 0, borderRadius: 999, background: "var(--primary)" }} />}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {steps.map((step, i) => {
          const reached = i <= activeStep;
          const current = i === activeStep && !handedOver;
          return (
            <span key={step.label} style={{ flex: 1, textAlign: "center", fontSize: 10.5, fontWeight: current ? 800 : 600, color: current ? "var(--pub-ink)" : reached ? "var(--pub-ink-soft)" : "#C1C6CC" }}>
              {step.label}
            </span>
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
  const [view, setView] = useState("status");
  const [locations, setLocations] = useState([]);

  const signMode = signStage === "service_intake" || signStage === "service_handover";

  useEffect(() => {
    if (!minimal) return;
    (async () => {
      const { data } = await supabase.rpc("get_public_locations");
      setLocations(data || []);
    })();
  }, [minimal]);

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
  const handedOver = result?.sub_status === "Átadva";
  const handoverAllowed = result?.status === "Átadásra" && result?.sub_status !== "Sikertelen";
  const warrantyFrom = result?.date_out || null;
  const ticketExpiry = handedOver ? warrantyExpiry(warrantyFrom, result?.warranty) : null;
  const ticketActive = handedOver ? isWarrantyActive(warrantyFrom, result?.warranty) : false;
  const purchaseExpiry = isPurchase ? warrantyExpiry(result.date, result.warranty) : null;
  const purchaseActive = isPurchase ? isWarrantyActive(result.date, result.warranty) : false;

  // Mobilon (iOS / eMag app mintára) az alsó tabsáv veszi át a fő navigáció szerepét —
  // egyelőre csak ezen a "csak nyomonkövetés" oldalon éles teszt jelleggel. A "Nyomon
  // követés" tab mindig a kezdőállapotba (üres kereső) visz vissza, ha épp van már
  // találat/lista — token/short_code alapú (privát linkes) nézetben nincs mit resetelni,
  // ott egyszerű "aktív" jelző marad.
  const canReset = !token && !shortCode && (result || matches || error);
  const bottomNavItems = minimal
    ? [
        {
          key: "contact",
          label: s.bottomNavContact,
          icon: WhatsappIcon,
          active: view === "contact",
          onClick: () => { setView("contact"); window.scrollTo({ top: 0, behavior: "smooth" }); },
        },
        {
          key: "status",
          label: s.bottomNavStatus,
          icon: ClockIcon,
          active: view === "status",
          onClick: () => {
            if (view !== "status") { setView("status"); return; }
            if (canReset) { setResult(null); setMatches(null); setPhone(""); setError(""); }
            window.scrollTo({ top: 0, behavior: "smooth" });
          },
        },
      ]
    : null;

  return (
    <div className={`pub-shop${minimal ? " pub-shop-tabbed" : ""}`}>
      <PublicHeader activeNav="status" minimal={minimal} lang={lang} langSwitchHref={otherLangHref} />
      <main className="pub-lookup-main">
      {view === "contact" ? (
        <ContactPanel s={s} lang={lang} locations={locations} onBack={() => setView("status")} />
      ) : isTicket ? (
        <div style={{ width: "100%", maxWidth: 400, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <button
            type="button"
            className="ticket-back-link"
            onClick={() => {
              if (matches) { setResult(null); return; }
              // Token/short-code linkről (SMS/WhatsApp) nem lehet csak state-tel visszaállni a
              // keresőűrlaphoz — a token prop az URL-ből jön, amíg az megvan, addig a form soha
              // nem jelenik meg (szándékosan, hogy privát linkről ne lehessen nyílt keresésre jutni).
              if (token || shortCode) { window.location.href = lang === "ro" ? "/status?lang=ro" : "/status"; return; }
              setResult(null); setMatches(null); setPhone(""); setError("");
            }}
          >
            <ChevronLeftIcon width={12} height={12} /> {matches ? s.backToResults : s.bottomNavStatus}
          </button>
          <div className="ticket-extra-card" style={{ width: "100%", marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span className="mono" style={{ fontSize: 10.5, fontWeight: 700, color: "#6B7280", background: "var(--pub-paper)", padding: "4px 9px", borderRadius: 999 }}>#{result.ticket_no}</span>
              <LiveBadge label={s.statusLiveBadge} />
              <span className={`st ${statusCls(result.status)}`}>{result.sub_status ? subStatusLabel(result.status, result.sub_status) : result.status}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: 0, background: "var(--pub-paper)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <PhoneCaseIcon width={22} height={22} style={{ color: "#9CA3AF" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--pub-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[result.brand, result.model].filter(Boolean).join(" ") || s.statusDeviceFallback}</div>
                <div style={{ fontSize: 12.5, color: "var(--pub-ink-soft)", marginTop: 1 }}>{result.customer_name}</div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--pub-line)", marginTop: 18, paddingTop: 18 }}>
              <StatusTimeline status={result.status} handedOver={handedOver} s={s} />
            </div>

            <div style={{ borderTop: "1px solid var(--pub-line)", marginTop: 18, paddingTop: 18 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <StatChip label={s.chipRepairCost}>
                  <span className="mono" style={{ fontSize: 15, fontWeight: 800, color: "var(--pub-ink)" }}>{money(result.price)}</span>
                </StatChip>
                <StatChip label={s.chipWarranty}>
                  {!handedOver ? (
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "#9CA3AF" }}>—</span>
                  ) : result.warranty ? (
                    <span className={`st ${ticketActive ? "st-kesz" : "st-kiadva"}`}>{ticketActive ? s.warrantyActive : s.warrantyExpired}</span>
                  ) : (
                    <span className="st st-sikertelen">{s.warrantyNone}</span>
                  )}
                </StatChip>
              </div>
              {handedOver && result.warranty && (
                <div className="ticket-row" style={{ marginTop: 6 }}>
                  <span className="ticket-row-label">{s.rowWarrantyExpiry}</span>
                  <span className="ticket-row-value muted">{ticketExpiry}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ width: "100%", marginTop: 16 }}>
            {token && result.ticket_kind === "Ügyfél" && !handedOver && !result.folia_upsell_requested && (
              <FoliaUpsellBanner token={token} deviceLabel={[result.brand, result.model].filter(Boolean).join(" ")} onDone={() => setResult({ ...result, folia: true, folia_upsell_requested: true, folia_upsell_price: 30, price: (Number(result.price) || 0) + 30 })} />
            )}
            {result.folia_upsell_requested && (
              <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "8px 12px", marginBottom: 24 }}>
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

            <button
              type="button"
              onClick={() => { setView("contact"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "#1DB954", border: "none", borderRadius: 14, padding: "14px 16px", marginBottom: 28, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(29,185,84,.25)" }}
            >
              <WhatsappIcon width={15} height={15} style={{ color: "#fff", flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{s.ticketWhatsappTip}</span>
            </button>

            <div style={{ marginBottom: 24 }}>
              <WarrantyTermsToggle title={s.warrantyTermsTitle} text={SERVICE_WARRANTY_TERMS} />
            </div>
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
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {matches && <button className="btn sec" style={{ flex: 1, justifyContent: "center" }} onClick={() => setResult(null)}>{s.backToResults}</button>}
                <button className="btn sec" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setResult(null); setMatches(null); setPhone(""); }}>{s.newSearch}</button>
              </div>
            )}
          </div>
        </div>
      ) : (!token && !shortCode && !result && !matches) ? (
        <div style={{ width: "100%", maxWidth: 400, margin: "0 auto" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--pub-ink)", marginBottom: 18 }}>{s.landingHeadline}</div>

          <div className="ticket-extra-card" style={{ width: "100%" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--pub-ink)", marginBottom: 6 }}>{s.searchCardTitle}</div>
            <div style={{ fontSize: 12.5, color: "var(--pub-ink-soft)", lineHeight: 1.5, marginBottom: 16 }}>{s.searchCardDesc}</div>
            {error && <div className="errbar" style={{ marginBottom: 12 }}>{error}</div>}
            <form onSubmit={submit}>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>{s.phoneLabel}</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={s.statusPhonePlaceholder} />
              </div>
              <button className="btn" style={{ width: "100%", justifyContent: "center" }} disabled={busy} type="submit">
                {busy ? s.statusSearching : s.statusViewBtn}
              </button>
            </form>
          </div>

          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--pub-ink)", margin: "26px 0 12px" }}>{s.featuresTitle}</div>
          <FeatureRow icon={ClockIcon} title={s.feature1Title} desc={s.feature1Desc} />
          <FeatureRow icon={WhatsappIcon} title={s.feature2Title} desc={s.feature2Desc} />
          <FeatureRow icon={CardIcon} title={s.feature3Title} desc={s.feature3Desc} last />
        </div>
      ) : (
      <div className="login-card" style={{ maxWidth: 460 }}>
        {!result && !matches && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <LiveBadge label={s.statusLiveBadge} />
          </div>
        )}
        {error && <div className="errbar">{error}</div>}
        {busy && !result && <div style={{ textAlign: "center", color: "#6B7280", fontSize: 13, padding: "10px 0" }}>{s.loading}</div>}
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
      <PublicFooter minimal={minimal} lang={lang} onContactClick={minimal ? () => { setView("contact"); window.scrollTo({ top: 0, behavior: "smooth" }); } : undefined} />
      {bottomNavItems && <PublicBottomNav items={bottomNavItems} />}
    </div>
  );
}
