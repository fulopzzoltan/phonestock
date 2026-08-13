import { useState, useMemo, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import { REPAIR_MODELS, PRICED_PROBLEMS, PROBLEM_LABELS } from "./lib/repairCatalog";
import { PROBLEM_TAGS } from "./lib/utils";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";

const OTHER_PROBLEMS = PROBLEM_TAGS.filter((t) => !PRICED_PROBLEMS.includes(t));
const STEP_ORDER = ["model", "problem", "result"];

export default function RepairEstimator() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [prices, setPrices] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [locations, setLocations] = useState([]);

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
        setLoadError(err.message || "Hiba történt a betöltés közben.");
      } finally {
        setLoading(false);
      }
    })();
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
    if (!leadName.trim() || !leadPhone.trim()) { setSubmitError("Add meg a neved és a telefonszámod."); return; }
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
      setSubmitError(err.message || "Hiba történt a beküldés közben.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="pub-shop">
        <PublicHeader activeNav="repair" />
        <div className="pub-empty">Betöltés...</div>
        <PublicFooter />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="pub-shop">
        <PublicHeader activeNav="repair" />
        <div className="pub-empty">{loadError}</div>
        <PublicFooter />
      </div>
    );
  }

  if (leadSent) {
    return (
      <div className="pub-shop">
        <PublicHeader activeNav="repair" />
        <main className="bb-main">
          <div className="bb-card bb-done">
            <div className="bb-done-icon">✓</div>
            <h1>Köszönjük, foglaltunk neked helyet!</h1>
            <div className="bb-done-promises">
              <div>📞 Hamarosan hívunk egyeztetni</div>
              <div>🏬 Vagy hozd be a készüléket bármelyik boltunkba</div>
            </div>
            <a href="/" className="pub-ask-btn" style={{ marginTop: 18 }}>Vissza a főoldalra</a>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const leadFormBlock = (
    <div className="bb-card" style={{ marginTop: 14 }}>
      <div className="bb-label">Foglald le a helyed</div>
      {submitError && <div className="errbar">{submitError}</div>}
      <div className="field"><label>Név</label><input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Kovács János" /></div>
      <div className="field"><label>Telefonszám</label><input value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} placeholder="07xx xxx xxx" /></div>
      {locations.length > 0 && (
        <div className="field"><label>Melyik bolt lenne jó? (opcionális)</label>
          <select value={leadLocationId} onChange={(e) => setLeadLocationId(e.target.value)}>
            <option value="">— mindegy —</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      )}
      <button type="button" className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={submitting} onClick={sendLead}>
        {submitting ? "Küldés..." : "Foglalás elküldése"}
      </button>
    </div>
  );

  return (
    <div className="pub-shop">
      <PublicHeader activeNav="repair" />
      <main className="bb-main">
        {step !== "custom" && (
          <div className="pub-steps">
            {STEP_ORDER.map((s, i) => (
              <div key={s} className={`pub-step${STEP_ORDER.indexOf(step) === i ? " active" : ""}`} />
            ))}
          </div>
        )}
        {step !== "model" && (
          <button type="button" className="pub-back-link" style={{ border: "none", background: "none", cursor: "pointer" }} onClick={goBack}>← Vissza</button>
        )}

        {step === "model" && (
          <div className="bb-card">
            <h1 className="bb-h1">Milyen telefonod van?</h1>
            <input className="bb-text-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Keresés — pl. iPhone 12, Galaxy A54..." />
            {matches.length > 0 && (
              <div className="bb-grid bb-grid-1col" style={{ marginTop: 12 }}>
                {matches.map((m) => (
                  <button key={`${m.brand}-${m.model}`} type="button" className="bb-option-card" onClick={() => pickModel(m)}>{m.brand} {m.model}</button>
                ))}
              </div>
            )}
            {query.trim() && matches.length === 0 && (
              <div className="field-hint" style={{ marginTop: 8 }}>Nincs találat ilyen modellre.</div>
            )}
            <button type="button" className="pub-back-link" style={{ border: "none", background: "none", cursor: "pointer", marginTop: 14, display: "block" }} onClick={() => setStep("custom")}>
              Nem találod a modelledet? Kérj egyedi árajánlatot →
            </button>
          </div>
        )}

        {step === "custom" && (
          <div className="bb-card">
            <h1 className="bb-h1">Kérj egyedi árajánlatot</h1>
            <div className="field-hint" style={{ marginBottom: 12 }}>A modelled nincs a listánkban, de szívesen adunk egyedi árat — írd le, miről van szó.</div>
            <div className="row2">
              <div className="field"><label>Márka</label><input value={customBrand} onChange={(e) => setCustomBrand(e.target.value)} placeholder="pl. Huawei" /></div>
              <div className="field"><label>Modell</label><input value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="pl. P30 Pro" /></div>
            </div>
            <div className="field"><label>Mi a probléma?</label><textarea rows={2} value={customNote} onChange={(e) => setCustomNote(e.target.value)} placeholder="pl. törött kijelző" /></div>
            {leadFormBlock}
          </div>
        )}

        {step === "problem" && selectedModel && (
          <div className="bb-card">
            <h1 className="bb-h1">Mi a probléma?</h1>
            <div className="field-hint" style={{ marginBottom: 14 }}>{selectedModel.brand} {selectedModel.model}</div>
            <div className="pub-problem-grid">
              {PRICED_PROBLEMS.map((tag) => {
                const has = availableProblems.includes(tag);
                return (
                  <button key={tag} type="button" className={`pub-problem-card${has ? "" : " disabled"}`} disabled={!has} onClick={() => has && pickProblem(tag)}>
                    {PROBLEM_LABELS[tag]}
                  </button>
                );
              })}
            </div>
            <div className="bb-label" style={{ marginTop: 18 }}>Más a probléma?</div>
            <div className="pub-problem-grid">
              {OTHER_PROBLEMS.map((tag) => (
                <button key={tag} type="button" className="pub-problem-card" onClick={() => pickProblem(tag)}>{PROBLEM_LABELS[tag]}</button>
              ))}
            </div>
          </div>
        )}

        {step === "result" && selectedModel && (
          <div className="bb-card">
            {selectedPriceRow ? (
              <>
                <h1 className="bb-h1">{PROBLEM_LABELS[problem]}</h1>
                {selectedPriceRow.price_after != null && (
                  <div className="pub-origin-toggle">
                    <button type="button" className={`pub-origin-btn${origin === "oem" ? " active" : ""}`} onClick={() => setOrigin("oem")}>Eredeti (OEM)</button>
                    <button type="button" className={`pub-origin-btn${origin === "after" ? " active" : ""}`} onClick={() => setOrigin("after")}>Utángyártott</button>
                  </div>
                )}
                <div className="bb-offer-price">{Math.round(Number(displayPrice)).toLocaleString("hu-HU")} Lei</div>
                {selectedPriceRow.warranty && <div className="pub-warranty-tag" style={{ marginBottom: 10 }}>{selectedPriceRow.warranty} garancia a javításra</div>}
                {stockAvailable === true && (
                  <div className="pub-stock-note available">✓ Ma bejöhetsz, kb. {selectedPriceRow.est_minutes || "~30"} perc alatt kész</div>
                )}
                {stockAvailable === false && (
                  <div className="pub-stock-note unavailable">⏳ Alkatrészt rendelni kell, kb. 2-3 munkanap</div>
                )}
                {!showLeadForm ? (
                  <button type="button" className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} onClick={() => setShowLeadForm(true)}>Foglald le a helyed</button>
                ) : leadFormBlock}
              </>
            ) : (
              <>
                <h1 className="bb-h1">{PROBLEM_LABELS[problem]}</h1>
                <div className="field-hint" style={{ marginBottom: 4 }}>Ehhez személyes felmérés szükséges — hozd be ingyenes felméréshez, vagy foglald le a helyed és hívunk.</div>
                {leadFormBlock}
              </>
            )}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
