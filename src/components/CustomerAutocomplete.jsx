import { useState, useMemo } from "react";

export default function CustomerAutocomplete({ customers, name, onChangeName, onSelect, placeholder = "Kovács János" }) {
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter((c) => (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q))
      .slice(0, 6);
  }, [customers, name]);

  return (
    <div style={{ position: "relative" }}>
      <input
        value={name}
        onChange={(e) => { onChangeName(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
      />
      {open && matches.length > 0 && (
        <div className="autocomplete-list">
          {matches.map((c) => (
            <div
              key={c.id}
              className="autocomplete-item"
              onMouseDown={() => { onSelect(c); setOpen(false); }}
            >
              <span>{c.name || "Névtelen"}</span>
              <span className="mono" style={{ color: "#9CA3AF" }}>{c.phone}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
