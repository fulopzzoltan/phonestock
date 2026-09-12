import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, CheckIcon } from "./icons";

// Rövid (max ~4 opciós) választók — minden lehetőség egyszerre látszik, egy kattintás.
export function ChipField({ label, hint, value, onChange, options }) {
  return (
    <div className="field">
      <label>{label} {hint}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((o) => (
          <button
            key={o.key ?? "__null"}
            type="button"
            className={`prob-tag${value === o.key ? " active" : ""}`}
            onClick={() => onChange(o.key)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Hosszabb vagy dinamikus (pl. felhasználó-) listákhoz — kompakt marad, mint egy select,
// de a kinyíló lista saját stílusú, nem a böngésző natívja.
export function DropdownField({ label, hint, value, onChange, options, placeholder = "—" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      searchRef.current?.focus();
    }
  }, [open]);

  const current = options.find((o) => o.key === value);
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  return (
    <div className="field" ref={ref} style={{ position: "relative" }}>
      <label>{label} {hint}</label>
      <button type="button" className="dd-trigger" onClick={() => setOpen((v) => !v)}>
        <span style={{ color: current ? "#111827" : "#9CA3AF" }}>{current ? current.label : placeholder}</span>
        <ChevronDownIcon style={{ color: "#9CA3AF", flexShrink: 0, transition: "transform .12s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div className="autocomplete-list">
          {options.length > 6 && (
            <input
              ref={searchRef}
              className="dd-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Keresés..."
              onMouseDown={(e) => e.stopPropagation()}
            />
          )}
          {filtered.length === 0 && <div className="autocomplete-empty">Nincs találat</div>}
          {filtered.map((o) => {
            const active = o.key === value;
            return (
              <div
                key={o.key ?? "__null"}
                className="autocomplete-item"
                style={active ? { background: "var(--primary-soft)", color: "var(--primary-ink)", fontWeight: 700 } : undefined}
                onMouseDown={() => { onChange(o.key); setOpen(false); }}
              >
                <span>{o.label}</span>
                {active && <CheckIcon width={14} height={14} style={{ flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
