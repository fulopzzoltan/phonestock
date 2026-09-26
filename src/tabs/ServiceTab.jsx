import { useState, useRef, useEffect } from "react";
import { money, ticketRemaining, STATUSES, SUB_STATUSES, statusLabel, statusCls, subStatusCls, subStatusLabel, displayName, ticketCode, daysOnShelf, slaInfo, isStaleReady, partCode, titleCase, PROBLEM_TAGS, WARRANTIES } from "../lib/utils";
import { SearchIcon, ServiceIcon, WarrantyIcon, ChevronRightIcon, ChevronDownIcon, CheckIcon, ScanIcon, MoreIcon, PrintIcon, PlusIcon, PartsIcon, CloseIcon } from "../components/icons";
import { EmptyState, LoadingState } from "../components/EmptyState";
import ResponsiveTable from "../components/ResponsiveTable";
import HandoverPaymentModal from "../components/HandoverPaymentModal";
import CustomerAutocomplete from "../components/CustomerAutocomplete";
import BrandPickerButton from "../components/BrandPickerButton";
import DayChip from "../components/DayChip";

const STATUS_KEYS = STATUSES.map((s) => s.key);
// BoardUI-ból kinyert valódi színek — ugyanezt használja a StatusPicker trigger pöttye és a
// legördülő menü sorai is, hogy ne legyen eltérés a kettő között.
const STATUS_DOT_COLOR = { "Átvett": "#F0B100", "Javítás alatt": "#F54A00", "Minőségellenőrzés": "#00B8DB", "Átadásra": "#00C950" };
const SIKERTELEN_DOT_COLOR = "#A50036";
// Ugyanaz a top-5 leggyakoribb hiba, mint a TicketFormModal-ban — a maradék "Egyéb" szabad
// szöveggel érhető el, hogy az inline sor ne váljon zsúfolttá.
const TOP_PROBLEM_TAGS = PROBLEM_TAGS.filter((t) => t !== "Egyéb").slice(0, 5);
function nextActionOf(t) {
  const idx = STATUS_KEYS.indexOf(t.status);
  if (idx !== -1 && idx < STATUS_KEYS.length - 1) {
    const nk = STATUS_KEYS[idx + 1];
    return { status: nk, subStatus: SUB_STATUSES[nk]?.[0]?.key ?? null, icon: ChevronRightIcon, label: "Következő", title: `Következő státusz: ${statusLabel(nk)}` };
  }
  if (idx === STATUS_KEYS.length - 1 && t.subStatus !== "Átadva") {
    return { status: t.status, subStatus: "Átadva", icon: CheckIcon, label: "Átadás", title: "Munkalap átadása a vevőnek" };
  }
  return null;
}

