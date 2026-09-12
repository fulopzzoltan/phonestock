import { useState, useRef, useEffect } from "react";
import { PinIcon, ExternalLinkIcon, ChevronDownIcon, SettingsIcon, LogoutIcon, ChatIcon, PlusIcon } from "./icons";
import { SITE_URL } from "../lib/utils";

// Mobilon a Sidebar és a ContentTopbar is el van rejtve (ld. index.css 640px média-határ) —
// ez a statikus, mindig látható felső sáv veszi át azok szerepét: helyszín-választó,
// webshop-link, felhasználói menü. A BottomNav "Több" lapja csak navigáció marad.
export default function MobileTopbar({
  isAdmin, locFilter, setLocFilter, allowedLocations, myLocationId, locName,
  profile, user, signOut, setTab,
  chatOpen, setChatOpen, chatUnread, markChatRead,
  tab, busy, onAddTicket, onAddProduct, onAddPart,
}) {
  const [locMenuOpen, setLocMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const locMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (locMenuRef.current && !locMenuRef.current.contains(e.target)) setLocMenuOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const currentLocLabel = isAdmin
    ? (locFilter === "all" ? "Mind" : (allowedLocations.find((l) => l.id === locFilter)?.name || "Mind"))
    : (myLocationId ? locName(myLocationId) : "Nincs helyszín");

  return (
    <div className="mtb">
      <div className="user-chip-wrap" ref={userMenuRef}>
        <button type="button" className="user-avatar mtb-avatar-btn" onClick={() => setUserMenuOpen((v) => !v)}>
          {(profile?.fullName || user?.email || "?").slice(0, 1).toUpperCase()}
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

      <a
        className="btn sec icon-only"
        style={{ width: 34, height: 34, padding: 0, borderRadius: 999, justifyContent: "center", boxShadow: "var(--shadow-card)" }}
        href={SITE_URL} target="_blank" rel="noopener noreferrer" title="Webshop megtekintése"
      >
        <ExternalLinkIcon width={14} height={14} />
      </a>

      <button
        type="button"
        className="btn sec icon-only ctb-chat-btn"
        style={{ width: 34, height: 34, padding: 0, borderRadius: 999, justifyContent: "center", boxShadow: "var(--shadow-card)", position: "relative" }}
        title="Csapat-chat"
        onClick={() => { setChatOpen((o) => !o); if (!chatOpen) markChatRead(); }}
      >
        <ChatIcon width={14} height={14} />
        {chatUnread > 0 && <span className="ctb-chat-badge">{chatUnread > 9 ? "9+" : chatUnread}</span>}
      </button>

      <div className="mtb-spacer" />

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

      {tab === "service" && onAddTicket && (
        <button type="button" className="btn header-add-btn" disabled={busy} title="Új munkalap" onClick={onAddTicket}>
          <span className="header-add-ring" /><span className="header-add-ring ring2" />
          <PlusIcon width={15} height={15} />
        </button>
      )}
      {tab === "stock" && onAddProduct && (
        <button type="button" className="btn header-add-btn" disabled={busy} title="Új készülék" onClick={onAddProduct}>
          <span className="header-add-ring" /><span className="header-add-ring ring2" />
          <PlusIcon width={15} height={15} />
        </button>
      )}
      {tab === "parts" && onAddPart && (
        <button type="button" className="btn header-add-btn" disabled={busy} title="Új alkatrész" onClick={onAddPart}>
          <span className="header-add-ring" /><span className="header-add-ring ring2" />
          <PlusIcon width={15} height={15} />
        </button>
      )}
    </div>
  );
}
