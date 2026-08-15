import { useState } from "react";
import { ChevronDownIcon } from "./icons";
import { EmptyState } from "./EmptyState";

export default function HistorySection({ icon: Icon, label, items, searchPlaceholder, filterFn, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [q, setQ] = useState("");
  const shown = q.trim() && filterFn ? items.filter((it) => filterFn(it, q.trim().toLowerCase())) : items;

  return (
    <div style={{ marginTop: 14 }}>
      <button type="button" className="history-toggle" onClick={() => setOpen((v) => !v)}>
        <Icon width={14} height={14} />
        <span>{label} ({items.length})</span>
        <ChevronDownIcon style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : undefined }} />
      </button>
      {open && (
        <div className="tw" style={{ marginTop: 10 }}>
          {items.length > 6 && filterFn && (
            <div style={{ padding: "10px 12px", borderBottom: "1px solid #F3F4F6" }}>
              <div className="searchbar" style={{ margin: 0, maxWidth: "none" }}>
                <input placeholder={searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>
          )}
          {shown.length === 0 ? <EmptyState icon={Icon}>Nincs találat.</EmptyState> : children(shown)}
        </div>
      )}
    </div>
  );
}
