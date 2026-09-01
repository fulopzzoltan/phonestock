import { useState, useRef, useEffect, useMemo } from "react";
import { SettingsIcon, LogoutIcon, PinIcon, ChevronDownIcon, ExternalLinkIcon, ChatIcon, SearchIcon } from "./icons";
import { SITE_URL, displayName, phoneCode, ticketCode, partCode, normalizeImei, formatPhone } from "../lib/utils";

// Globális kereső: egyszerre keres a Készlet, Szerviz, Ügyfelek, Alkatrészek és
// Garanciák között — mert a fülenkénti keresők csak a saját listájukban látnak,
// és a leggyakoribb napi kérdés ("hol van ez a Kovács Jánosnak a telefonja")
// pont ezt igényelné. Max néhány találat kategóriánként, hogy ne váljon átláthatatlanná.
function useGlobalSearch(query, { stock, tickets, customersTable, parts, warranties }) {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const imeiQ = normalizeImei(query);
    const results = [];

    stock.filter((p) => {
      const hay = [p.brand, p.model, p.imei, phoneCode(p.productNo)].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q) || (imeiQ.length >= 6 && normalizeImei(p.imei) === imeiQ);
    }).slice(0, 5).forEach((p) => results.push({
      type: "product", id: p.id,
      title: displayName(p.brand, p.model), sub: `Készlet · ${phoneCode(p.productNo) || "—"}${p.imei ? ` · ${p.imei}` : ""}`,
    }));

    tickets.filter((t) => {
      const hay = [t.customerName, t.brand, t.model, t.imei, ticketCode(t.ticketNo, "")].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q) || (imeiQ.length >= 6 && normalizeImei(t.imei) === imeiQ);
    }).slice(0, 5).forEach((t) => results.push({
      type: "ticket", id: t.id,
      title: `${t.customerName || "—"} — ${displayName(t.brand, t.model) || "—"}`, sub: `Szerviz · #${t.ticketNo ?? "—"}`,
    }));

    customersTable.filter((c) => [c.name, c.phone].filter(Boolean).join(" ").toLowerCase().includes(q))
      .slice(0, 5).forEach((c) => results.push({
        type: "customer", id: c.id,
        title: c.name || "Névtelen", sub: `Ügyfél${c.phone ? ` · ${formatPhone(c.phone)}` : ""}`,
      }));

    parts.filter((p) => [p.name, p.brand, p.modelFit, partCode(p.partNo)].filter(Boolean).join(" ").toLowerCase().includes(q))
      .slice(0, 5).forEach((p) => results.push({
        type: "part", id: p.id,
        title: p.name, sub: `Alkatrész${[p.brand, p.modelFit].filter(Boolean).length ? ` · ${[p.brand, p.modelFit].filter(Boolean).join(", ")}` : ""}`,
      }));

    warranties.filter((w) => [w.customerName, w.label].filter(Boolean).join(" ").toLowerCase().includes(q))
      .slice(0, 5).forEach((w) => results.push({
        type: "warranty", id: w.key,
        title: w.customerName || "—", sub: `Garancia · ${w.label || "—"}`,
      }));

    return results.slice(0, 20);
  }, [query, stock, tickets, customersTable, parts, warranties]);
}

