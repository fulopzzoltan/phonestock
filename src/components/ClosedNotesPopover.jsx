import { useState, useRef, useEffect } from "react";

// Ugyanaz a kebab-gomb + felugró lista minta, mint a Rendelések kártyán a lezárt
// tételeknél — itt az elintézett cetliket mutatja egyszerű, rövidített sorokban.
export default function ClosedNotesPopover({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="wl-closed-wrap" ref={ref}>
      <button type="button" className="wl-kebab" title="Elintézett cetlik" onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
      </button>
      {open && (
        <div className="wl-closed-pop">
          <div className="h">Elintézett cetlik</div>
          {items.length === 0 ? (
            <div className="wl-closed-empty">Nincs még elintézett cetli.</div>
          ) : items.map((n) => (
            <div key={n.id} className="wl-closed-row">
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.body}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
