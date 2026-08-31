import { useState, useRef, useEffect } from "react";
import { SettingsIcon, LogoutIcon, PinIcon, ChevronDownIcon, ExternalLinkIcon, ChatIcon } from "./icons";
import { SITE_URL } from "../lib/utils";

// A korábban a Sidebar tetején/alján lévő helyszín-választó, webshop-link, chat-nyitó
// és felhasználói blokk — ide költözött, hogy a Sidebar csak navigáció maradjon, és
// ezek az elemek a tartalom-hasáb tetején, oldal-fejléc fölött legyenek elérhetők.
export default function ContentTopbar({
  tab, setTab, isAdmin, locFilter, setLocFilter, allowedLocations, myLocationId, locName,
  profile, user, signOut, chatOpen, setChatOpen, chatUnread, markChatRead,
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
    <div className="content-topbar">
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

      <div className="ctb-spacer" />

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
            <div className="user-role">{isAdmin ? "Admin" : "Alkalmazott"}</div>
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
