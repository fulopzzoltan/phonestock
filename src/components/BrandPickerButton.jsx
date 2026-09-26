import { useState, useRef, useEffect } from "react";
import { PHONE_BRANDS } from "../lib/utils";
import { ChevronDownIcon } from "./icons";

// Márka-választó gomb inline sorokhoz (Szerviz "Új munkalap", Telefonok "Új termék") — ugyanaz
// a lista/"Egyéb" logika, mint a BrandField-nél (nincs elgépelés a gyakori márkáknál), csak a
// sor "cella"-stílusához (svc-nr-top) igazított kinézettel, felirat nélkül, mert az oszlopfejléc
// már jelzi, mi ez a mező.
export default function BrandPickerButton({ value, onChange, disabled }) {
  const knownCustom = value !== "" && !PHONE_BRANDS.includes(value);
  const [customPicked, setCustomPicked] = useState(knownCustom);
  const isCustom = customPicked || knownCustom;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q ? PHONE_BRANDS.filter((b) => b.toLowerCase().includes(q)) : PHONE_BRANDS;
  const label = isCustom ? "Egyéb" : value;

  return (
    <div>
      <div style={{ position: "relative" }} ref={ref}>
        <button
          type="button" disabled={disabled} onClick={() => setOpen((v) => !v)}
          className="svc-nr-top" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, cursor: "pointer" }}
        >
          <span style={{ color: label ? "#111827" : "#ADB1B8" }}>{label ? (label === "Apple" ? "iPhone" : label) : "Márka"}</span>
          <ChevronDownIcon width={11} height={11} style={{ color: "#9CA3AF", flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .12s" }} />
        </button>
        {open && (
          <div className="autocomplete-list" style={{ padding: 5 }}>
            <input
              autoFocus type="text" placeholder="Keresés..." value={query} onChange={(e) => setQuery(e.target.value)}
              style={{ width: "100%", marginBottom: 4, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "7px 9px", fontFamily: "inherit", fontSize: 12.5, boxSizing: "border-box" }}
            />
            {filtered.map((b) => (
              <div
                key={b} className="autocomplete-item" style={{ borderRadius: 7, background: b === value || (b === "Egyéb" && isCustom) ? "#F3F4F6" : undefined }}
                onClick={() => { setCustomPicked(b === "Egyéb"); onChange(b === "Egyéb" ? "" : b); setOpen(false); setQuery(""); }}
              >
                {b === "Apple" ? "iPhone" : b}
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: "9px 12px", fontSize: 12.5, color: "#9CA3AF" }}>Nincs találat</div>}
          </div>
        )}
      </div>
      {isCustom && (
        <input autoFocus className="svc-nr-top" style={{ marginTop: 6 }} placeholder="Márka neve" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      )}
    </div>
  );
}
