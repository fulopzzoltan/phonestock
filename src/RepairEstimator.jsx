import { useState, useMemo, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "./lib/supabaseClient";
import { REPAIR_MODELS, PRICED_PROBLEMS, problemLabel } from "./lib/repairCatalog";
import { PROBLEM_TAGS } from "./lib/utils";
import { t } from "./lib/i18n";
import { findBuybackValue, isRepairUneconomical, recommendNearBudget } from "./lib/tradeEngine";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import PhoneMiniCard from "./components/PhoneMiniCard";
import { CallIcon, PinIcon, WarningIcon } from "./components/icons";
import { EmptyState, LoadingState } from "./components/EmptyState";
import { ReviewsBadge } from "./components/PublicReviews";

const SITE = "https://phonestock-manager.netlify.app";
const OTHER_PROBLEMS = PROBLEM_TAGS.filter((tag) => !PRICED_PROBLEMS.includes(tag));
const STEP_ORDER = ["model", "problem", "result"];

export default function RepairEstimator({ lang = "hu" }) {
  const s = t(lang);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [prices, setPrices] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [locations, setLocations] = useState([]);
  const [buybackModels, setBuybackModels] = useState([]);
  const [stockPhones, setStockPhones] = useState([]);

  const [step, setStep] = useState("model");
  const [query, setQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState(null); // { brand, model, family }
  const [problem, setProblem] = useState(null);
  const [origin, setOrigin] = useState("oem"); // 'oem' | 'after'
  const [showLeadForm, setShowLeadForm] = useState(false);

  const [customBrand, setCustomBrand] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [customNote, setCustomNote] = useState("");

  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadLocationId, setLeadLocationId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [leadSent, setLeadSent] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, a, l] = await Promise.all([
          supabase.rpc("get_repair_prices"),
          supabase.rpc("get_repair_availability"),
          supabase.rpc("get_public_locations"),
        ]);
        if (p.error) throw p.error;
        if (a.error) throw a.error;
        if (l.error) throw l.error;
        setPrices(p.data || []);
        setAvailability(a.data || []);
        setLocations(l.data || []);
      } catch (err) {
        setLoadError(err.message || s.genericError);
      } finally {
        setLoading(false);
      }
    })();
    // A kereszt-ajánlathoz kellő adatok külön, hibatűrő módon töltődnek — ha ez elakadna,
    // a szerviz-becslő fő funkciója (ár, foglalás) attól még hibátlanul működjön tovább.
    (async () => {
      const [bm, sp] = await Promise.all([
        supabase.rpc("get_buyback_models"),
        supabase.rpc("get_public_stock"),
      ]);
      if (!bm.error) setBuybackModels(bm.data || []);
      if (!sp.error) setStockPhones(sp.data || []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matches = query.trim()
    ? REPAIR_MODELS.filter((m) => `${m.brand} ${m.model}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

  const familyPriceRows = useMemo(
    () => (selectedModel ? prices.filter((p) => p.family_key === selectedModel.family && PRICED_PROBLEMS.includes(p.problem_tag)) : []),
    [prices, selectedModel]
  );
  const availableProblems = familyPriceRows.map((r) => r.problem_tag);

  const selectedPriceRow = problem ? familyPriceRows.find((r) => r.problem_tag === problem) : null;
  const displayPrice = selectedPriceRow
    ? (origin === "after" && selectedPriceRow.price_after ? selectedPriceRow.price_after : selectedPriceRow.price_oem)
    : null;
  const stockAvailable = selectedPriceRow?.part_category
    ? availability.some((a) => a.part_category === selectedPriceRow.part_category && a.available)
    : null;

  const buybackValue = selectedModel ? findBuybackValue(selectedModel.brand, selectedModel.model, buybackModels) : null;
  const repairUneconomical = isRepairUneconomical(displayPrice, buybackValue);
  const crossOfferPhones = useMemo(
    () => (repairUneconomical ? recommendNearBudget(stockPhones, buybackValue) : []),
    [repairUneconomical, buybackValue, stockPhones]
  );

  function pickModel(m) {
    setSelectedModel(m);
    setProblem(null);
    setStep("problem");
  }
  function pickProblem(tag) {
    setProblem(tag);
    setOrigin("oem");
    setShowLeadForm(false);
    setStep("result");
  }
  function goBack() {
    setSubmitError("");
    if (step === "problem") setStep("model");
    else if (step === "result") setStep("problem");
    else if (step === "custom") { setStep("model"); }
  }

  async function sendLead() {
    if (!leadName.trim() || !leadPhone.trim()) { setSubmitError(s.nameRequired); return; }
    setSubmitError("");
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("submit_repair_lead", {
        p_customer_name: leadName.trim(),
        p_customer_phone: leadPhone.trim(),
        p_brand: selectedModel ? selectedModel.brand : customBrand.trim(),
        p_model: selectedModel ? selectedModel.model : customModel.trim(),
        p_family_key: selectedModel?.family || null,
        p_problem_tag: problem || null,
        p_note: step === "custom" ? (customNote.trim() || null) : null,
        p_estimated_price: displayPrice,
        p_location_id: leadLocationId || null,
      });
      if (error) throw error;
      setLeadSent(true);
    } catch (err) {
      setSubmitError(err.message || s.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  const canonical = lang === "ro" ? `${SITE}/ro/estimare` : `${SITE}/becsles`;
  const title = lang === "ro" ? "Estimare rapidă preț service — Telefonos" : "Gyors szerviz árbecslő — Telefonos";
  const description = lang === "ro"
    ? "Preț instant pentru cele mai frecvente reparații (ecran, baterie, conector, cameră) — verifică și dacă piesa e pe stoc azi."
    : "Azonnali ár a leggyakoribb szerviz-javításokra (kijelző, akku, csatlakozó, kamera) — élő raktárkészlet-jelzéssel.";

  const seoHead = (
    <Helmet>
      <html lang={lang} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <link rel="alternate" hrefLang="hu" href={`${SITE}/becsles`} />
      <link rel="alternate" hrefLang="ro" href={`${SITE}/ro/estimare`} />
      <link rel="alternate" hrefLang="x-default" href={`${SITE}/becsles`} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
    </Helmet>
  );

  if (loading) {
    return (
      <div className="pub-shop">
        {seoHead}
        <PublicHeader activeNav="repair" lang={lang} />
        <LoadingState />
        <PublicFooter lang={lang} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="pub-shop">
        {seoHead}
        <PublicHeader activeNav="repair" lang={lang} />
        <EmptyState icon={WarningIcon}>{loadError}</EmptyState>
        <PublicFooter lang={lang} />
      </div>
    );
  }

  if (leadSent) {
    return (
      <div className="pub-shop">
        {seoHead}
        <PublicHeader activeNav="repair" lang={lang} />
        <main className="bb-main">
          <div className="bb-card bb-done">
            <div className="bb-done-icon">✓</div>
            <h1>{s.repairDoneTitle}</h1>
            <div className="bb-done-promises">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><CallIcon width={13} height={13} /> {s.repairDoneCall}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><PinIcon width={14} height={14} /> {s.repairDoneVisit}</div>
            </div>
            <a href={lang === "ro" ? "/ro/telefoane" : "/"} className="pub-ask-btn" style={{ marginTop: 18 }}>{s.backToHome}</a>
          </div>
        </main>
        <PublicFooter lang={lang} />
      </div>
    );
  }

  const leadFormBlock = (
    <div className="bb-card" style={{ marginTop: 14 }}>
      <div className="bb-label">{s.repairBookSlot}</div>
      {submitError && <div className="errbar">{submitError}</div>}
      <div className="field"><label>{s.nameLabel}</label><input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Kovács János" /></div>
      <div className="field"><label>{s.phoneLabel}</label><input value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} placeholder="07xx xxx xxx" /></div>
      {locations.length > 0 && (
        <div className="field"><label>{s.repairLocationOptional}</label>
          <select value={leadLocationId} onChange={(e) => setLeadLocationId(e.target.value)}>
            <option value="">{s.repairAnyLocation}</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      )}
      <button type="button" className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={submitting} onClick={sendLead}>
        {submitting ? s.sending : s.repairSendBooking}
      </button>
    </div>
  );

  return (
    <div className="pub-shop">
      {seoHead}
      <PublicHeader activeNav="repair" lang={lang} />
      <main className="bb-main">
        <ReviewsBadge lang={lang} style={{ marginBottom: 12 }} />
        {step !== "custom" && (
          <div className="pub-steps">
            {STEP_ORDER.map((st, i) => (
              <div key={st} className={`pub-step${STEP_ORDER.indexOf(step) === i ? " active" : ""}`} />
            ))}
          </div>
        )}
        {step !== "model" && (
          <button type="button" className="pub-back-link" style={{ border: "none", background: "none", cursor: "pointer" }} onClick={goBack}>{s.back}</button>
        )}

        {step === "model" && (
          <div className="bb-card">
            <h1 className="bb-h1">{s.repairWhatPhone}</h1>
            <input className="bb-text-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={s.repairSearchPlaceholder} />
            {matches.length > 0 && (
              <div className="bb-grid bb-grid-1col" style={{ marginTop: 12 }}>
                {matches.map((m) => (
                  <button key={`${m.brand}-${m.model}`} type="button" className="bb-option-card" onClick={() => pickModel(m)}>{m.brand} {m.model}</button>
                ))}
              </div>
            )}
            {query.trim() && matches.length === 0 && (
              <div className="field-hint" style={{ marginTop: 8 }}>{s.repairNoMatch}</div>
            )}
            <button type="button" className="pub-back-link" style={{ border: "none", background: "none", cursor: "pointer", marginTop: 14, display: "block" }} onClick={() => setStep("custom")}>
              {s.repairNotFoundCta}
            </button>
          </div>
        )}

        {step === "custom" && (
          <div className="bb-card">
            <h1 className="bb-h1">{s.repairCustomTitle}</h1>
            <div className="field-hint" style={{ marginBottom: 12 }}>{s.repairCustomHint}</div>
            <div className="row2">
              <div className="field"><label>{s.brandLabel}</label><input value={customBrand} onChange={(e) => setCustomBrand(e.target.value)} placeholder="pl. Huawei" /></div>
              <div className="field"><label>{s.modelLabel}</label><input value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="pl. P30 Pro" /></div>
            </div>
            <div className="field"><label>{s.repairProblemQ}</label><textarea rows={2} value={customNote} onChange={(e) => setCustomNote(e.target.value)} placeholder={s.repairProblemPlaceholder} /></div>
            {leadFormBlock}
          </div>
        )}

        {step === "problem" && selectedModel && (
          <div className="bb-card">
            <h1 className="bb-h1">{s.repairProblemQ}</h1>
            <div className="field-hint" style={{ marginBottom: 14 }}>{selectedModel.brand} {selectedModel.model}</div>
            <div className="pub-problem-grid">
              {PRICED_PROBLEMS.map((tag) => {
                const has = availableProblems.includes(tag);
                return (
                  <button key={tag} type="button" className={`pub-problem-card${has ? "" : " disabled"}`} disabled={!has} onClick={() => has && pickProblem(tag)}>
                    {problemLabel(tag, lang)}
                  </button>
                );
              })}
            </div>
            <div className="bb-label" style={{ marginTop: 18 }}>{s.repairOtherProblem}</div>
            <div className="pub-problem-grid">
              {OTHER_PROBLEMS.map((tag) => (
                <button key={tag} type="button" className="pub-problem-card" onClick={() => pickProblem(tag)}>{problemLabel(tag, lang)}</button>
              ))}
            </div>
          </div>
        )}

        {step === "result" && selectedModel && (
          <div className="bb-card">
            {selectedPriceRow ? (
              <>
                <h1 className="bb-h1">{problemLabel(problem, lang)}</h1>
                {selectedPriceRow.price_after != null && (
                  <div className="pub-origin-toggle">
                    <button type="button" className={`pub-origin-btn${origin === "oem" ? " active" : ""}`} onClick={() => setOrigin("oem")}>{s.repairOem}</button>
                    <button type="button" className={`pub-origin-btn${origin === "after" ? " active" : ""}`} onClick={() => setOrigin("after")}>{s.repairAfter}</button>
                  </div>
                )}
                <div className="bb-offer-price">{Math.round(Number(displayPrice)).toLocaleString("hu-HU")} Lei</div>
                {selectedPriceRow.warranty && <div className="pub-warranty-tag" style={{ marginBottom: 10 }}>{s.repairWarrantyFor(selectedPriceRow.warranty)}</div>}
                {stockAvailable === true && (
                  <div className="pub-stock-note available">{s.repairStockAvail(selectedPriceRow.est_minutes || "~30")}</div>
                )}
                {stockAvailable === false && (
                  <div className="pub-stock-note unavailable">{s.repairStockUnavail}</div>
                )}
                {crossOfferPhones.length > 0 && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--pub-line)" }}>
                    <div className="field-hint" style={{ fontWeight: 700, color: "var(--pub-ink)" }}>{s.crossOfferBuybackValue(Math.round(buybackValue))}</div>
                    <div className="bb-label" style={{ marginTop: 10 }}>{s.crossOfferSwapCta}</div>
                    <div className="pub-grid" style={{ marginTop: 10 }}>
                      {crossOfferPhones.map((p) => <PhoneMiniCard key={p.id} phone={p} lang={lang} />)}
                    </div>
                  </div>
                )}
                {!showLeadForm ? (
                  <button type="button" className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} onClick={() => setShowLeadForm(true)}>{s.repairBookSlot}</button>
                ) : leadFormBlock}
              </>
            ) : (
              <>
                <h1 className="bb-h1">{problemLabel(problem, lang)}</h1>
                <div className="field-hint" style={{ marginBottom: 4 }}>{s.repairNeedsAssessment}</div>
                {leadFormBlock}
              </>
            )}
          </div>
        )}
      </main>
      <PublicFooter lang={lang} />
    </div>
  );
}
