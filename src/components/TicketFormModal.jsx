import { useLayoutEffect, useRef, useState } from "react";
import { CloseIcon, CheckIcon, ChevronRightIcon } from "./icons";
import { PROBLEM_TAGS, WARRANTIES, STATUSES, SUB_STATUSES, statusLabel, normalizeImei, money, ticketCode } from "../lib/utils";
import CustomerAutocomplete from "./CustomerAutocomplete";
import { DropdownField } from "./FormPickers";
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

  const showPartDeviceFlags = f.status === "Átvett";

  return (
    <div className="overlay">
      <div className="modal wf2" onClick={(e) => e.stopPropagation()}>
        <h2>
          <div className="loc-seg" ref={locSegRef}>
            {locThumb && <div className="loc-seg-thumb" style={{ left: locThumb.left, width: locThumb.width }} />}
            {locations.map((l) => (
              <button key={l.id} type="button" className={locId === l.id ? "active" : ""} onClick={() => setLocId(l.id)}>{l.name}</button>
            ))}
          </div>
          <button className="iconbtn" onClick={onClose}><CloseIcon /></button>
        </h2>

        <div className="wf2-body">

          <div className={isOwnStock ? "" : "wf2-top-grid"}>
            {!isOwnStock && (
              <div className="wf2-sec">
                <div className="wf2-cap">Ügyfél</div>
                <div className="wf2-grp">
                  <div className="wf2-row">
                    <span className="wf2-row-lbl">Név</span>
                    <div className="wf2-flex1">
                      <CustomerAutocomplete
                        customers={customers}
                        name={f.customerName}
                        onChangeName={(name) => setF({ ...f, customerName: name, customerId: null })}
                        onSelect={(c) => setF({ ...f, customerName: c.name, customerPhone: c.phone || f.customerPhone, customerId: c.id })}
                        placeholder="Kliens neve"
                        className="wf2-row-val"
                      />
                    </div>
                  </div>
                  <div className="wf2-row">
                    <span className="wf2-row-lbl">Telefonszám</span>
                    <input className="wf2-row-val" value={f.customerPhone} onChange={set("customerPhone")} placeholder="07xx xxx xxx" />
                  </div>
                </div>
              </div>
            )}
            <div className="wf2-sec">
              <div className="wf2-cap">Ár</div>
              <div className="wf2-grp">
                <div className="wf2-row">
                  <span className="wf2-row-lbl">Árajánlat</span>
                  <input className="wf2-row-val" type="number" value={f.price} onChange={set("price")} placeholder="0 Lei" />
                </div>
                <div className="wf2-row">
                  <span className="wf2-row-lbl">Anyagköltség</span>
                  <input className="wf2-row-val" type="number" value={f.matCost} onChange={set("matCost")} placeholder="0 Lei" />
                </div>
              </div>
            </div>
          </div>

          {isEdit && (
            <div className="wf2-sec">
              <div className="wf2-cap">Munkalap</div>
              <div className="wf2-grp">
                <div className="wf2-row">
                  <span className="wf2-row-lbl">Státusz</span>
                  <DropdownField
                    value={f.status}
                    onChange={(key) => setF({ ...f, status: key, subStatus: SUB_STATUSES[key]?.[0]?.key ?? null })}
                    options={STATUSES.map((s) => ({ key: s.key, label: statusLabel(s.key) }))}
                  />
                </div>
                {f.status !== "Átvett" && (SUB_STATUSES[f.status] || []).length > 1 && (
                  <div className="wf2-row">
                    <span className="wf2-row-lbl">Altípus</span>
                    <DropdownField
                      value={f.subStatus ?? null}
                      onChange={(key) => setF({ ...f, subStatus: key })}
                      options={SUB_STATUSES[f.status].map((s) => ({ key: s.key ?? null, label: s.label }))}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="wf2-sec">
            <div className="wf2-cap">Állapot</div>
            <div className="wf2-grp">
              <div className="wf2-seg">
                <button type="button" className={`wf2-seg-btn${f.isWarranty ? " on" : ""}`} aria-pressed={f.isWarranty} onClick={() => setF({ ...f, isWarranty: !f.isWarranty })}>Garancia</button>
                <button type="button" className={`wf2-seg-btn${f.waterDamage ? " on" : ""}`} aria-pressed={f.waterDamage} onClick={() => setF({ ...f, waterDamage: !f.waterDamage })}>Ázott</button>
                {showPartDeviceFlags && (
                  <>
                    <button type="button" className={`wf2-seg-btn${partOn ? " on" : ""}`} aria-pressed={partOn} onClick={() => setPartDevice(!partOn, deviceOn)}>Alkatrészre vár</button>
                    <button type="button" className={`wf2-seg-btn${deviceOn ? " on" : ""}`} aria-pressed={deviceOn} onClick={() => setPartDevice(partOn, !deviceOn)}>Készülékre vár</button>
                  </>
                )}
                <button type="button" className={`wf2-seg-btn${f.folia ? " on" : ""}`} aria-pressed={f.folia} onClick={() => setF({ ...f, folia: !f.folia })}>Kér fóliát</button>
              </div>
            </div>
            {f.isWarranty && (
              <div className="wf2-grp" style={{ marginTop: 10 }}>
                <div className="wf2-row">
                  <span className="wf2-row-lbl">Garancia típusa</span>
                  <DropdownField
                    value={f.warrantyKind}
                    onChange={(key) => setF({ ...f, warrantyKind: key })}
                    options={[{ key: "szerviz", label: "Szerviz" }, { key: "termék", label: "Értékesített telefon" }]}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="wf2-sec">
            <div className="wf2-cap">Probléma</div>
            <div className="wf2-grp">
              <div className="wf2-seg">
                {TOP_PROBLEM_TAGS.map((tag) => {
                  const on = tags.includes(tag);
                  return (
                    <button key={tag} type="button" className={`wf2-seg-btn${on ? " on" : ""}`} aria-pressed={on} onClick={() => toggleTag(tag)}>{tag}</button>
                  );
                })}
              </div>
              <button type="button" className="wf2-row" style={{ width: "100%", background: "none", border: "none", borderTop: "1px solid #E5E5EA", textAlign: "left", font: "inherit", cursor: "pointer" }} onClick={() => setShowMoreProbs((v) => !v)}>
                <span className="wf2-row-lbl" style={{ flex: 1, color: "#1DB954", fontWeight: 600 }}>Egyéb, {REST_PROBLEM_TAGS.length} további hiba</span>
                <ChevronRightIcon className="wf2-chev" style={{ transform: showMoreProbs ? "rotate(90deg)" : "none" }} />
              </button>
            </div>
            {showMoreProbs && (
              <>
                <div className="wf2-grp" style={{ marginTop: 10 }}>
                  {REST_PROBLEM_TAGS.map((tag) => {
                    const on = tags.includes(tag);
                    return (
                      <button key={tag} type="button" className="wf2-row" style={{ width: "100%", background: "none", border: "none", textAlign: "left", font: "inherit", cursor: "pointer" }} onClick={() => toggleTag(tag)}>
                        <span className="wf2-row-lbl" style={{ flex: 1, fontWeight: 400 }}>{tag}</span>
                        <span className={`wf2-check${on ? " on" : ""}`}>{on && <CheckIcon width={12} height={12} strokeWidth={2.4} />}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="wf2-grp" style={{ marginTop: 10 }}>
                  <div className="wf2-row">
                    <input className="wf2-row-val" style={{ textAlign: "left", color: "#000" }} value={f.extra} onChange={set("extra")} placeholder="Egyedi probléma leírása, ha nincs a listában" />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="wf2-sec">
            <div className="wf2-cap">Készülék</div>
            <div className="wf2-grp">
              {isOwnStock && (
                f.productId ? (
                  <button type="button" className="wf2-row" style={{ width: "100%", background: "none", border: "none", textAlign: "left", font: "inherit", cursor: "pointer" }} onClick={() => setF({ ...f, productId: null, brand: "", model: "" })}>
                    <span className="wf2-row-lbl" style={{ flex: 1 }}>{f.brand} {f.model}{stock.find((p) => p.id === f.productId)?.imei ? ` — ${stock.find((p) => p.id === f.productId).imei}` : ""}</span>
                    <span className="wf2-row-val" style={{ color: "#1DB954", flex: "none" }}>Csere</span>
                  </button>
                ) : (
                  <>
                    <div className="wf2-row">
                      <input className="wf2-row-val" style={{ textAlign: "left", color: "#000" }} value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Keresés saját készletben: IMEI / márka / modell" />
                    </div>
                    {productMatches.map((p) => (
                      <button key={p.id} type="button" className="wf2-row" style={{ width: "100%", background: "none", border: "none", textAlign: "left", font: "inherit", cursor: "pointer" }} onClick={() => { setF({ ...f, productId: p.id, brand: p.brand, model: p.model }); setProductQuery(""); }}>
                        <span className="wf2-row-lbl" style={{ flex: 1, fontWeight: 400 }}>{p.brand} {p.model}{p.imei ? ` — ${p.imei}` : ""}</span>
                        <ChevronRightIcon className="wf2-chev" />
                      </button>
                    ))}
                  </>
                )
              )}
              <div className="wf2-row">
                <span className="wf2-row-lbl">Márka</span>
                <div className="wf2-flex1">
                  <BrandField value={f.brand} onChange={(v) => setF({ ...f, brand: v })} />
                </div>
              </div>
              <div className="wf2-row">
                <span className="wf2-row-lbl">Modell</span>
                <input className="wf2-row-val" value={f.model} onChange={set("model")} placeholder="S22, iPhone 12..." />
              </div>
              <div className="wf2-row">
                <span className="wf2-row-lbl">IMEI</span>
                <input className="wf2-row-val" value={f.imei} onChange={set("imei")} placeholder="35xxxxxxxxxxxxx" />
              </div>
              {f.unlockType === "Mintarajzolat" ? (
                <div className="wf2-row">
                  <span className="wf2-row-lbl">Feloldás</span>
                  <DropdownField
                    value={f.unlockType}
                    onChange={(v) => setF({ ...f, unlockType: v, unlockCode: v === "Mintarajzolat" ? f.unlockCode : "" })}
                    options={[{ key: "", label: "— nincs megadva —" }, { key: "PIN kód", label: "PIN kód" }, { key: "Jelszó", label: "Jelszó" }, { key: "Mintarajzolat", label: "Mintarajzolat" }, { key: "Nincs", label: "Nincs (nem zárolt)" }]}
                  />
                </div>
              ) : (
                <div className="wf2-row">
                  <span className="wf2-row-lbl">Feloldás</span>
                  <DropdownField
                    value={f.unlockType}
                    onChange={(v) => setF({ ...f, unlockType: v, unlockCode: v === "" || v === "Nincs" ? "" : f.unlockCode })}
                    options={[{ key: "", label: "— nincs megadva —" }, { key: "PIN kód", label: "PIN kód" }, { key: "Jelszó", label: "Jelszó" }, { key: "Mintarajzolat", label: "Mintarajzolat" }, { key: "Nincs", label: "Nincs (nem zárolt)" }]}
                  />
                </div>
              )}
              {f.unlockType !== "Mintarajzolat" && (
                <div className="wf2-row">
                  <span className="wf2-row-lbl">Feloldó kód</span>
                  <input className="wf2-row-val" value={f.unlockCode} onChange={set("unlockCode")} placeholder="pl. 1234" disabled={f.unlockType === "" || f.unlockType === "Nincs"} />
                </div>
              )}
              {isEdit && (
                <div className="wf2-row">
                  <span className="wf2-row-lbl">Sorszám</span>
                  <input className="wf2-row-val" type="number" value={f.ticketNo} onChange={set("ticketNo")} placeholder="automatikus" />
                </div>
              )}
            </div>
            {f.unlockType === "Mintarajzolat" && (
              <div className="wf2-grp" style={{ marginTop: 10, padding: 16 }}>
                <div className="wf2-foot" style={{ padding: "0 0 10px" }}>Rajzold le ugyanazt a mintát, amit a kijelzőn húztak — az érintőképernyős pöttyök 1-9-es sorrendjét mentjük el.</div>
                <PatternLockPad value={f.unlockCode} onChange={(v) => setF({ ...f, unlockCode: v })} />
              </div>
            )}
            {hasImeiMatch && (
              <div className="wf2-grp" style={{ marginTop: 10, padding: "10px 14px", background: "var(--primary-soft)", fontSize: 12.5 }}>
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

          {isEdit && (
            <div className="wf2-sec">
              <div className="wf2-cap">Technikus</div>
              <div className="wf2-grp">
                <div className="wf2-row">
                  <span className="wf2-row-lbl">Hozzárendelve</span>
                  <DropdownField
                    value={f.assignedTo}
                    onChange={(v) => setF({ ...f, assignedTo: v })}
                    options={[{ key: "", label: "— nincs hozzárendelve —" }, ...users.map((u) => ({ key: u.id, label: u.fullName || u.email }))]}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="wf2-sec">
            <div className="wf2-cap">Garancia és határidő</div>
            <div className="wf2-grp">
              <div className="wf2-row">
                <span className="wf2-row-lbl">Garancia</span>
                <DropdownField
                  value={f.warranty}
                  onChange={(v) => setF({ ...f, warranty: v })}
                  options={[{ key: "", label: "—" }, ...WARRANTIES.map((w) => ({ key: w, label: w }))]}
                />
              </div>
              <div className="wf2-row">
                <span className="wf2-row-lbl">Határidő (SLA)</span>
                <div className="wf2-date">
                  <input className="wf2-row-val" type="date" value={f.dueDate} onChange={set("dueDate")} />
                  <ChevronRightIcon className="wf2-chev" />
                </div>
              </div>
              <div className="wf2-row">
                <span className="wf2-row-lbl">Átadás dátuma</span>
                <div className="wf2-date">
                  <input className="wf2-row-val" type="date" value={f.handoverDate} onChange={set("handoverDate")} />
                  <ChevronRightIcon className="wf2-chev" />
                </div>
              </div>
            </div>
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
