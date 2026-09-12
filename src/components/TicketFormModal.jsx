import { useLayoutEffect, useRef, useState } from "react";
import { CloseIcon, WarrantyIcon, DropletIcon, PartsIcon, PhoneCaseIcon } from "./icons";
import { PROBLEM_TAGS, WARRANTIES, STATUSES, SUB_STATUSES, statusLabel, normalizeImei, money, ticketCode } from "../lib/utils";
import CustomerAutocomplete from "./CustomerAutocomplete";
import { ChipField, DropdownField } from "./FormPickers";
import BrandField from "./BrandField";
import PatternLockPad from "./PatternLockPad";

function parseIssue(issue) {
  const parts = (issue || "").split(",").map((p) => p.trim()).filter(Boolean);
  const tags = parts.filter((p) => PROBLEM_TAGS.includes(p));
  const extra = parts.filter((p) => !PROBLEM_TAGS.includes(p)).join(", ");
  return { tags, extra };
}

// A leggyakoribb 5 probléma elöl látszik; a többi az "Egyéb" gombra kattintva nyílik ki.
const TOP_PROBLEM_TAGS = PROBLEM_TAGS.filter((t) => t !== "Egyéb").slice(0, 5);
const REST_PROBLEM_TAGS = PROBLEM_TAGS.filter((t) => t !== "Egyéb" && !TOP_PROBLEM_TAGS.includes(t));