function GlobalSearch({ stock, tickets, customersTable, parts, warranties, onOpenProduct, onOpenTicket, onOpenCustomer, onOpenPart, onOpenWarranty }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const results = useGlobalSearch(query, { stock, tickets, customersTable, parts, warranties });

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pick(r) {
    if (r.type === "product") onOpenProduct(r.id);
    else if (r.type === "ticket") onOpenTicket(r.id);
    else if (r.type === "customer") onOpenCustomer(r.id);
    else if (r.type === "part") onOpenPart(r.id);
    else if (r.type === "warranty") onOpenWarranty(r.id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="ctb-search-wrap" ref={wrapRef}>
      <div className="ctb-search">
        <SearchIcon width={13} height={13} />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Keresés — ügyfél, IMEI, munkalap, termék..."
        />
      </div>
      {open && query.trim().length >= 2 && (
        <div className="ctb-search-menu">
          {results.length === 0 ? (
            <div className="ctb-search-empty">Nincs találat.</div>
          ) : results.map((r) => (
            <div key={`${r.type}-${r.id}`} className="ctb-search-item" onClick={() => pick(r)}>
              <span className="ctb-search-title">{r.title}</span>
              <span className="ctb-search-sub">{r.sub}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// A korábban a Sidebar tetején/alján lévő helyszín-választó, webshop-link, chat-nyitó
// és felhasználói blokk — ide költözött, hogy a Sidebar csak navigáció maradjon, és
// ezek az elemek a tartalom-hasáb tetején, oldal-fejléc fölött legyenek elérhetők.
export default function ContentTopbar({
  tab, setTab, isAdmin, locFilter, setLocFilter, allowedLocations, myLocationId, locName,
  profile, user, signOut, chatOpen, setChatOpen, chatUnread, markChatRead, pageHeader,
  stock, tickets, customersTable, parts, warranties, onOpenProduct, onOpenTicket, onOpenCustomer, onOpenPart, onOpenWarranty,
}) {
  const [locMenuOpen, setLocMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const locMenuRef = useRef(null);
  const userMenuRef = useRef(null);
  const hasSearchData = stock && tickets && customersTable && parts && warranties;

  useEffect(() => {
    function onClickOutside(e) {
      if (locMenuRef.current && !locMenuRef.current.contains(e.target)) setLocMenuOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const roleLabel = (() => {
    const name = profile?.fullName || "";
    if (name === "Fulop Zoltan") return "Patron";
    if (name === "Gercui Kinga") return "Legjobb Értékesítő";
    return isAdmin ? "Admin" : "Alkalmazott";
  })();

  const currentLocLabel = isAdmin
    ? (locFilter === "all" ? "Mind" : (allowedLocations.find((l) => l.id === locFilter)?.name || "Mind"))
    : (myLocationId ? locName(myLocationId) : "Nincs helyszín");

  return (
    <div className="content-topbar">
      {pageHeader}
      <div className="ctb-spacer" />

      {hasSearchData && (
        <GlobalSearch
          stock={stock} tickets={tickets} customersTable={customersTable} parts={parts} warranties={warranties}
          onOpenProduct={onOpenProduct} onOpenTicket={onOpenTicket} onOpenCustomer={onOpenCustomer} onOpenPart={onOpenPart} onOpenWarranty={onOpenWarranty}
        />
      )}

      {isAdmin ? (
        <div className="loc-drop-wrap" ref={locMenuRef}>
          <button type="button" className="loc-drop" onClick={() => setLocMenuOpen((v) => !v)}>
            <span className="loc-drop-left"><PinIcon width={12} height={12} />{currentLocLabel}</span>
            <ChevronDownIcon width={10} height={10} />
          </button>
          {locMenuOpen && (
            <div className="loc-drop-menu">
              <button type="button" className={`loc-drop-item${locFilter === "all" ? " active" : ""}`} onClick={() => { setLocFilter("all"); setLocMenuOpen(false); }}>Mind</button>
              {allowedLocations.map((l) => (
                <button key={l.id} type="button" className={`loc-drop-item${locFilter === l.id ? " active" : ""}`} onClick={() => { setLocFilter(l.id); setLocMenuOpen(false); }}>{l.name}</button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="loc-drop static"><span className="loc-drop-left"><PinIcon width={12} height={12} />{currentLocLabel}</span></div>
      )}

      <a className="util-icon-btn" href={SITE_URL} target="_blank" rel="noopener noreferrer" title="Webshop megtekintése">
        <ExternalLinkIcon width={14} height={14} />
      </a>

      <button
        type="button"
        className="util-icon-btn ctb-chat-btn"
        title="Csapat-chat"
        onClick={() => { setChatOpen((o) => !o); if (!chatOpen) markChatRead(); }}
      >
        <ChatIcon width={15} height={15} />
        {chatUnread > 0 && <span className="ctb-chat-badge">{chatUnread > 9 ? "9+" : chatUnread}</span>}
      </button>

      <div className="user-chip-wrap" ref={userMenuRef}>
        <button type="button" className="user-chip" onClick={() => setUserMenuOpen((v) => !v)}>
          <div className="user-avatar">{(profile?.fullName || user?.email || "?").slice(0, 1).toUpperCase()}</div>
          <div className="user-meta">
            <div className="user-name">{profile?.fullName || user?.email}</div>
            <div className="user-role">{roleLabel}</div>
          </div>
          <ChevronDownIcon width={10} height={10} />
        </button>
        {userMenuOpen && (
          <div className="loc-drop-menu user-chip-menu">
            <button type="button" className="loc-drop-item" onClick={() => { setTab("settings"); setUserMenuOpen(false); }}>
              <SettingsIcon width={13} height={13} /> Beállítások
            </button>
            <button type="button" className="loc-drop-item" onClick={signOut}>
              <LogoutIcon width={13} height={13} /> Kijelentkezés
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
