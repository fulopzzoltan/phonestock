import { useState } from "react";
import LocationField from "./LocationField";
import { CloseIcon } from "./icons";
import { PROBLEM_TAGS, WARRANTIES, STATUSES, SUB_STATUSES, statusLabel, normalizeImei, money, ticketCode } from "../lib/utils";
import CustomerAutocomplete from "./CustomerAutocomplete";
import { ChipField, DropdownField } from "./FormPickers";

function parseIssue(issue) {
  const parts = (issue || "").split(",").map((p) => p.trim()).filter(Boolean);
  const tags = parts.filter((p) => PROBLEM_TAGS.includes(p));
  const extra = parts.filter((p) => !PROBLEM_TAGS.includes(p)).join(", ");
  return { tags, extra };
}

function SectionHead({ n, title, sub }) {
  return (
    <div className="wf-sechead">
      <div className="wf-secnum">{n}</div>
      <div>
        <div className="wf-sectitle">{title}</div>
        {sub && <div className="wf-secsub">{sub}</div>}
      </div>
    </div>
  );
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
    warranty: ticket?.warranty || "",
    handoverDate: ticket?.handoverDate || "",
    dueDate: ticket?.dueDate || "",
    folia: ticket?.folia || false,
    status: ticket?.status || "Átvett",
    subStatus: ticket?.subStatus ?? null,
    assignedTo: ticket?.assignedTo || "",
    consentGiven: !!ticket?.consentAt,
    marketingConsent: false,
    extra: parsed.extra || prefill?.extra || "",
    ticketNo: ticket?.ticketNo ?? "",
  });
  const [tags, setTags] = useState(parsed.tags.length ? parsed.tags : (prefill?.tags || []));
  const [locId, setLocId] = useState(ticket?.locationId || defaultLocId || (locations.length === 1 ? locations[0]?.id : ""));
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleTag = (tag) => setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
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
    <div className="overlay" onClick={onClose}>
      <div className="modal wf" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Munkalap szerkesztése" : "Új szerviz munkalap"} <button className="iconbtn" onClick={onClose}><CloseIcon /></button></h2>

        <div className="wf-sec">
          <SectionHead n={1} title="Alapadatok" sub="Helyszín és a munkalap státusza" />
          <LocationField locations={locations} value={locId} onChange={setLocId} />
          <ChipField
            label="Státusz"
            value={f.status}
            onChange={(key) => setF({ ...f, status: key, subStatus: SUB_STATUSES[key]?.[0]?.key ?? null })}
            options={STATUSES.map((s) => ({ key: s.key, label: statusLabel(s.key) }))}
          />
          {(SUB_STATUSES[f.status] || []).length > 1 && (
            <ChipField
              label="Altípus"
              value={f.subStatus ?? null}
              onChange={(key) => setF({ ...f, subStatus: key })}
              options={SUB_STATUSES[f.status].map((s) => ({ key: s.key ?? null, label: s.label }))}
            />
          )}
        </div>

        <div className="wf-sec">
          <SectionHead n={2} title="Ki hozza a készüléket?" />
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
            <div className="row2">
              <div className="field"><label>Kliens neve</label>
                <CustomerAutocomplete
                  customers={customers}
                  name={f.customerName}
                  onChangeName={(name) => setF({ ...f, customerName: name, customerId: null })}
                  onSelect={(c) => setF({ ...f, customerName: c.name, customerPhone: c.phone || f.customerPhone, customerId: c.id })}
                />
              </div>
              <div className="field"><label>Telefonszám</label><input value={f.customerPhone} onChange={set("customerPhone")} placeholder="07xx xxx xxx" /></div>
            </div>
          )}
        </div>

        <div className="wf-sec">
          <SectionHead n={3} title="Készülék" sub="Márka, modell, azonosítók" />
          <div className="row2">
            <div className="field"><label>Márka</label><input value={f.brand} onChange={set("brand")} placeholder="Samsung, Apple..." /></div>
            <div className="field"><label>Modell</label><input value={f.model} onChange={set("model")} placeholder="S22, iPhone 12..." /></div>
          </div>
          <div className="row2">
            <div className="field"><label>IMEI</label><input value={f.imei} onChange={set("imei")} placeholder="35xxxxxxxxxxxxx" /></div>
            <DropdownField
              label="Technikus"
              value={f.assignedTo}
              onChange={(v) => setF({ ...f, assignedTo: v })}
              options={[{ key: "", label: "— nincs hozzárendelve —" }, ...users.map((u) => ({ key: u.id, label: u.fullName || u.email }))]}
            />
          </div>
          <div className="field">
            <label>Sorszám (kód) <span style={{ color: "#9CA3AF", fontWeight: 400 }}>— opcionális, üresen hagyva automatikusan a következő szabad szám kerül rá</span></label>
            <input type="number" value={f.ticketNo} onChange={set("ticketNo")} placeholder="automatikus" />
          </div>
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
          <SectionHead n={4} title="Mi a probléma?" sub="Válassz egy vagy több tag-et, vagy írj egyedi leírást" />
          <div className="field"><label>Probléma {!hasIssue && <span style={{ color: "#DC2626", fontWeight: 400, textTransform: "none" }}>— válassz egy tag-et vagy írj leírást</span>}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {PROBLEM_TAGS.map((tag) => (
                <button key={tag} type="button" className={`prob-tag${tags.includes(tag) ? " active" : ""}`} onClick={() => toggleTag(tag)}>{tag}</button>
              ))}
            </div>
            <input value={f.extra} onChange={set("extra")} placeholder="Egyedi leírás (opcionális)" />
          </div>
        </div>

        <div className="wf-sec">
          <SectionHead n={5} title="Ár & garancia" sub="Munkadíj, anyagköltség, határidő" />
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
          <SectionHead n={6} title="Feltételek" sub="Fólia és ügyfél-hozzájárulások" />
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