function SegField({ label, value, onChange, options }) {
  const ref = useRef(null);
  const [thumb, setThumb] = useState(null);
  useLayoutEffect(() => {
    const active = ref.current?.querySelector("button.active");
    if (active) setThumb({ left: active.offsetLeft, width: active.offsetWidth });
  }, [value, options]);
  return (
    <div className="field">
      {label && <label>{label}</label>}
      <div className="loc-seg" ref={ref}>
        {thumb && <div className="loc-seg-thumb" style={{ left: thumb.left, width: thumb.width }} />}
        {options.map((o) => (
          <button key={o.key} type="button" className={value === o.key ? "active" : ""} onClick={() => onChange(o.key)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

function SectionHead({ title }) {
  return <div className="wf-sectitle">{title}</div>;
}

export default function TicketFormModal({ ticket, prefill, locations, users = [], customers = [], stock = [], tickets = [], defaultLocId, onClose, onSave, busy }) {
  const isEdit = !!ticket;
  const parsed = parseIssue(ticket?.issue);
  const [productQuery, setProductQuery] = useState("");
  const [f, setF] = useState({
    ticketKind: ticket?.ticketKind || "Ügyfél",
    productId: ticket?.productId || null,
    customerName: ticket?.customerName || prefill?.customerName || "",
    customerPhone: ticket?.customerPhone || prefill?.customerPhone || "",
    customerId: ticket?.customerId || null,
    brand: ticket?.brand || prefill?.brand || "",
    model: ticket?.model || prefill?.model || "",
    imei: ticket?.imei || "",
    price: ticket?.price ?? prefill?.price ?? "",
    matCost: ticket?.matCost ?? "",
    // Új munkalapnál (nem garanciális ügy esetén — az alapból nincs bepipálva) alapértelmezetten
    // 1 hónap garanciát adunk a javításra, hogy ne maradjon üresen — a kolléga felülírhatja, ha
    // az adott javításnál más időtartam indokolt.
    warranty: ticket?.warranty || (isEdit ? "" : "1 hó"),
    handoverDate: ticket?.handoverDate || "",
    dueDate: ticket?.dueDate || "",
    folia: ticket?.folia || false,
    status: ticket?.status || "Átvett",
    subStatus: ticket?.subStatus ?? null,
    isWarranty: !!ticket?.isWarranty,
    warrantyKind: ticket?.warrantyKind || "szerviz",
    waterDamage: !!ticket?.waterDamage,
    unlockType: ticket?.unlockType || "",
    unlockCode: ticket?.unlockCode || "",
    assignedTo: ticket?.assignedTo || "",
    consentGiven: !!ticket?.consentAt,
    marketingConsent: false,
    extra: parsed.extra || prefill?.extra || "",
    ticketNo: ticket?.ticketNo ?? "",
  });
  const [tags, setTags] = useState(parsed.tags.length ? parsed.tags : (prefill?.tags || []));
  const [showMoreProbs, setShowMoreProbs] = useState(() => tags.some((t) => REST_PROBLEM_TAGS.includes(t)) || !!f.extra);
  const [locId, setLocId] = useState(ticket?.locationId || defaultLocId || (locations.length === 1 ? locations[0]?.id : ""));
  const locSegRef = useRef(null);
  const [locThumb, setLocThumb] = useState(null);
  useLayoutEffect(() => {
    const active = locSegRef.current?.querySelector("button.active");
    if (active) setLocThumb({ left: active.offsetLeft, width: active.offsetWidth });
  }, [locId, locations]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleTag = (tag) => setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  const partOn = f.subStatus === "Alkatrészre vár" || f.subStatus === "Alkatrészre és készülékre vár";
  const deviceOn = f.subStatus === "Készülékre vár" || f.subStatus === "Alkatrészre és készülékre vár";
  const setPartDevice = (part, device) => setF({
    ...f,
    subStatus: part && device ? "Alkatrészre és készülékre vár" : part ? "Alkatrészre vár" : device ? "Készülékre vár" : null,
  });
  const flags = [
    { key: "warranty", on: f.isWarranty, color: "#4F46E5", label: "Garancia", icon: <WarrantyIcon width={12} height={12} />, onClick: () => setF({ ...f, isWarranty: !f.isWarranty }) },
    { key: "water", on: f.waterDamage, color: "#0EA5E9", label: "Ázott", icon: <DropletIcon width={12} height={12} />, onClick: () => setF({ ...f, waterDamage: !f.waterDamage }) },
  ];
  if (f.status === "Átvett") {
    flags.push(
      { key: "part", on: partOn, color: "#7C3AED", label: "Alkatrész", icon: <PartsIcon width={12} height={12} />, onClick: () => setPartDevice(!partOn, deviceOn) },
      { key: "device", on: deviceOn, color: "#0891B2", label: "Készülék", icon: <PhoneCaseIcon width={12} height={12} />, onClick: () => setPartDevice(partOn, !deviceOn) },
    );
  }
  const isOwnStock = f.ticketKind !== "Ügyfél";
  const hasIssue = tags.length > 0 || f.extra.trim();
  const valid = (isOwnStock ? !!f.productId : f.customerName.trim()) && f.brand.trim() && locId && hasIssue;
  const productMatches = isOwnStock && productQuery.trim()
    ? stock.filter((p) => {
        const q = productQuery.trim().toLowerCase();
        const hay = [p.imei, p.brand, p.model].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      }).slice(0, 8)
    : [];
  const imeiKey = normalizeImei(f.imei);
  const imeiMatch = imeiKey.length >= 6 ? {
    product: stock.find((p) => normalizeImei(p.imei) === imeiKey),
    tickets: tickets.filter((t) => normalizeImei(t.imei) === imeiKey && t.id !== ticket?.id),
  } : null;
  const hasImeiMatch = imeiMatch && (imeiMatch.product || imeiMatch.tickets.length > 0);

  function submit() {
    if (!valid) return;
    const issue = [tags.join(","), f.extra.trim()].filter(Boolean).join(",");
    const consentAt = f.consentGiven ? (ticket?.consentAt || new Date().toISOString()) : null;
    onSave({ ...f, issue, assignedTo: f.assignedTo || null, consentAt }, locId);
  }

  return (
    <div className="overlay">
      <div className="modal wf" onClick={(e) => e.stopPropagation()}>
        <h2>
          <div className="loc-seg" ref={locSegRef}>
            {locThumb && <div className="loc-seg-thumb" style={{ left: locThumb.left, width: locThumb.width }} />}
            {locations.map((l) => (
              <button key={l.id} type="button" className={locId === l.id ? "active" : ""} onClick={() => setLocId(l.id)}>{l.name}</button>
            ))}
          </div>
          <button className="iconbtn" onClick={onClose}><CloseIcon /></button>
        </h2>

        <div className="wf-sec">
          {isEdit && (
            <ChipField
              label="Státusz"
              value={f.status}
              onChange={(key) => setF({ ...f, status: key, subStatus: SUB_STATUSES[key]?.[0]?.key ?? null })}
              options={STATUSES.map((s) => ({ key: s.key, label: statusLabel(s.key) }))}
            />
          )}
          {f.status !== "Átvett" && (SUB_STATUSES[f.status] || []).length > 1 && (
            <ChipField
              label="Altípus"
              value={f.subStatus ?? null}
              onChange={(key) => setF({ ...f, subStatus: key })}
              options={SUB_STATUSES[f.status].map((s) => ({ key: s.key ?? null, label: s.label }))}
            />
          )}
          <div className="field">
            <div className="flag-row">
              {flags.map((fl) => (
                <button key={fl.key} type="button" className={`flag-chip${fl.on ? " on" : ""}`} style={{ "--fc": fl.color }} onClick={fl.onClick}>
                  <span className="av">{fl.icon}</span>
                  <span className="lbl">{fl.label}</span>
                </button>
              ))}
            </div>
          </div>
          {f.isWarranty && (
            <SegField
              label="Garancia típusa"
              value={f.warrantyKind}
              onChange={(key) => setF({ ...f, warrantyKind: key })}
              options={[{ key: "szerviz", label: "Szerviz" }, { key: "termék", label: "Értékesített telefon" }]}
            />
          )}
        </div>

        <div className="wf-sec">
          {isOwnStock ? (
            <div className="field">
              <label>Termék (saját készlet)</label>
              {f.productId ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid #E5E7EB", borderRadius: 8 }}>
                  <span style={{ flex: 1 }}>{f.brand} {f.model}{stock.find((p) => p.id === f.productId)?.imei ? ` — IMEI ${stock.find((p) => p.id === f.productId).imei}` : ""}</span>
                  <button type="button" className="btn sec" onClick={() => setF({ ...f, productId: null, brand: "", model: "" })}>Csere</button>
                </div>
              ) : (
                <>
                  <input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Keresés IMEI / márka / modell szerint..." />
                  {productMatches.length > 0 && (
                    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                      {productMatches.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => { setF({ ...f, productId: p.id, brand: p.brand, model: p.model }); setProductQuery(""); }}
                          style={{ padding: "8px 10px", border: "1px solid #E5E7EB", borderRadius: 8, cursor: "pointer" }}
                        >
                          {p.brand} {p.model}{p.imei ? ` — IMEI ${p.imei}` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="field">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div className="contact-card">
                  <div className="contact-avatar">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21a8 8 0 10-16 0" /><circle cx="12" cy="7" r="4" /></svg>
                  </div>
                  <div className="contact-fields">
                    <CustomerAutocomplete
                      customers={customers}
                      name={f.customerName}
                      onChangeName={(name) => setF({ ...f, customerName: name, customerId: null })}
                      onSelect={(c) => setF({ ...f, customerName: c.name, customerPhone: c.phone || f.customerPhone, customerId: c.id })}
                      placeholder="Kliens neve"
                      className="contact-name-input"
                    />
                    <div className="contact-divider" />
                    <input className="contact-phone-input" value={f.customerPhone} onChange={set("customerPhone")} placeholder="Telefonszám" />
                  </div>
                </div>
                <div className="device-card">
                  <div className="device-avatar">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5" /><line x1="10" y1="18.5" x2="14" y2="18.5" /></svg>
                  </div>
                  <div className="device-fields">
                    <BrandField value={f.brand} onChange={(v) => setF({ ...f, brand: v })} />
                    <div className="device-divider" />
                    <input className="device-model-input" value={f.model} onChange={set("model")} placeholder="Modell" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="wf-sec">
          <SectionHead title="Mi a probléma?" />
          <div className="field"><label>Probléma {!hasIssue && <span style={{ color: "#DC2626", fontWeight: 400, textTransform: "none" }}>— válassz egy tag-et vagy írj leírást</span>}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: showMoreProbs ? 8 : 0 }}>
              {TOP_PROBLEM_TAGS.map((tag) => (
                <button key={tag} type="button" className={`prob-tag${tags.includes(tag) ? " active" : ""}`} onClick={() => toggleTag(tag)}>{tag}</button>
              ))}
              <button type="button" className={`prob-tag${showMoreProbs ? " active" : ""}`} onClick={() => setShowMoreProbs((v) => !v)}>Egyéb <span style={{ opacity: 0.6 }}>+{REST_PROBLEM_TAGS.length}</span></button>
            </div>
            {showMoreProbs && (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {REST_PROBLEM_TAGS.map((tag) => (
                    <button key={tag} type="button" className={`prob-tag${tags.includes(tag) ? " active" : ""}`} onClick={() => toggleTag(tag)}>{tag}</button>
                  ))}
                </div>
                <input value={f.extra} onChange={set("extra")} placeholder="Egyedi probléma leírása (ha nincs a listában)" />
              </>
            )}
          </div>
        </div>

        <div className="wf-sec">
          <div className="row3">
            <div className="field"><label>Árajánlat (Lei)</label><input type="number" value={f.price} onChange={set("price")} placeholder="0" /></div>
            <div className="field"><label>Anyagköltség (Lei)</label><input type="number" value={f.matCost} onChange={set("matCost")} placeholder="0" /></div>
            <DropdownField
              label="Garancia"
              value={f.warranty}
              onChange={(v) => setF({ ...f, warranty: v })}
              options={[{ key: "", label: "—" }, ...WARRANTIES.map((w) => ({ key: w, label: w }))]}
            />
          </div>
          <div className="row2">
            <div className="field"><label>Határidő (SLA)</label><input type="date" value={f.dueDate} onChange={set("dueDate")} /></div>
            <div className="field"><label>Átadás dátuma</label><input type="date" value={f.handoverDate} onChange={set("handoverDate")} /></div>
          </div>
        </div>

        <div className="wf-sec">
          {isOwnStock && (
            <div className="row2">
              <BrandField value={f.brand} onChange={(v) => setF({ ...f, brand: v })} />
              <div className="field"><label>Modell</label><input value={f.model} onChange={set("model")} placeholder="S22, iPhone 12..." /></div>
            </div>
          )}
          {isEdit ? (
            <div className="row2">
              <div className="field"><label>IMEI</label><input value={f.imei} onChange={set("imei")} placeholder="35xxxxxxxxxxxxx" /></div>
              <DropdownField
                label="Technikus"
                value={f.assignedTo}
                onChange={(v) => setF({ ...f, assignedTo: v })}
                options={[{ key: "", label: "— nincs hozzárendelve —" }, ...users.map((u) => ({ key: u.id, label: u.fullName || u.email }))]}
              />
            </div>
          ) : (
            <div className="field"><label>IMEI</label><input value={f.imei} onChange={set("imei")} placeholder="35xxxxxxxxxxxxx" /></div>
          )}
          {f.unlockType === "Mintarajzolat" ? (
            <>
              <DropdownField
                label="Feloldás típusa"
                value={f.unlockType}
                onChange={(v) => setF({ ...f, unlockType: v, unlockCode: v === "Mintarajzolat" ? f.unlockCode : "" })}
                options={[{ key: "", label: "— nincs megadva —" }, { key: "PIN kód", label: "PIN kód" }, { key: "Jelszó", label: "Jelszó" }, { key: "Mintarajzolat", label: "Mintarajzolat" }, { key: "Nincs", label: "Nincs (nem zárolt)" }]}
              />
              <div className="field">
                <label>Feloldó minta</label>
                <div className="field-hint" style={{ marginBottom: 6 }}>Rajzold le ugyanazt a mintát, amit a kijelzőn húztak — az érintőképernyős pöttyök 1-9-es sorrendjét mentjük el.</div>
                <PatternLockPad value={f.unlockCode} onChange={(v) => setF({ ...f, unlockCode: v })} />
              </div>
            </>
          ) : (
            <div className="row2">
              <DropdownField
                label="Feloldás típusa"
                value={f.unlockType}
                onChange={(v) => setF({ ...f, unlockType: v, unlockCode: v === "" || v === "Nincs" ? "" : f.unlockCode })}
                options={[{ key: "", label: "— nincs megadva —" }, { key: "PIN kód", label: "PIN kód" }, { key: "Jelszó", label: "Jelszó" }, { key: "Mintarajzolat", label: "Mintarajzolat" }, { key: "Nincs", label: "Nincs (nem zárolt)" }]}
              />
              <div className="field"><label>Feloldó kód</label><input value={f.unlockCode} onChange={set("unlockCode")} placeholder="pl. 1234" disabled={f.unlockType === "" || f.unlockType === "Nincs"} /></div>
            </div>
          )}
          {isEdit && (
            <div className="field">
              <label>Sorszám (kód) <span style={{ color: "#9CA3AF", fontWeight: 400 }}>— opcionális, üresen hagyva automatikusan a következő szabad szám kerül rá</span></label>
              <input type="number" value={f.ticketNo} onChange={set("ticketNo")} placeholder="automatikus" />
            </div>
          )}
          {hasImeiMatch && (
            <div style={{ padding: "10px 12px", background: "var(--primary-soft)", border: "1px solid var(--primary)", borderRadius: 10, fontSize: 12.5 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--primary-ink)" }}>Ezzel a készülékkel már dolgoztunk:</div>
              {imeiMatch.product && (
                <div>— nálunk vásárolt telefon ({imeiMatch.product.condition === "New" ? "új" : "felújított"}, {money(imeiMatch.product.salePrice)}{imeiMatch.product.status === "sold" ? ", eladva" : ", raktáron"})</div>
              )}
              {imeiMatch.tickets.map((t) => (
                <div key={t.id}>— korábbi szerviz: {t.dateIn} · {(t.issue || "").split(",").filter(Boolean).join(", ") || "—"}</div>
              ))}
            </div>
          )}
        </div>

        <div className="wf-sec">
          <div className="field" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", fontWeight: 500, textTransform: "none", letterSpacing: 0, cursor: "pointer" }}>
              <input type="checkbox" className="chk" checked={f.folia} onChange={(e) => setF({ ...f, folia: e.target.checked })} /> Fólia felhelyezve
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", fontWeight: 500, textTransform: "none", letterSpacing: 0, cursor: "pointer" }}>
              <input type="checkbox" className="chk" checked={f.consentGiven} onChange={(e) => setF({ ...f, consentGiven: e.target.checked })} /> Az ügyfél elfogadta a szervizgarancia feltételeket
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", fontWeight: 500, textTransform: "none", letterSpacing: 0, cursor: "pointer" }}>
              <input type="checkbox" className="chk" checked={f.marketingConsent} onChange={(e) => setF({ ...f, marketingConsent: e.target.checked })} /> Hozzájárul, hogy akciókról/emlékeztetőkről SMS-ben értesítsük
            </label>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn sec" onClick={onClose}>Mégse</button>
          <button className="btn" disabled={!valid || busy} onClick={submit}>{busy ? "Mentés..." : isEdit ? "Mentés" : "Létrehozás"}</button>
        </div>
      </div>
    </div>
  );
}
