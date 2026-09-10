import { useState } from "react";
import { ChevronDownIcon } from "./icons";
import { EmptyState } from "./EmptyState";

// hideToggle: amikor egy külső (pl. eszköztárba kitett) gomb vezérli a nyitást —
// ilyenkor `open`/`onToggle` kötelező, és a komponens csak a tartalmat rendereli,
// saját gomb és külső margó nélkül, hogy a hívó fél kártyájába simuljon.
export default function HistorySection({ icon: Icon, label, items, filterFn, children, defaultOpen = false, className = "", hideToggle = false, open: openProp, onToggle }) {
  const [openState, setOpenState] = useState(defaultOpen);
  const open = hideToggle ? openProp : openState;
  const setOpen = hideToggle ? onToggle : setOpenState;
  const [q, setQ] = useState("");
  const shown = q.trim() && filterFn ? items.filter((it) => filterFn(it, q.trim().toLowerCase())) : items;

  const body = open && (
    <div className={`tw${className ? ` ${className}` : ""}`} style={hideToggle ? undefined : { marginTop: 10 }}>
      {items.length > 6 && filterFn && (
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #F3F4F6" }}>
          <div className="searchbar" style={{ margin: 0, maxWidth: "none" }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
        </div>
      )}
      {shown.length === 0 ? <EmptyState icon={Icon}>Nincs találat.</EmptyState> : children(shown)}
    </div>
  );

  if (hideToggle) return body || null;

  return (
    <div style={{ marginTop: 14 }}>
      <button type="button" className="history-toggle" onClick={() => setOpen((v) => !v)}>
        <Icon width={14} height={14} />
        <span>{label} ({items.length})</span>
        <ChevronDownIcon style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : undefined }} />
      </button>
      {body}
    </div>
  );
}
