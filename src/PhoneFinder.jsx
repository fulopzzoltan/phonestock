import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "./lib/supabaseClient";
import { t } from "./lib/i18n";
import { normalizeStorage, normalizeBrand } from "./lib/utils";
import { recommendPhones } from "./lib/tradeEngine";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import PhoneMiniCard from "./components/PhoneMiniCard";
import { WarningIcon } from "./components/icons";
import { EmptyState, LoadingState } from "./components/EmptyState";

const SITE = "https://phonestock-manager.netlify.app";
const STEP_ORDER = ["condition", "budget", "storage", "brand", "result"];

export default function PhoneFinder({ lang = "hu" }) {
  const s = t(lang);
  const [phones, setPhones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState("condition");
  const [answers, setAnswers] = useState({ condition: "any", budget: "any", storage: "any", brands: [] });

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
    return [...new Set(phones.map((p) => p.brand))]
      .sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b))
      .slice(0, 5);
  }, [phones]);

  const results = useMemo(() => {
    if (step !== "result" || phones.length === 0) return [];
    return recommendPhones(phones, answers, 3);
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
              <button type="button" className={`bb-option-card${answers.condition === "Refurbished" ? " active" : ""}`} onClick={() => pickCondition("Refurbished")}>{s.conditionRefurb}</button>
              <button type="button" className={`bb-option-card${answers.condition === "any" ? " active" : ""}`} onClick={() => pickCondition("any")}>{s.finderAny}</button>
              <button type="button" className={`bb-option-card${answers.condition === "New" ? " active" : ""}`} onClick={() => pickCondition("New")}>{s.conditionNew}</button>
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
              {results.map((p) => <PhoneMiniCard key={p.id} phone={p} lang={lang} />)}
            </div>
            <button type="button" className="pub-back-link" style={{ border: "none", background: "none", cursor: "pointer", marginTop: 20, display: "block" }} onClick={retry}>{s.finderRetryCta}</button>
          </div>
        )}
      </main>
      <PublicFooter lang={lang} />
    </div>
  );
}
