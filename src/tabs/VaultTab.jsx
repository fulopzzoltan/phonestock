import { useState, useMemo, useRef } from "react";
import { SearchIcon, LockIcon, ExternalLinkIcon, EditIcon, TrashIcon, ClockIcon } from "../components/icons";
import { EmptyState, LoadingState } from "../components/EmptyState";
import VaultCredentialModal from "../components/VaultCredentialModal";

// Cég belépések ("Belépések" fül) — a jelszavak titkosítva, a Supabase beépített
// Vault-jában (libsodium) tárolódnak, sosem nyílt szövegként ebben a listában. Egy jelszó
// megjelenítése mindig egy külön hálózati hívás (reveal_vault_credential RPC), ami
// szerveroldalon ellenőrzi a jogosultságot ÉS naplóz — ezért a "Mutat" gomb minden
// alkalommal újra lekéri, nem cache-eli hosszú távra.
const REVEAL_HIDE_MS = 20000;

export default function VaultTab({ credentials, isAdmin, users, onCreate, onUpdateMeta, onChangePassword, onDelete, onReveal, onLoadAccessLog }) {
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modal, setModal] = useState(null); // null | "add" | credential obj
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [revealed, setRevealed] = useState({}); // id -> password
  const [revealBusy, setRevealBusy] = useState({}); // id -> boolean
  const [revealError, setRevealError] = useState({}); // id -> message
  const [copiedId, setCopiedId] = useState(null);
  const [logFor, setLogFor] = useState(null); // credential obj
  const [logEntries, setLogEntries] = useState(null);
  const [logLoading, setLogLoading] = useState(false);
  const hideTimers = useRef({});

  const categories = useMemo(() => {
    const set = new Set(credentials.map((c) => c.category).filter(Boolean));
    return Array.from(set).sort();
  }, [credentials]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return credentials.filter((c) => {
      if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
      if (!qq) return true;
      return [c.siteName, c.username, c.siteUrl, c.category].filter(Boolean).join(" ").toLowerCase().includes(qq);
    });
  }, [credentials, q, categoryFilter]);

  function userName(id) {
    const u = users.find((x) => x.id === id);
    return u?.fullName || u?.email || "Ismeretlen";
  }

  function scheduleHide(id) {
    clearTimeout(hideTimers.current[id]);
    hideTimers.current[id] = setTimeout(() => {
      setRevealed((prev) => { const next = { ...prev }; delete next[id]; return next; });
    }, REVEAL_HIDE_MS);
  }

  async function handleReveal(id) {
    if (revealed[id]) {
      // már látszik — inkább rejtsük el, ne kérjünk le újra feleslegesen
      clearTimeout(hideTimers.current[id]);
      setRevealed((prev) => { const next = { ...prev }; delete next[id]; return next; });
      return;
    }
    setRevealBusy((prev) => ({ ...prev, [id]: true }));
    setRevealError((prev) => ({ ...prev, [id]: "" }));
    try {
      const pw = await onReveal(id);
      setRevealed((prev) => ({ ...prev, [id]: pw }));
      scheduleHide(id);
    } catch (err) {
      setRevealError((prev) => ({ ...prev, [id]: err.message || "Nem sikerült." }));
    } finally {
      setRevealBusy((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleCopy(id) {
    try {
      let pw = revealed[id];
      if (!pw) {
        setRevealBusy((prev) => ({ ...prev, [id]: true }));
        pw = await onReveal(id);
        setRevealBusy((prev) => ({ ...prev, [id]: false }));
      }
      await navigator.clipboard.writeText(pw);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
    } catch (err) {
      setRevealError((prev) => ({ ...prev, [id]: err.message || "Nem sikerült a másolás." }));
      setRevealBusy((prev) => ({ ...prev, [id]: false }));
    }
  }

  function copyUsername(username, id) {
    navigator.clipboard.writeText(username || "");
    setCopiedId(`u-${id}`);
    setTimeout(() => setCopiedId((prev) => (prev === `u-${id}` ? null : prev)), 1800);
  }

  async function submitModal(f) {
    setBusy(true);
    try {
      if (modal === "add") {
        await onCreate(f);
      } else {
        await onUpdateMeta(modal.id, f);
      }
      setModal(null);
    } finally {
      setBusy(false);
    }
  }

  async function openLog(c) {
    setLogFor(c);
    setLogEntries(null);
    setLogLoading(true);
    try {
      const rows = await onLoadAccessLog(c.id);
      setLogEntries(rows);
    } finally {
      setLogLoading(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Belépések</div></div>
        {isAdmin && <button type="button" className="btn" onClick={() => setModal("add")}>+ Új belépés</button>}
      </div>

      <div className="filter-row">
        <div className="searchbar"><SearchIcon /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés név, felhasználónév, oldal szerint..." /></div>
        {categories.length > 0 && (
          <div className="status-seg">
            <button className={categoryFilter === "all" ? "active" : ""} onClick={() => setCategoryFilter("all")}>Mind</button>
            {categories.map((cat) => (
              <button key={cat} className={categoryFilter === cat ? "active" : ""} onClick={() => setCategoryFilter(cat)}>{cat}</button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={LockIcon}>
          {credentials.length === 0 ? "Még nincs elmentett belépés." : "Nincs találat a szűrésre."}
        </EmptyState>
      ) : (
        <div className="vault-list">
          {filtered.map((c) => (
            <div key={c.id} className="vault-card">
              <div className="vault-card-head">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {c.siteName}
                    {c.category && <span className="badge-loc">{c.category}</span>}
                    <span className={`st ${c.visibility === "everyone" ? "st-kesz" : "st-kiadva"}`}>
                      {c.visibility === "everyone" ? "Minden alkalmazott" : "Csak admin"}
                    </span>
                  </div>
                  {c.siteUrl && (
                    <a href={c.siteUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: "#6B7280", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <ExternalLinkIcon width={11} height={11} />{c.siteUrl.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
                {isAdmin && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button className="iconbtn" title="Ki nézte meg" onClick={() => openLog(c)}><ClockIcon width={15} height={15} /></button>
                    <button className="iconbtn" title="Szerkesztés" onClick={() => setModal(c)}><EditIcon width={15} height={15} /></button>
                    {confirmDeleteId === c.id ? (
                      <>
                        <button className="btn sec sm" onClick={() => setConfirmDeleteId(null)}>Mégse</button>
                        <button className="btn sm" style={{ background: "#B91C1C" }} onClick={() => { onDelete(c.id); setConfirmDeleteId(null); }}>Törlés</button>
                      </>
                    ) : (
                      <button className="iconbtn" title="Törlés" onClick={() => setConfirmDeleteId(c.id)}><TrashIcon width={15} height={15} /></button>
                    )}
                  </div>
                )}
              </div>

              <div className="vault-card-rows">
                <div className="vault-row">
                  <span className="vault-row-label">Felhasználó</span>
                  <span className="vault-row-value mono">{c.username || "—"}</span>
                  {c.username && (
                    <button className="btn sec sm" onClick={() => copyUsername(c.username, c.id)}>{copiedId === `u-${c.id}` ? "Másolva ✓" : "Másol"}</button>
                  )}
                </div>
                <div className="vault-row">
                  <span className="vault-row-label">Jelszó</span>
                  <span className="vault-row-value mono">{revealed[c.id] || "••••••••••"}</span>
                  <button className="btn sec sm" disabled={revealBusy[c.id]} onClick={() => handleReveal(c.id)}>
                    {revealBusy[c.id] ? "..." : revealed[c.id] ? "Elrejt" : "Mutat"}
                  </button>
                  <button className="btn sec sm" disabled={revealBusy[c.id]} onClick={() => handleCopy(c.id)}>
                    {copiedId === c.id ? "Másolva ✓" : "Másol"}
                  </button>
                </div>
                {revealError[c.id] && <div className="errbar" style={{ marginTop: 4 }}>{revealError[c.id]}</div>}
                {c.notes && <div className="vault-row-notes">{c.notes}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <VaultCredentialModal
          credential={modal === "add" ? null : modal}
          busy={busy}
          onClose={() => setModal(null)}
          onSave={submitModal}
          onChangePassword={(pw) => onChangePassword(modal.id, pw)}
        />
      )}

      {logFor && (
        <div className="overlay" onClick={() => setLogFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2>Megtekintési napló <button className="iconbtn" onClick={() => setLogFor(null)}>×</button></h2>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10 }}>{logFor.siteName}</div>
            {logLoading ? (
              <LoadingState />
            ) : !logEntries || logEntries.length === 0 ? (
              <EmptyState icon={ClockIcon}>Ezt a jelszót még senki nem nézte meg.</EmptyState>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                {logEntries.map((e) => (
                  <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, borderBottom: "1px solid #F3F4F6", paddingBottom: 6 }}>
                    <span>{userName(e.viewedBy)}</span>
                    <span className="mono" style={{ color: "#6B7280" }}>{new Date(e.viewedAt).toLocaleString("hu-HU")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
