import { useState } from "react";
import { ChevronDownIcon } from "./icons";
import { EmptyState } from "./EmptyState";

export default function HistorySection({ icon: Icon, label, items, filterFn, children, defaultOpen = false, className = "", attached = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [q, setQ] = useState("");
  const shown = q.trim() && filterFn ? items.filter((it) => filterFn(it, q.trim().toLowerCase())) : items;

  const body = (
    <>
      {items.length > 6 && filterFn && (
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #F3F4F6" }}>
          <div className="searchbar" style={{ margin: 0, maxWidth: "none" }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      )}
      {shown.length === 0 ? <EmptyState icon={Icon}>Nincs találat.</EmptyState> : children(shown)}
    </>
  );

  const toggle = (
    <button type="button" className={`history-toggle${attached ? " history-toggle-attached" : ""}`} onClick={() => setOpen((v) => !v)}>
      <Icon width={14} height={14} />
      <span>{label} ({items.length})</span>
      <ChevronDownIcon style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : undefined }} />
    </button>
  );

  if (attached) {
    return (<>{toggle}{open && body}</>);
  }

  return (
    <div style={{ marginTop: 14 }}>
      {toggle}
      {open && <div className={`tw${className ? ` ${className}` : ""}`} style={{ marginTop: 10 }}>{body}</div>}
    </div>
  );
}
