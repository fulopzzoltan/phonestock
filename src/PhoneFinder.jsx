import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "./lib/supabaseClient";
import { photoUrl } from "./lib/imageResize";
import { t, translateColor, translateWarranty } from "./lib/i18n";
import { normalizeStorage, normalizeBrand } from "./lib/utils";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import { CartIcon, WarningIcon } from "./components/icons";
import { EmptyState, LoadingState } from "./components/EmptyState";
import { addToCart, useCart } from "./lib/cart";

const SITE = "https://phonestock-manager.netlify.app";
const STEP_ORDER = ["condition", "budget", "storage", "brand", "result"];
const BUDGET_RANGES = { under1000: [0, 1000], mid: [1000, 2000], over2000: [2000, Infinity] };

const deviceSvg = (
  <svg viewBox="0 0 40 64" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="2" y="2" width="36" height="60" rx="7" />
    <line x1="15" y1="56" x2="25" y2="56" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

function distanceFromBudget(price, key) {
  const [lo, hi] = BUDGET_RANGES[key];
  if (price < lo) return lo - price;
  if (price > hi) return price - hi;
  return 0;
}

// Fokozatosan lazító pontozás, sose kemény szűrés — így garantáltan van 1-3 találat,
// amíg van készleten telefon, még ha egyik válasz sem passzol tökéletesen.
function scorePhone(phone, answers) {
  let score = 100;
  if (answers.condition !== "any" && phone.condition !== answers.condition) score -= 40;
  if (answers.budget !== "any") {
    const dist = distanceFromBudget(Number(phone.sale_price) || 0, answers.budget);
    score -= Math.min(50, dist / 20);
  }
  if (answers.storage !== "any" && normalizeStorage(phone.storage) !== answers.storage) score -= 15;
  if (answers.brands.length > 0 && !answers.brands.includes(phone.brand)) score -= 20;
  return score;
}

export default function PhoneFinder({ lang = "hu" }) {
  const s = t(lang);
  const [phones, setPhones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState("condition");
  const [answers, setAnswers] = useState({ condition: "any", budget: "any", storage: "any", brands: [] });
  const cart = useCart();

  useEffect(() => {
    (async () => {
      try {
        const { data, error: err } = await supabase.rpc("get_public_stock");
        if (err) throw err;
        setPhones((data || []).map((p) => ({ ...p, brand: normalizeBrand(p.brand) })));
      } catch (err) {
        setLoadError(err.message || s.genericError);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const storages = useMemo(() => [...new Set(phones.map((p) => normalizeStorage(p.storage)).filter(Boolean))]
    .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0)), [phones]);

  const brands = useMemo(() => {
    const counts = {};
    phones.forEach((p) => { counts[p.brand] = (counts[p.brand] || 0) + 1; });
    return [...new Set(phones.map((p) => p.brand))].sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b));
  }, [phones]);

  const results = useMemo(() => {
    if (step !== "result" || phones.length === 0) return [];
    return [...phones]
      .map((p) => ({ ...p, _score: scorePhone(p, answers) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 3);
  }, [step, phones, answers]);

  const isExactMatch = results.length > 0 && results[0]._score === 100;

  const stepIndex = STEP_ORDER.indexOf(step);

  function goBack() {
    if (stepIndex > 0) setStep(STEP_ORDER[stepIndex - 1]);
  }
  function pickCondition(key) { setAnswers((a) => ({ ...a, condition: key })); setStep("budget"); }
  function pickBudget(key) { setAnswers((a) => ({ ...a, budget: key })); setStep("storage"); }
  function pickStorage(key) { setAnswers((a) => ({ ...a, storage: key })); setStep("brand"); }
  function toggleBrand(b) {
    setAnswers((a) => ({ ...a, brands: a.brands.includes(b) ? a.brands.filter((x) => x !== b) : [...a.brands, b] }));
  }
  function retry() {
    setAnswers({ condition: "any", budget: "any", storage: "any", brands: [] });
    setStep("condition");
  }

  const traitLabels = [];
  if (answers.condition !== "any") traitLabels.push(answers.condition === "New" ? s.conditionNew : s.conditionRefurb);
  if (answers.budget === "under1000") traitLabels.push(s.finderBudgetUnder(1000));
  else if (answers.budget === "mid") traitLabels.push(s.finderBudgetRange(1000, 2000));
  else if (answers.budget === "over2000") traitLabels.push(s.finderBudgetOver(2000));
  if (answers.storage !== "any") traitLabels.push(answers.storage);
  if (answers.brands.length > 0) traitLabels.push(answers.brands.join(", "));

  const canonical = lang === "ro" ? `${SITE}/ro/asistent` : `${SITE}/segito`;
  const seoHead = (
    <Helmet>
      <html lang={lang} />
      <title>{s.finderPageTitle}</title>
      <meta name="description" content={s.finderPageDesc} />
      <link rel="canonical" href={canonical} />
      <link rel="alternate" hrefLang="hu" href={`${SITE}/segito`} />
      <link rel="alternate" hrefLang="ro" href={`${SITE}/ro/asistent`} />
      <link rel="alternate" hrefLang="x-default" href={`${SITE}/segito`} />
      <meta property="og:title" content={s.finderPageTitle} />
      <meta property="og:description" content={s.finderPageDesc} />
      <meta property="og:type" content="website" />
    </Helmet>
  );

  if (loading) {
    return (
      <div className="pub-shop">
        {seoHead}
        <PublicHeader activeNav="finder" lang={lang} />
        <LoadingState />
        <PublicFooter lang={lang} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="pub-shop">
        {seoHead}
        <PublicHeader activeNav="finder" lang={lang} />
        <EmptyState icon={WarningIcon}>{loadError}</EmptyState>
        <PublicFooter lang={lang} />
      </div>
    );
  }

  if (phones.length === 0) {
    return (
      <div className="pub-shop">
        {seoHead}
        <PublicHeader activeNav="finder" lang={lang} />
        <EmptyState icon={WarningIcon}>
          {s.finderNoStock}
          <br />
          <a href={lang === "ro" ? "/ro/telefoane" : "/"} className="pub-ask-btn" style={{ marginTop: 12 }}>{s.backToStock}</a>
        </EmptyState>
        <PublicFooter lang={lang} />
      </div>
    );
  }

  return (
    <div className="pub-shop">
      {seoHead}
      <PublicHeader activeNav="finder" lang={lang} />
      <main className="bb-main">
        {step !== "result" && (
          <div className="pub-steps">
            {STEP_ORDER.slice(0, 4).map((st, i) => (
              <div key={st} className={`pub-step${stepIndex === i ? " active" : ""}`} />
            ))}
          </div>
        )}
        {stepIndex > 0 && step !== "result" && (
          <button type="button" className="pub-back-link" style={{ border: "none", background: "none", cursor: "pointer" }} onClick={goBack}>{s.back}</button>
        )}

        {step === "condition" && (
          <div className="bb-card">
            <h1 className="bb-h1">{s.finderConditionQ}</h1>
            <div className="bb-grid bb-grid-1col">
              <button type="button" className={`bb-option-card${answers.condition === "any" ? " active" : ""}`} onClick={() => pickCondition("any")}>{s.finderAny}</button>
              <button type="button" className={`bb-option-card${answers.condition === "New" ? " active" : ""}`} onClick={() => pickCondition("New")}>{s.conditionNew}</button>
              <button type="button" className={`bb-option-card${answers.condition === "Refurbished" ? " active" : ""}`} onClick={() => pickCondition("Refurbished")}>{s.conditionRefurb}</button>
            </div>
          </div>
        )}

        {step === "budget" && (
          <div className="bb-card">
            <h1 className="bb-h1">{s.finderBudgetQ}</h1>
            <div className="bb-grid bb-grid-1col">
              <button type="button" className={`bb-option-card${answers.budget === "under1000" ? " active" : ""}`} onClick={() => pickBudget("under1000")}>{s.finderBudgetUnder(1000)}</button>
              <button type="button" className={`bb-option-card${answers.budget === "mid" ? " active" : ""}`} onClick={() => pickBudget("mid")}>{s.finderBudgetRange(1000, 2000)}</button>
              <button type="button" className={`bb-option-card${answers.budget === "over2000" ? " active" : ""}`} onClick={() => pickBudget("over2000")}>{s.finderBudgetOver(2000)}</button>
              <button type="button" className={`bb-option-card${answers.budget === "any" ? " active" : ""}`} onClick={() => pickBudget("any")}>{s.finderAny}</button>
            </div>
          </div>
        )}

        {step === "storage" && (
          <div className="bb-card">
            <h1 className="bb-h1">{s.finderStorageQ}</h1>
            <div className="bb-grid">
              {storages.map((st) => (
                <button key={st} type="button" className={`bb-option-card${answers.storage === st ? " active" : ""}`} onClick={() => pickStorage(st)}>{st}</button>
              ))}
              <button type="button" className={`bb-option-card${answers.storage === "any" ? " active" : ""}`} onClick={() => pickStorage("any")}>{s.finderAny}</button>
            </div>
          </div>
        )}

        {step === "brand" && (
          <div className="bb-card">
            <h1 className="bb-h1">{s.finderBrandQ}</h1>
            <div className="field-hint" style={{ marginBottom: 12 }}>{s.finderBrandHint}</div>
            <div className="bb-grid">
              {brands.map((b) => (
                <button key={b} type="button" className={`bb-option-card${answers.brands.includes(b) ? " active" : ""}`} onClick={() => toggleBrand(b)}>{b}</button>
              ))}
            </div>
            <button type="button" className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 20 }} onClick={() => setStep("result")}>{s.finderShowResults}</button>
          </div>
        )}

        {step === "result" && (
          <div>
            <h1 className="bb-h1" style={{ marginBottom: 4 }}>{isExactMatch ? s.finderResultTitle(results.length) : s.finderResultFallback}</h1>
            {traitLabels.length > 0 && <div className="field-hint" style={{ marginBottom: 16 }}>{traitLabels.join(" · ")}</div>}
            <div className="pub-grid">
              {results.map((p) => {
                const href = lang === "ro" ? `/ro/telefon/${p.id}` : `/telefon/${p.id}`;
                return (
                  <div key={p.id} className="pub-card" role="link" tabIndex={0}
                    onClick={() => { window.location.href = href; }}
                    onKeyDown={(e) => { if (e.key === "Enter") window.location.href = href; }}
                  >
                    <div className="pub-card-top">
                      <span className={`pub-cond-pill ${p.condition === "New" ? "new" : "refurb"}`}>{p.condition === "New" ? s.conditionNew : s.conditionRefurb}</span>
                    </div>
                    <div className="pub-device-art">
                      {p.photo_paths && p.photo_paths.length > 0 ? (
                        <img
                          src={photoUrl(p.photo_paths[0], "thumb")}
                          alt={`${p.brand} ${p.model}`}
                          className="pub-device-photo"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = photoUrl(p.photo_paths[0], "full"); }}
                        />
                      ) : deviceSvg}
                    </div>
                    <div className="pub-card-name">{p.brand} {p.model}</div>
                    <div className="pub-card-specs">
                      {p.storage && <span>{normalizeStorage(p.storage)}</span>}
                      {p.color && <span>{translateColor(p.color, lang)}</span>}
                    </div>
                    {p.warranty && (
                      <div className="pub-warranty-tag">
                        <svg viewBox="0 0 24 24" style={{ width: 11, height: 11, stroke: "var(--pub-ink-soft)", fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}><path d="M12 3l7 2.5v5.8c0 4.2-2.9 7.6-7 8.7-4.1-1.1-7-4.5-7-8.7V5.5L12 3z" /></svg>
                        {s.warrantyTag(translateWarranty(p.warranty, lang))}
                      </div>
                    )}
                    <div className="pub-card-foot">
                      <div className="pub-price mono">{Number(p.sale_price).toLocaleString("hu-HU")}<span className="pub-cur">Lei</span></div>
                      {cart.some((c) => c.id === p.id) ? (
                        <a className="pub-ask-btn pub-ask-btn-added" href="/kosar" aria-label="Kosárban" onClick={(e) => e.stopPropagation()}><CartIcon width={13} height={13} /><span className="pub-ask-btn-label">Kosárban</span></a>
                      ) : (
                        <button type="button" className="pub-ask-btn" aria-label="Kosárba" onClick={(e) => {
                          e.stopPropagation();
                          addToCart({ id: p.id, brand: p.brand, model: p.model, storage: normalizeStorage(p.storage), color: p.color, salePrice: p.sale_price, photoPath: p.photo_paths?.[0] || null, locationId: p.location_id, locationName: p.location_name });
                        }}><CartIcon width={13} height={13} /><span className="pub-ask-btn-label">Kosárba</span></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button type="button" className="pub-back-link" style={{ border: "none", background: "none", cursor: "pointer", marginTop: 20, display: "block" }} onClick={retry}>{s.finderRetryCta}</button>
          </div>
        )}
      </main>
      <PublicFooter lang={lang} />
    </div>
  );
}
