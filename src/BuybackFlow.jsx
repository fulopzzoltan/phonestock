import { useState, useEffect, useMemo } from "react";
import { supabase } from "./lib/supabaseClient";
import { calculateBuybackPrice } from "./lib/buybackPricing";
import { BUYBACK_CONDITION_QUESTIONS as CONDITION_QUESTIONS } from "./lib/utils";
import { recommendNearBudget } from "./lib/tradeEngine";
import { FAQ_CONTENT } from "./lib/faqContent";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import PhoneMiniCard from "./components/PhoneMiniCard";
import BuybackPriceBar from "./components/BuybackPriceBar";
import { ClockIcon, FinanceIcon, CallIcon, PinIcon, PartsIcon, WarningIcon, BuybackIcon, WarrantyIcon, ChevronDownIcon, PhoneCaseIcon, TransferIcon } from "./components/icons";
import { EmptyState, LoadingState } from "./components/EmptyState";
import { ReviewsBadge } from "./components/PublicReviews";

const EladasFAQ = FAQ_CONTENT.hu.find((c) => c.key === "eladas")?.questions || [];

const COLORS = ["Fekete", "Fehér", "Kék", "Zöld", "Ezüst", "Egyéb"];

const STEP_KEYS = ["brand", "model", "specs", ...CONDITION_QUESTIONS.map((q) => q.key), "imei", "offer", "contact"];

const PAYOUT_MULT = { keszpenz: 1, kredit: 1.1, bizomany: 1.15 };
const PAYOUT_OPTIONS = [
  { key: "keszpenz", label: "Készpénz", desc: "Azonnal, helyben, a mai ajánlat szerint." },
  { key: "kredit", label: "Kredit-egyenleg", desc: "+10% — azonnal jóváírva, nálunk elkölthető." },
  { key: "bizomany", label: "Bizomány", desc: "+15% — üzletben egyeztetett feltételekkel." },
];
const PAYOUT_LABELS = { keszpenz: "Készpénz", kredit: "Kredit-egyenleg (+10%)", bizomany: "Bizomány (+15%)" };