// Kattintható státusz-jelvény a lista Státusz oszlopában — a BoardUI table-komponensének
// "Purchase" oszlopa alapján: a jelvény maga a dropdown trigger, kattintásra egy kis lista
// nyílik a 4 fő státusszal, hogy ne kelljen a munkalapot megnyitni csak a státuszváltáshoz.
function StatusPicker({ ticket, dotColor, label, disabled, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  return (
    <div className="wl-status-wrap" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="status-picker-trigger" disabled={disabled} onClick={() => setOpen((v) => !v)}>
        <span className="status-dot-halo" style={{ background: `color-mix(in srgb, ${dotColor} 22%, white)` }}>
          <span className="status-dot" style={{ background: dotColor }} />
        </span>
        {label}
        <ChevronDownIcon width={11} height={11} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .12s" }} />
      </button>
      {open && (
        <div className="wl-status-menu status-drop-menu">
          {STATUSES.map((s) => {
            const isCurrent = s.key === ticket.status && !(s.key === "Átadásra" && ticket.subStatus === "Sikertelen");
            return (
              <div
                key={s.key}
                className={`wl-status-opt${isCurrent ? " current" : ""}`}
                onClick={() => { setOpen(false); if (!isCurrent) onChange(ticket.id, s.key, SUB_STATUSES[s.key]?.[0]?.key ?? null); }}
              >
                <span className="dot" style={{ background: STATUS_DOT_COLOR[s.key] }} />{s.label}
                {isCurrent && <CheckIcon width={13} height={13} style={{ marginLeft: "auto", flexShrink: 0 }} />}
              </div>
            );
          })}
          {(() => {
            const isCurrent = ticket.status === "Átadásra" && ticket.subStatus === "Sikertelen";
            return (
              <div
                className={`wl-status-opt${isCurrent ? " current" : ""}`}
                onClick={() => { setOpen(false); if (!isCurrent) onChange(ticket.id, "Átadásra", "Sikertelen"); }}
              >
                <span className="dot" style={{ background: SIKERTELEN_DOT_COLOR }} />Sikertelen
                {isCurrent && <CheckIcon width={13} height={13} style={{ marginLeft: "auto", flexShrink: 0 }} />}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// Gyors alkatrész-hozzárendelés a listából — Rögzítve státuszú munkalapoknál a "Következő
// állapot" nyíl helyett, mert a státuszváltás már a Státusz-választóból is elérhető, itt
// hasznosabb egy azonnali "+" az első alkatrész felvételére (nem kell a munkalapot megnyitni).
function PartAddPopover({ ticket, parts, onAddPart, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selPartId, setSelPartId] = useState("");
  const [qty, setQty] = useState(1);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) { setQuery(""); setSelPartId(""); setQty(1); return; }
    function onDocMouseDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const availableParts = (parts || []).filter((p) => Number(p.quantity) > 0);
  const q = query.trim().toLowerCase();
  const shownParts = q
    ? availableParts.filter((p) => [p.name, p.brand, p.modelFit, partCode(p.partNo)].filter(Boolean).join(" ").toLowerCase().includes(q))
    : availableParts;
  const selPart = availableParts.find((p) => p.id === selPartId);

  function add() {
    if (!selPart) return;
    onAddPart(ticket.id, selPart, qty);
    setOpen(false); setQuery(""); setSelPartId(""); setQty(1);
  }

  return (
    <div className="wl-status-wrap" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="btn sec sm icon-only" disabled={disabled} title="Alkatrész hozzáadása" onClick={() => setOpen((v) => !v)}>
        <PartsIcon width={13} height={13} />
      </button>
      {open && (
        <div className="wl-status-menu part-add-menu">
          <input
            type="text" autoFocus placeholder="Keresés név vagy kód szerint..."
            value={query} onChange={(e) => setQuery(e.target.value)}
            style={{ marginBottom: 6, width: "100%", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 9, padding: "8px 10px", fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }}
          />
          <select value={selPartId} onChange={(e) => setSelPartId(e.target.value)} style={{ width: "100%", marginBottom: 6 }}>
            <option value="">— Alkatrész ({shownParts.length}) —</option>
            {shownParts.map((p) => {
              const fit = [p.brand, p.modelFit].filter(Boolean).join(" ");
              return <option key={p.id} value={p.id}>{partCode(p.partNo)} — {p.name}{fit ? ` · ${fit}` : ""} ({p.quantity} db)</option>;
            })}
          </select>
          <div style={{ display: "flex", gap: 6 }}>
            <input type="number" min="1" max={selPart?.quantity || 1} value={qty} onChange={(e) => setQty(Number(e.target.value))}
              style={{ width: 56, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 9, padding: "9px 8px", fontFamily: "inherit", fontSize: 13 }} />
            <button type="button" className="btn sm" disabled={!selPart || disabled} onClick={add} style={{ flex: 1 }}>Hozzáadás</button>
            <button type="button" className="iconbtn" onClick={() => setOpen(false)}><CloseIcon width={14} height={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// Új munkalap — nem forma-kártya popup, hanem a táblázat folytatódik lefelé: egy szerkeszthető
// sor a lista tetején, ugyanolyan oszlopokkal, mint a valódi sorok, plusz egy sűrű,
// aláhúzásos "cella"-sáv a ritkábban kellő mezőknek ("Új munkalap — táblázat-érzés" design
// artifact alapján — lásd a "+Egyéb" chip / IMEI-feloldás-anyagköltség sáv elrendezését).
function NewTicketRow({ open, onCancel, onCreate, customers, defaultLocId, busy }) {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerId, setCustomerId] = useState(null);
  const [price, setPrice] = useState("");
  const [tags, setTags] = useState([]);
  const [extra, setExtra] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [imei, setImei] = useState("");
  const [unlockType, setUnlockType] = useState("");
  const [unlockCode, setUnlockCode] = useState("");
  const [matCost, setMatCost] = useState("");
  const [isWarranty, setIsWarranty] = useState(false);
  const [waterDamage, setWaterDamage] = useState(false);
  const [folia, setFolia] = useState(false);
  const [warranty, setWarranty] = useState("1 hó");
  const [dueDate, setDueDate] = useState("");
  const [handoverDate, setHandoverDate] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  // Amíg a sor nyílik/csukódik, a cellák overflow:hidden-nel vágják a tartalmat, hogy a
  // max-height átmenet működjön — de ez a Márka-választó (és bármelyik) legördülő menüjét is
  // levágná, ha nyitva marad. Ezért az animáció végeztével "settled"-re váltunk, ahol a
  // cellák overflow:visible-lé válnak, hogy a legördülők szabadon kilógjanak.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!open) { setSettled(false); return; }
    const t = setTimeout(() => setSettled(true), 400);
    return () => clearTimeout(t);
  }, [open]);
  // A "+" gomb belepottyan a táblába, ez a sor pedig onnan bomlik ki — minden cella-tartalom
  // saját max-height/opacity átmenettel nyúlik ki, ugyanazzal az időzítéssel, hogy a sor
  // egységesen "kinyíljon", ahelyett hogy csak felugorna/eltűnne.
  const revealStyle = (maxH) => ({ maxHeight: open ? maxH : 0, opacity: open ? 1 : 0, overflow: settled ? "visible" : "hidden" });

  const toggleTag = (tag) => setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  const hasIssue = tags.length > 0 || extra.trim();
  // A mentés gomb inaktív állapota önmagában nem árulja el, mi hiányzik — ezért a title
  // felsorolja, hogy a felhasználó ne "nem enged menteni" hibaként élje meg a hiányzó mezőt.
  const missing = [
    !customerName.trim() && "ügyfél neve",
    !brand.trim() && "márka",
    !hasIssue && "probléma",
    !defaultLocId && "helyszín",
  ].filter(Boolean);
  const valid = missing.length === 0;

  function submit() {
    if (!valid || busy) return;
    const issue = [tags.join(","), extra.trim()].filter(Boolean).join(",");
    onCreate({
      ticketKind: "Ügyfél", productId: null,
      customerName, customerPhone, customerId,
      brand, model, imei,
      price, matCost,
      warranty, handoverDate, dueDate,
      folia, status: "Átvett", subStatus: null,
      isWarranty, warrantyKind: "szerviz", waterDamage,
      unlockType, unlockCode, assignedTo: null,
      consentAt: null, extra, issue, ticketNo: "",
    }, defaultLocId);
  }

  return (
    <>
      <tr className="svc-nr-row">
        <td className="mono col-serial" style={{ padding: 0 }}>
          <div className="svc-nr-reveal" style={{ ...revealStyle(140), color: "#B7BCC4", padding: "11px 16px" }}>—</div>
        </td>
        <td style={{ padding: 0 }}>
          <div className="svc-nr-reveal" style={{ ...revealStyle(140), color: "#B7BCC4", padding: "11px 16px" }}>Ma</div>
        </td>
        <td style={{ padding: 0 }}>
          <div className="svc-nr-reveal" style={{ ...revealStyle(140), padding: "11px 16px" }}>
            <div className="svc-nr-stack">
              <BrandPickerButton value={brand} onChange={setBrand} disabled={busy} />
              <input className="svc-nr-top" placeholder="Modell (A53)" value={model} onChange={(e) => setModel(e.target.value)} disabled={busy} />
            </div>
          </div>
        </td>
        <td style={{ padding: 0 }}>
          <div className="svc-nr-reveal" style={{ ...revealStyle(140), padding: "11px 16px" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TOP_PROBLEM_TAGS.map((tag) => (
                <span key={tag} className={`svc-nr-chip${tags.includes(tag) ? " on" : ""}`} onClick={() => !busy && toggleTag(tag)}>{tag}</span>
              ))}
              <span className={`svc-nr-chip${showExtra ? " on" : ""}`} onClick={() => !busy && setShowExtra((v) => !v)}>+ Egyéb</span>
              {showExtra && (
                <input className="svc-nr-top" style={{ marginTop: 6, width: "100%" }} placeholder="Egyedi probléma leírása" value={extra} onChange={(e) => setExtra(e.target.value)} disabled={busy} />
              )}
            </div>
          </div>
        </td>
        <td style={{ padding: 0 }}>
          <div className="svc-nr-reveal" style={{ ...revealStyle(140), padding: "11px 16px" }}>
            <div className="svc-nr-stack">
              <CustomerAutocomplete
                customers={customers}
                name={customerName}
                onChangeName={(name) => { setCustomerName(name); setCustomerId(null); }}
                onSelect={(c) => { setCustomerName(c.name); setCustomerPhone(c.phone || customerPhone); setCustomerId(c.id); }}
                placeholder="Kliens neve"
                className="svc-nr-top"
              />
              <input className="svc-nr-top" placeholder="07xx xxx xxx" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} disabled={busy} />
            </div>
          </div>
        </td>
        <td className="col-status" style={{ padding: 0 }}>
          <div className="svc-nr-reveal" style={{ ...revealStyle(140), padding: "11px 16px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "#111827" }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: STATUS_DOT_COLOR["Átvett"] }} />Rögzítve
            </span>
          </div>
        </td>
        <td className="row-price" style={{ padding: 0 }}>
          <div className="svc-nr-reveal" style={{ ...revealStyle(140), padding: "11px 16px" }}>
            <input className="svc-nr-top" style={{ textAlign: "right" }} placeholder="0 Lei" value={price} onChange={(e) => setPrice(e.target.value)} disabled={busy} />
          </div>
        </td>
        <td className="stk-actions" style={{ padding: 0 }}>
          <div className="svc-nr-reveal" style={{ ...revealStyle(140), padding: "11px 16px", display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button
              type="button" title={valid ? "Mentés" : `Hiányzik: ${missing.join(", ")}`} disabled={!valid || busy} onClick={submit}
              style={{ width: 28, height: 28, borderRadius: 999, border: "none", background: valid ? "#1DB954" : "#D1D5DB", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: valid ? "pointer" : "default", flexShrink: 0 }}
            >
              <CheckIcon width={13} height={13} />
            </button>
            <button
              type="button" title="Mégse" disabled={busy} onClick={onCancel}
              style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid #E5E7EB", background: "#fff", color: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
            >
              <CloseIcon width={12} height={12} />
            </button>
          </div>
        </td>
      </tr>
      <tr className="svc-nr-row">
        <td colSpan={8} style={{ padding: 0 }}>
          <div className="svc-nr-reveal" style={revealStyle(40)}>
            <button type="button" className={`svc-nr-more-toggle${moreOpen ? " open" : ""}`} onClick={() => setMoreOpen((v) => !v)}>
              <ChevronRightIcon className="chev" width={9} height={9} />
              Több adat (IMEI, feloldás, anyagköltség, állapot)
            </button>
          </div>
          {open && moreOpen && (
            <div className="svc-nr-rr">
              <div className="svc-nr-rr-grid svc-nr-rr-4">
                <div>
                  <span className="svc-nr-rr-lbl">IMEI</span>
                  <input className="svc-nr-cell" placeholder="35xxxxxxxxxxxxx" value={imei} onChange={(e) => setImei(e.target.value)} disabled={busy} />
                </div>
                <div>
                  <span className="svc-nr-rr-lbl">Feloldás típusa</span>
                  <select className="svc-nr-cell" value={unlockType} onChange={(e) => setUnlockType(e.target.value)} disabled={busy}>
                    <option value="">— nincs megadva —</option>
                    <option value="PIN kód">PIN kód</option>
                    <option value="Jelszó">Jelszó</option>
                    <option value="Mintarajzolat">Mintarajzolat</option>
                    <option value="Nincs">Nincs (nem zárolt)</option>
                  </select>
                </div>
                <div>
                  <span className="svc-nr-rr-lbl">Feloldó kód</span>
                  <input className="svc-nr-cell" placeholder="pl. 1234" value={unlockCode} onChange={(e) => setUnlockCode(e.target.value)} disabled={busy || unlockType === "" || unlockType === "Nincs"} />
                </div>
                <div>
                  <span className="svc-nr-rr-lbl">Anyagköltség</span>
                  <input className="svc-nr-cell" placeholder="0 Lei" value={matCost} onChange={(e) => setMatCost(e.target.value)} disabled={busy} />
                </div>
              </div>
              <div className="svc-nr-rr-grid svc-nr-rr-5" style={{ marginTop: 12 }}>
                <div style={{ gridColumn: "span 2" }}>
                  <span className="svc-nr-rr-lbl">Állapot</span>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", paddingTop: 2 }}>
                    <label className={`svc-nr-flag${isWarranty ? " on" : ""}`}>
                      <input type="checkbox" checked={isWarranty} onChange={(e) => setIsWarranty(e.target.checked)} disabled={busy} />Garancia
                    </label>
                    <label className={`svc-nr-flag${waterDamage ? " on" : ""}`}>
                      <input type="checkbox" checked={waterDamage} onChange={(e) => setWaterDamage(e.target.checked)} disabled={busy} />Ázott
                    </label>
                    <label className={`svc-nr-flag${folia ? " on" : ""}`}>
                      <input type="checkbox" checked={folia} onChange={(e) => setFolia(e.target.checked)} disabled={busy} />Kér fóliát
                    </label>
                  </div>
                </div>
                <div>
                  <span className="svc-nr-rr-lbl">Garancia hossza</span>
                  <select className="svc-nr-cell" value={warranty} onChange={(e) => setWarranty(e.target.value)} disabled={busy}>
                    <option value="">—</option>
                    {WARRANTIES.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <span className="svc-nr-rr-lbl">Határidő (SLA)</span>
                  <input className="svc-nr-cell" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={busy} />
                </div>
                <div>
                  <span className="svc-nr-rr-lbl">Átadás dátuma</span>
                  <input className="svc-nr-cell" type="date" value={handoverDate} onChange={(e) => setHandoverDate(e.target.value)} disabled={busy} />
                </div>
              </div>
            </div>
          )}
        </td>
      </tr>
    </>
  );
}

export default function ServiceTab({
  effectiveLocFilter, locName, busy, svcSearch, setSvcSearch, onScan,
  loadingData, activeTickets, setDetailId, handedOverTickets, onStatusChange, onPrint, parts, onAddPart,
  customers, defaultLocId, onCreateTicket,
}) {
  const [handoverPrompt, setHandoverPrompt] = useState(null);
  const [showHandedOver, setShowHandedOver] = useState(false);
  const [handedOverQuery, setHandedOverQuery] = useState("");
  const [dateSort, setDateSort] = useState(null); // null | "asc" | "desc"
  // Új munkalap sor: addMounted amíg a sor a DOM-ban van (a záró animáció alatt is),
  // addOpen a vizuálisan kinyílt állapot (ez vezérli a cellák max-height átmenetét),
  // addAnimPhase a "+" gomb ikonjának csepp-be/pop-ki animációja.
  const [addMounted, setAddMounted] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addAnimPhase, setAddAnimPhase] = useState("idle"); // idle | dropping | popping
  const [tableRipple, setTableRipple] = useState(false);
  const addTimersRef = useRef([]);

  useEffect(() => () => addTimersRef.current.forEach(clearTimeout), []);

  function clearAddTimers() {
    addTimersRef.current.forEach(clearTimeout);
    addTimersRef.current = [];
  }
  function openAddRow() {
    clearAddTimers();
    setAddMounted(true);
    setAddAnimPhase("dropping");
    setTableRipple(true);
    addTimersRef.current.push(
      setTimeout(() => setAddOpen(true), 20),
      setTimeout(() => setAddAnimPhase("idle"), 360),
      setTimeout(() => setTableRipple(false), 540),
    );
  }
  function closeAddRow() {
    clearAddTimers();
    setAddAnimPhase("popping");
    setAddOpen(false);
    addTimersRef.current.push(
      setTimeout(() => setAddAnimPhase("idle"), 320),
      setTimeout(() => setAddMounted(false), 420),
    );
  }

  function runAction(t, na) {
    if (na.subStatus === "Átadva" && ticketRemaining(t) > 0) {
      setHandoverPrompt(t);
    } else {
      onStatusChange(t.id, na.status, na.subStatus);
    }
  }

  const probsOf = (t) => (t.issue || "").split(",").map((p) => p.trim()).filter(Boolean);
  // Állapotsáv (Probléma és Státusz között): beázás, garanciális, fólia, ígért határidő —
  // egységes színes ikonokkal, hogy egy pillantásra látszódjon minden munkalapon. A 90+
  // napja átvehető, de el nem vitt munkalapokat is az "ígért határidő" jelzésbe soroljuk,
  // mert azok is azonnali odafigyelést igényelnek.
  const flagsOf = (t) => {
    const sla = slaInfo(t) || (isStaleReady(t) ? { level: "overdue", label: "90+ napja" } : null);
    const partWait = t.status === "Átvett" && (t.subStatus === "Alkatrészre vár" || t.subStatus === "Alkatrészre és készülékre vár");
    const deviceWait = t.status === "Átvett" && (t.subStatus === "Készülékre vár" || t.subStatus === "Alkatrészre és készülékre vár");
    return (
      <>
        {(probsOf(t).includes("Beázás") || t.waterDamage) && (
          <span className="svc-flag-chip svc-flag-water">Ázott</span>
        )}
        {t.isWarranty && (
          <span className="svc-flag-chip svc-flag-warranty" title={t.warrantyKind === "termék" ? "Garanciális — termék" : "Garanciális — szerviz"}>Garanciális</span>
        )}
        {partWait && (
          <span className="svc-flag-chip svc-flag-part">Alkatrészre vár</span>
        )}
        {deviceWait && (
          <span className="svc-flag-chip svc-flag-device">Készülékre vár</span>
        )}
        {t.folia && (
          <span className="svc-flag-chip svc-flag-folia">Fóliát kér</span>
        )}
        {sla && (
          <span className={`svc-flag-chip svc-flag-due-${sla.level}`}>{sla.label}</span>
        )}
      </>
    );
  };
  const daysOf = (t) => <DayChip days={daysOnShelf(t.dateIn)} />;
  const kliensOf = (t) => {
    if (t.ticketKind === "Saját készlet - előkészítés") {
      return <span className="t-kind-pill" style={{ background: "#F1F5F9", color: "#475569" }}><ServiceIcon width={11} height={11} />Saját — előkészítés</span>;
    }
    if (t.ticketKind === "Saját készlet - garanciális") {
      return <span className="t-kind-pill" style={{ background: "#FCE7F3", color: "#BE185D" }}><WarrantyIcon width={11} height={11} />Saját — garanciális</span>;
    }
    return titleCase(t.customerName) || "—";
  };
  const isPartDeviceWait = (t) => t.status === "Átvett" && (t.subStatus === "Alkatrészre vár" || t.subStatus === "Készülékre vár" || t.subStatus === "Alkatrészre és készülékre vár");
  const statusClsOf = (t) => (t.subStatus && !isPartDeviceWait(t) ? subStatusCls(t.status, t.subStatus) : statusCls(t.status));
  const statusLabelOf = (t) => (t.subStatus && !isPartDeviceWait(t) ? subStatusLabel(t.status, t.subStatus) : statusLabel(t.status));
  const dotColorOf = (t) => (t.subStatus === "Sikertelen" ? SIKERTELEN_DOT_COLOR : STATUS_DOT_COLOR[t.status] || "#6B7280");
  const statusPill = (t) => (t.subStatus && !isPartDeviceWait(t) ? (
    <span className={`st st-fill ${subStatusCls(t.status, t.subStatus)}`}>{subStatusLabel(t.status, t.subStatus)}</span>
  ) : (
    <span className={`st st-fill ${statusCls(t.status)}`}>{statusLabel(t.status)}</span>
  ));
  const TICKET_COLUMNS = [
    { key: "n", label: "Szám", className: "col-serial" },
    {
      key: "i",
      label: (
        <button
          type="button"
          onClick={() => setDateSort((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"))}
          style={{ display: "flex", alignItems: "center", gap: 3, background: "none", border: "none", padding: 0, font: "inherit", color: "inherit", cursor: "pointer" }}
        >
          Bejött
          {dateSort && <ChevronDownIcon width={10} height={10} style={{ transform: dateSort === "asc" ? "rotate(180deg)" : "none" }} />}
        </button>
      ),
    },
    { key: "d", label: "Eszköz" }, { key: "p", label: "Probléma", className: "col-grow" }, { key: "c", label: "Kliens" },
    { key: "s", label: "Státusz", className: "col-status" }, { key: "a", label: "Ár", className: "num-col" }, { key: "x", label: "" },
  ];
  const renderTicketRow = (t) => t.__newRow ? (
    <NewTicketRow
      key="__new__"
      open={addOpen}
      customers={customers}
      defaultLocId={defaultLocId}
      busy={busy}
      onCancel={closeAddRow}
      onCreate={async (data, locId) => {
        const created = await onCreateTicket(data, locId);
        if (created) closeAddRow();
      }}
    />
  ) : (
    <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => setDetailId(t.id)}>
      <td className="mono col-serial" style={{ color: "#9CA3AF", whiteSpace: "nowrap" }}>{ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))}</td>
      <td>{daysOf(t)}</td>
      <td style={{ whiteSpace: "nowrap" }}><span className="stk-name">{displayName(t.brand, t.model) || "—"}</span></td>
      <td>
        <div className="svc-flags">
          {probsOf(t).map((p, i) => <span key={i} className="prob-pill">{p}</span>)}
          {flagsOf(t)}
        </div>
      </td>
      <td style={{ whiteSpace: "nowrap" }}>{kliensOf(t)}</td>
      <td className="col-status" style={{ whiteSpace: "nowrap" }}>
        <StatusPicker ticket={t} dotColor={dotColorOf(t)} label={statusLabelOf(t)} disabled={busy} onChange={onStatusChange} />
      </td>
      <td className="row-price" style={{ color: (Number(t.depositPaid) || 0) > 0 ? undefined : (Number(t.price) || 0) === 0 ? "#9CA3AF" : undefined }}>
        {(Number(t.depositPaid) || 0) > 0 ? (
          <>
            {money(ticketRemaining(t))}
            <div className="row-price-sub">-{money(t.depositPaid)} előleg</div>
          </>
        ) : money(t.price)}
      </td>
      <td className="stk-actions" onClick={(e) => e.stopPropagation()}>
        {onPrint && t.status !== "Átvett" && (
          <button className="btn sec sm icon-only" disabled={busy} title="Nyomtatás" onClick={() => onPrint(t)}>
            <PrintIcon width={13} height={13} />
          </button>
        )}
        {t.status === "Átvett" && onAddPart ? (
          <PartAddPopover ticket={t} parts={parts} onAddPart={onAddPart} disabled={busy} />
        ) : nextActionOf(t) && (() => {
          const na = nextActionOf(t);
          return (
            <button className="btn sec sm icon-only" disabled={busy} title={na.title} onClick={() => runAction(t, na)}>
              <na.icon width={13} height={13} />
            </button>
          );
        })()}
      </td>
    </tr>
  );
  const renderTicketMobileRow = (t) => t.__newRow ? null : (
    <div className="mob-row svc-row-lg mob-row-coded" onClick={() => setDetailId(t.id)}>
      <div className={`mob-code-col ${statusClsOf(t)}`}>
        {String(t.ticketNo).split("").map((ch, i) => <span key={i}>{ch}</span>)}
      </div>
      <div className="mob-row-content">
        <div className="mob-row-top">
          <div className="mob-row-main" style={{ fontSize: 13, gap: 9 }}>
            <span style={{ flex: 1, minWidth: 0 }}>{displayName(t.brand, t.model) || "—"}</span>
            <span style={{ flexShrink: 0 }}>{statusPill(t)}</span>
          </div>
          <div className="mob-row-amount" style={{ fontSize: 13 }}>
            {money((Number(t.depositPaid) || 0) > 0 ? ticketRemaining(t) : t.price)}
          </div>
        </div>
        <div className="mob-row-sub" style={{ marginTop: 13, fontSize: 12.5 }}>
          <span>{kliensOf(t)}</span>
          <span>{daysOf(t)}</span>
        </div>
        {(probsOf(t).length > 0 || nextActionOf(t)) && (
          <div className="svc-probs" style={{ marginTop: -5.5, flexWrap: "wrap", alignItems: "flex-end", overflow: "visible", gap: 5 }}>
            {probsOf(t).length > 0 && (
              <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{probsOf(t).join(", ")}</span>
            )}
            <span style={{ marginLeft: 6 }}>{flagsOf(t)}</span>
            {nextActionOf(t) && (() => {
              const na = nextActionOf(t);
              return (
                <button
                  className="btn sec sm icon-only"
                  style={{ marginLeft: "auto", boxShadow: "none", width: 40, height: 33.5, padding: 0, borderRadius: 999, justifyContent: "center" }}
                  disabled={busy}
                  title={na.title}
                  onClick={(e) => { e.stopPropagation(); runAction(t, na); }}
                >
                  <na.icon width={13} height={13} />
                </button>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="apple-page">
      <div className="filter-row svc-filter-row">
        <button
          type="button"
          className={`history-toolbar-btn${showHandedOver ? " active" : ""}`}
          style={{ marginLeft: 0 }}
          onClick={() => setShowHandedOver((v) => !v)}
          title="Átadott munkák"
        >
          <MoreIcon className="history-toolbar-btn-dots" width={16} height={16} />
          <span className="history-toolbar-btn-text">Átadott munkák <span className="cnt">{handedOverTickets.length}</span></span>
        </button>
        {onScan && <button type="button" className="btn sec scan-trigger" onClick={onScan} title="QR/vonalkód szkennelése"><ScanIcon width={16} height={16} /></button>}
        <div className="searchbar" style={{ marginLeft: "auto" }}><SearchIcon /><input value={svcSearch} onChange={(e) => setSvcSearch(e.target.value)} /></div>
        <button type="button" className="btn header-add-btn" disabled={busy || addMounted} title="Új munkalap" onClick={openAddRow}>
          <span className="header-add-ring" /><span className="header-add-ring ring2" />
          <PlusIcon width={16} height={16} className={addAnimPhase === "dropping" ? "svc-plus-drop" : addAnimPhase === "popping" ? "svc-plus-pop" : ""} />
        </button>
      </div>

      {showHandedOver && (
        <div className="tw tw-apple svc-table" style={{ marginBottom: 16 }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #F3F4F6" }}>
            <div className="searchbar" style={{ margin: 0, maxWidth: "none" }}>
              <SearchIcon width={13} height={13} />
              <input value={handedOverQuery} onChange={(e) => setHandedOverQuery(e.target.value)} placeholder="Keresés..." autoFocus />
            </div>
          </div>
          {(() => {
            const q = handedOverQuery.trim().toLowerCase();
            const rows = q
              ? handedOverTickets.filter((t) => [t.customerName, t.brand, t.model, ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))].filter(Boolean).join(" ").toLowerCase().includes(q))
              : handedOverTickets;
            if (rows.length === 0) return <EmptyState icon={ServiceIcon}>Nincs találat.</EmptyState>;
            return (
              <ResponsiveTable
                wrap={false}
                columns={TICKET_COLUMNS}
                rows={rows}
                rowKey={(t) => t.id}
                renderRow={renderTicketRow}
                renderMobileRow={renderTicketMobileRow}
              />
            );
          })()}
        </div>
      )}

      {!showHandedOver && (
        <div className={`tw tw-apple svc-table svc-table-ripple${tableRipple ? " pulse" : ""}`}>
        {loadingData ? <LoadingState /> : (
          (() => {
            const items = dateSort
              ? [...activeTickets].sort((a, b) => (dateSort === "asc" ? (a.dateIn || "").localeCompare(b.dateIn || "") : (b.dateIn || "").localeCompare(a.dateIn || "")))
              : [...activeTickets].sort((a, b) => {
                  const byStatus = STATUS_KEYS.indexOf(a.status) - STATUS_KEYS.indexOf(b.status);
                  if (byStatus !== 0) return byStatus;
                  return (daysOnShelf(a.dateIn) ?? -1) - (daysOnShelf(b.dateIn) ?? -1);
                });
            const rows = addMounted ? [{ id: "__new__", __newRow: true }, ...items] : items;
            if (rows.length === 0) return <EmptyState icon={ServiceIcon}>Nincs munkalap.</EmptyState>;
            return (
              <ResponsiveTable
                wrap={false}
                columns={TICKET_COLUMNS}
                rows={rows}
                rowKey={(t) => t.id}
                renderRow={renderTicketRow}
                renderMobileRow={renderTicketMobileRow}
              />
            );
          })()
        )}
        </div>
      )}
      {handoverPrompt && (
        <HandoverPaymentModal
          ticket={handoverPrompt}
          busy={busy}
          onClose={() => setHandoverPrompt(null)}
          onConfirm={(payment, cash, card) => {
            onStatusChange(handoverPrompt.id, handoverPrompt.status, "Átadva", payment, cash, card);
            setHandoverPrompt(null);
          }}
        />
      )}
    </div>
  );
}