export default function BuybackFlow() {
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState([]);
  const [rules, setRules] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [stockPhones, setStockPhones] = useState([]);

  const [stepIndex, setStepIndex] = useState(0);
  const [brand, setBrand] = useState(null);
  const [modelName, setModelName] = useState(null);
  const [variant, setVariant] = useState(null); // matched buyback_models row (has exact base_price)
  const [color, setColor] = useState("");
  const [answers, setAnswers] = useState({});
  const [imei, setImei] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("Személyes átadás");
  const [payoutType, setPayoutType] = useState("keszpenz");
  const [locationId, setLocationId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(null); // { offer_no, price }
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [m, r, l] = await Promise.all([
          supabase.rpc("get_buyback_models"),
          supabase.rpc("get_buyback_deduction_rules"),
          supabase.rpc("get_public_locations"),
        ]);
        if (m.error) throw m.error;
        if (r.error) throw r.error;
        if (l.error) throw l.error;
        setModels(m.data || []);
        setRules(r.data || []);
        setLocations(l.data || []);
      } catch (err) {
        setLoadError(err.message || "Hiba történt a betöltés közben.");
      } finally {
        setLoading(false);
      }
    })();
    // A "vidd tovább" kereszt-ajánlathoz kellő készlet-adat külön, hibatűrő módon töltődik —
    // ha ez elakadna, a fő felvásárlási folyamat attól még hibátlanul működjön tovább.
    (async () => {
      const { data, error } = await supabase.rpc("get_public_stock");
      if (!error) setStockPhones(data || []);
    })();
  }, []);

  const brands = useMemo(() => [...new Set(models.map((m) => m.brand))].sort(), [models]);
  const modelGroups = useMemo(() => {
    const groups = {};
    models.filter((m) => m.brand === brand).forEach((m) => {
      (groups[m.model] ||= []).push(m);
    });
    return groups;
  }, [models, brand]);
  const variants = modelName ? (modelGroups[modelName] || []) : [];

  const pricing = useMemo(() => {
    if (!variant) return { price: 0, applied: [] };
    return calculateBuybackPrice(Number(variant.base_price), answers, rules);
  }, [variant, answers, rules]);

  const step = STEP_KEYS[stepIndex];
  const showPriceBar = variant && stepIndex >= STEP_KEYS.indexOf("specs") + 1 && step !== "offer";
  const totalSteps = STEP_KEYS.length;

  const tradeUpPhones = useMemo(
    () => (pricing.price > 0 ? recommendNearBudget(stockPhones, pricing.price) : []),
    [pricing.price, stockPhones]
  );

  // Népszerű modellek gyorslink-sávhoz — modellenként a legmagasabb (legjobb állapotú) árat mutatjuk,
  // "akár X Lej"-ként, ahogy a márka-választó kártyák is teszik.
  const popularModels = useMemo(() => {
    const groups = {};
    models.forEach((m) => {
      const key = `${m.brand}|${m.model}`;
      const price = Number(m.base_price);
      if (!groups[key] || price > groups[key].maxPrice) groups[key] = { brand: m.brand, model: m.model, maxPrice: price };
    });
    return Object.values(groups).sort((a, b) => b.maxPrice - a.maxPrice).slice(0, 6);
  }, [models]);

  function quickPick(group) {
    setBrand(group.brand);
    setModelName(group.model);
    const opts = models.filter((m) => m.brand === group.brand && m.model === group.model);
    setVariant(opts.length === 1 ? opts[0] : null);
    setStepIndex(STEP_KEYS.indexOf("specs"));
  }

  function goNext() { setStepIndex((i) => Math.min(i + 1, STEP_KEYS.length - 1)); }
  function goBack() { setStepIndex((i) => Math.max(i - 1, 0)); }

  function pickBrand(b) { setBrand(b); setModelName(null); setVariant(null); goNext(); }
  function pickModel(name) {
    setModelName(name);
    const opts = modelGroups[name] || [];
    if (opts.length === 1) setVariant(opts[0]);
    else setVariant(null);
    goNext();
  }
  function pickVariant(v) { setVariant(v); }
  function answerQuestion(key, value) {
    setAnswers((a) => ({ ...a, [key]: value }));
    goNext();
  }

  async function submit() {
    if (!customerName.trim() || !customerPhone.trim()) { setSubmitError("Add meg a neved és a telefonszámod."); return; }
    if (deliveryMethod === "Személyes átadás" && !locationId) { setSubmitError("Válaszd ki, melyik boltba hoznád be."); return; }
    setSubmitError("");
    setSubmitting(true);
    try {
      const payoutPrice = Math.round(pricing.price * (PAYOUT_MULT[payoutType] || 1));
      const { data, error } = await supabase.rpc("submit_buyback_offer", {
        p_customer_name: customerName.trim(),
        p_customer_phone: customerPhone.trim(),
        p_brand: brand,
        p_model: modelName,
        p_storage: variant?.storage || null,
        p_color: color || null,
        p_imei: imei.trim() || null,
        p_answers: answers,
        p_estimated_price: payoutPrice,
        p_delivery_method: deliveryMethod,
        p_location_id: deliveryMethod === "Személyes átadás" ? locationId : null,
        p_marketing_consent: marketingConsent,
        p_payout_type: payoutType,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      setDone({ price: payoutPrice, payoutType, shortCode: row?.short_code });
    } catch (err) {
      setSubmitError(err.message || "Hiba történt a beküldés közben.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="pub-shop">
        <PublicHeader activeNav="buyback" />
        <LoadingState />
        <PublicFooter />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="pub-shop">
        <PublicHeader activeNav="buyback" />
        <EmptyState icon={WarningIcon}>{loadError}</EmptyState>
        <PublicFooter />
      </div>
    );
  }

  if (done) {
    return (
      <div className="pub-shop">
        <PublicHeader activeNav="buyback" />
        <main className="bb-main">
          <div className="bb-card bb-done">
            <div className="bb-done-icon">✓</div>
            <h1>Szuper ajánlatot kaptál!</h1>
            {done.payoutType && done.payoutType !== "keszpenz" && (
              <div className="bb-label" style={{ marginBottom: 4 }}>{PAYOUT_LABELS[done.payoutType]}</div>
            )}
            <div className="bb-done-price">{done.price.toLocaleString("hu-HU")} Lei</div>
            <div className="bb-done-promises">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><ClockIcon width={14} height={14} /> Feldolgozás <b>1 munkanapon belül</b></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><FinanceIcon width={14} height={14} /> Fizetés <b>{
                done.payoutType === "kredit" ? "átvételkor, kredit-egyenlegként"
                : done.payoutType === "bizomany" ? "üzletben egyeztetve, bizományban"
                : deliveryMethod === "Személyes átadás" ? "azonnal, helyben" : "átvétel után"
              }</b></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><CallIcon width={13} height={13} /> Hamarosan hívunk, hogy egyeztessük a részleteket</div>
            </div>
            <a href="/" className="pub-ask-btn" style={{ marginTop: 18 }}>Vissza a főoldalra</a>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="pub-shop">
        <PublicHeader activeNav="buyback" />
        <EmptyState icon={BuybackIcon}>A felvásárlási szolgáltatás hamarosan elérhető lesz.<br /><a href="/" className="pub-ask-btn" style={{ marginTop: 12 }}>Vissza a készlethez</a></EmptyState>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="pub-shop">
      <PublicHeader activeNav="buyback" />
      <main className="bb-main">
        {step !== "brand" && <ReviewsBadge style={{ marginBottom: 12 }} />}

        {step === "brand" && (
          <div className="bb-hero-band">
            <h1 className="bb-hero-title">Add be a régi telefonod</h1>
            <p className="bb-hero-sub">2 perc alatt látod, mennyit ér — a pénzt még aznap a kezedben tarthatod.</p>
            <ReviewsBadge style={{ color: "var(--pub-accent-ink)", fontWeight: 700 }} />
          </div>
        )}

        {step === "brand" && (
          <div className="bb-trust-row">
            <div className="bb-trust-item"><ClockIcon width={15} height={15} />Azonnali fizetés, helyben</div>
            <div className="bb-trust-item"><WarrantyIcon width={15} height={15} />Törött telefont is beveszünk</div>
            <div className="bb-trust-item"><PinIcon width={15} height={15} />2 fizikai üzletünkben</div>
          </div>
        )}

        {step === "brand" && (
          <div className="bb-payout-teaser">
            <div className="bb-label">3 módon kérheted a kifizetést</div>
            <div className="bb-payout-teaser-row">
              {PAYOUT_OPTIONS.map((o) => (
                <div key={o.key} className="bb-payout-teaser-item">
                  <b>{o.label}</b>
                  <span>{o.key === "keszpenz" ? "a mai ajánlat" : o.key === "kredit" ? "+10%" : "+15%"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bb-progress">
          <div className="bb-progress-track"><div className="bb-progress-fill" style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }} /></div>
          <span className="bb-progress-label">{stepIndex + 1}/{totalSteps}</span>
        </div>
        {stepIndex > 0 && <button type="button" className="pub-back-link" style={{ border: "none", background: "none", cursor: "pointer" }} onClick={goBack}>← Vissza</button>}

        {step === "brand" && (
          <div className="bb-card">
            <h1 className="bb-h1">Milyen márkájú a telefonod?</h1>
            <div className="bb-grid">
              {brands.map((b) => (
                <button key={b} type="button" className="bb-option-card" onClick={() => pickBrand(b)}>{b}</button>
              ))}
            </div>
          </div>
        )}

        {step === "brand" && popularModels.length > 0 && (
          <div className="bb-popular">
            <div className="bb-label">Népszerű modellek</div>
            <div className="bb-popular-row">
              {popularModels.map((m) => (
                <button key={`${m.brand}|${m.model}`} type="button" className="bb-popular-chip" onClick={() => quickPick(m)}>
                  {m.model} <span>akár {Math.round(m.maxPrice).toLocaleString("hu-HU")} Lej</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "brand" && (
          <div className="bb-steps">
            <div className="bb-label">Hogyan működik</div>
            <div className="bb-step-cards">
              <div className="bb-step-card">
                <span className="bb-step-ic"><PhoneCaseIcon width={18} height={18} /></span>
                <div><b>Válaszd ki a modelledet</b><p>2 perc alatt látod az ajánlatot.</p></div>
              </div>
              <div className="bb-step-card">
                <span className="bb-step-ic"><PinIcon width={18} height={18} /></span>
                <div><b>Hozd be bármelyik üzletünkbe</b><p>Gyimesbe vagy Szentgyörgyre.</p></div>
              </div>
              <div className="bb-step-card">
                <span className="bb-step-ic"><TransferIcon width={18} height={18} /></span>
                <div><b>Válassz kifizetést</b><p>Készpénz, kredit vagy bizomány — és viheted is.</p></div>
              </div>
            </div>
          </div>
        )}

        {step === "brand" && EladasFAQ.length > 0 && (
          <div className="bb-faq">
            <div className="bb-label">Gyakori kérdések</div>
            <div className="pub-faq-list">
              {EladasFAQ.map((qa, i) => {
                const open = openFaq === i;
                return (
                  <div key={i} className="pub-faq-item">
                    <button type="button" className="pub-faq-q" onClick={() => setOpenFaq(open ? null : i)}>
                      <span>{qa.q}</span>
                      <ChevronDownIcon style={{ transform: open ? "none" : "rotate(-90deg)", transition: "transform .15s", flexShrink: 0 }} />
                    </button>
                    {open && <div className="pub-faq-a">{qa.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === "model" && (
          <div className="bb-card">
            <h1 className="bb-h1">Melyik modell?</h1>
            <div className="bb-grid">
              {Object.keys(modelGroups).sort().map((name) => {
                const max = Math.max(...modelGroups[name].map((v) => Number(v.base_price)));
                return (
                  <button key={name} type="button" className="bb-option-card bb-model-card" onClick={() => pickModel(name)}>
                    <div>{name}</div>
                    <div className="bb-model-anchor">Akár {Math.round(max).toLocaleString("hu-HU")} Lei</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === "specs" && (
          <div className="bb-card">
            <h1 className="bb-h1">Tárhely és szín</h1>
            {variants.length > 1 && (
              <>
                <div className="bb-label">Tárhely</div>
                <div className="bb-grid">
                  {variants.map((v) => (
                    <button key={v.id} type="button" className={`bb-option-card${variant?.id === v.id ? " active" : ""}`} onClick={() => pickVariant(v)}>
                      {v.storage || "Standard"} — {Math.round(Number(v.base_price)).toLocaleString("hu-HU")} Lei
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="bb-label" style={{ marginTop: 16 }}>Szín</div>
            <div className="bb-grid">
              {COLORS.map((c) => (
                <button key={c} type="button" className={`bb-option-card${color === c ? " active" : ""}`} onClick={() => setColor(c)}>{c}</button>
              ))}
            </div>
            <button type="button" className="btn" style={{ marginTop: 20 }} disabled={!variant || !color} onClick={goNext}>Tovább</button>
          </div>
        )}

        {CONDITION_QUESTIONS.some((q) => q.key === step) && (() => {
          const q = CONDITION_QUESTIONS.find((x) => x.key === step);
          return (
            <div className="bb-card">
              <h1 className="bb-h1">{q.question}</h1>
              <div className="bb-grid bb-grid-1col">
                {q.options.map((o) => (
                  <button key={o.key} type="button" className={`bb-option-card${answers[q.key] === o.key ? " active" : ""}`} onClick={() => answerQuestion(q.key, o.key)}>{o.label}</button>
                ))}
              </div>
            </div>
          );
        })()}

        {step === "imei" && (
          <div className="bb-card">
            <h1 className="bb-h1">IMEI (opcionális)</h1>
            <div className="bb-label" style={{ marginBottom: 10 }}>Ha nem tudod leolvasni, nyugodtan hagyd ki.</div>
            <input className="bb-text-input" value={imei} onChange={(e) => setImei(e.target.value)} placeholder="35xxxxxxxxxxxxx" />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button type="button" className="btn sec" onClick={goNext}>Kihagyom</button>
              <button type="button" className="btn" onClick={goNext}>Tovább</button>
            </div>
          </div>
        )}

        {step === "offer" && (
          <div className="bb-card">
            <h1 className="bb-h1">Ajánlatunk erre a készülékre</h1>
            <div className="bb-label" style={{ marginBottom: 10 }}>Válaszd ki, hogyan kérnéd a kifizetést:</div>
            <div className="bb-payout-row">
              {PAYOUT_OPTIONS.map((o) => (
                <button key={o.key} type="button" className={`bb-payout-card${payoutType === o.key ? " active" : ""}`} onClick={() => setPayoutType(o.key)}>
                  <div className="bb-payout-label">{o.label}</div>
                  <div className="bb-payout-price">{Math.round(pricing.price * (PAYOUT_MULT[o.key] || 1)).toLocaleString("hu-HU")} Lei</div>
                  <div className="bb-payout-desc">{o.desc}</div>
                </button>
              ))}
            </div>
            <div className="bb-done-promises" style={{ marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><ClockIcon width={14} height={14} /> Feldolgozás <b>1 munkanapon belül</b></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><FinanceIcon width={14} height={14} /> Fizetés <b>{
                payoutType === "kredit" ? "átvételkor, kredit-egyenlegként"
                : payoutType === "bizomany" ? "üzletben egyeztetve, bizományban"
                : "átvételkor"
              }</b></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><CallIcon width={13} height={13} /> Utána hívunk egyeztetni</div>
            </div>
            {tradeUpPhones.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--pub-line)" }}>
                <div className="bb-label">Vidd tovább — fizess rá egy kicsit, és már viheted is:</div>
                <div className="pub-grid" style={{ marginTop: 10 }}>
                  {tradeUpPhones.map((p) => (
                    <div key={p.id}>
                      <PhoneMiniCard phone={p} />
                      <div className="field-hint" style={{ marginTop: 6, textAlign: "center" }}>
                        +{Math.max(0, Math.round(Number(p.sale_price) - pricing.price)).toLocaleString("hu-HU")} Lej ráfizetéssel
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="bb-label" style={{ marginTop: 18 }}>Hogyan add le a készüléket?</div>
            <div className="bb-delivery-row">
              <button type="button" className={`bb-delivery-card featured${deliveryMethod === "Személyes átadás" ? " active" : ""}`} onClick={() => setDeliveryMethod("Személyes átadás")}>
                <div className="bb-delivery-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><PinIcon width={14} height={14} /> Személyes átadás</div>
                <div className="bb-delivery-desc">Hozd be Gyimesbe vagy Szentgyörgyre, és <b>azonnal</b> viheted a pénzt.</div>
              </button>
              <button type="button" className={`bb-delivery-card${deliveryMethod === "Postai" ? " active" : ""}`} onClick={() => setDeliveryMethod("Postai")}>
                <div className="bb-delivery-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><PartsIcon width={14} height={14} /> Postai küldés</div>
                <div className="bb-delivery-desc">Egyeztetünk telefonon a részletekről.</div>
              </button>
            </div>
            <button type="button" className="btn" style={{ marginTop: 20 }} onClick={goNext}>Tovább</button>
          </div>
        )}

        {step === "contact" && (
          <div className="bb-card">
            <h1 className="bb-h1">Elérhetőséged</h1>
            {submitError && <div className="errbar">{submitError}</div>}
            <div className="field"><label>Név</label><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Kovács János" /></div>
            <div className="field"><label>Telefonszám</label><input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="07xx xxx xxx" /></div>
            {deliveryMethod === "Személyes átadás" && (
              <div className="field"><label>Melyik boltba hoznád be?</label>
                <div className="bb-grid">
                  {locations.map((l) => (
                    <button key={l.id} type="button" className={`bb-option-card${locationId === l.id ? " active" : ""}`} onClick={() => setLocationId(l.id)}>{l.name}</button>
                  ))}
                </div>
              </div>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", fontWeight: 500, marginTop: 10, cursor: "pointer" }}>
              <input type="checkbox" className="chk" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)} />
              Hozzájárulok, hogy akciókról/ajánlatokról SMS-ben értesítsetek
            </label>
            <button type="button" className="btn" style={{ marginTop: 18, width: "100%", justifyContent: "center" }} disabled={submitting} onClick={submit}>
              {submitting ? "Küldés..." : "Ajánlat elküldése"}
            </button>
          </div>
        )}

        {showPriceBar && <BuybackPriceBar basePrice={Number(variant.base_price)} price={pricing.price} applied={pricing.applied} />}
      </main>
      <PublicFooter />
    </div>
  );
}
