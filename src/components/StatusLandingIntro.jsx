import { ClockIcon, WhatsappIcon, CardIcon, CallIcon } from "./icons";

// A nyomonkövetés oldal nyitó szekciója — ugyanaz a vizuális nyelv, mint az Eladás/Szerviz/
// Segítő landingeknél, de ennek az oldalnak nem kell 3-opciós blokk vagy GYIK-tömeg: ez egy
// könnyű, kereső-központú utility-oldal, ezért keskenyebb, letisztultabb elrendezésben marad.
export default function StatusLandingIntro({ s, phone, setPhone, busy, error, onSubmit, whatsappHref, supportPhone }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div className="pub-promo-eyebrow" style={{ marginBottom: 18 }}>Telefonos · Nyomonkövetés</div>
      <h1 className="bb-landing-title" style={{ fontSize: 38 }}>{s.landingHeadline}</h1>
      <p className="bb-landing-sub" style={{ maxWidth: 420 }}>{s.statusIntroSub}</p>

      <div className="bb-landing-values" style={{ maxWidth: 420, padding: "34px 32px", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 800, color: "var(--pub-accent-ink)", background: "#fff", borderRadius: 999, padding: "6px 12px", width: "fit-content", margin: "0 auto 16px" }}>
          <span className="status-live-dot" />
          {s.statusLiveBadge}
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--pub-ink)", textAlign: "center" }}>{s.searchCardTitle}</div>
        <p style={{ margin: "4px 0 20px", fontSize: 12.5, color: "var(--pub-ink-soft)", textAlign: "center" }}>{s.searchCardDesc}</p>
        {error && <div className="errbar" style={{ marginBottom: 12 }}>{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>{s.phoneLabel}</label>
            <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={s.statusPhonePlaceholder} />
          </div>
          <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} disabled={busy} type="submit">
            {busy ? s.statusSearching : s.statusViewBtn}
          </button>
        </form>
      </div>

      <div style={{ maxWidth: 420, margin: "44px auto 0", textAlign: "left" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--pub-ink)", marginBottom: 14 }}>{s.featuresTitle}</div>
        <FeatureItem icon={ClockIcon} title={s.feature1Title} desc={s.feature1Desc} />
        <FeatureItem icon={WhatsappIcon} title={s.feature2Title} desc={s.feature2Desc} />
        <FeatureItem icon={CardIcon} title={s.feature3Title} desc={s.feature3Desc} last />
      </div>

      <div style={{ maxWidth: 420, margin: "32px auto 0", background: "var(--pub-paper)", borderRadius: 16, padding: "20px 22px" }}>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "#1DB954", borderRadius: 12, padding: "13px 16px", textDecoration: "none", boxSizing: "border-box" }}
        >
          <WhatsappIcon width={15} height={15} style={{ color: "#fff", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{s.contactWhatsappBtn}</span>
        </a>
        <a href={`tel:${supportPhone}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--pub-ink-soft)", fontWeight: 600, fontSize: 12.5, padding: "10px 0 0", textDecoration: "none" }}>
          <CallIcon width={12} height={12} /> {s.contactCallAlt}
        </a>
      </div>
    </div>
  );
}

function FeatureItem({ icon: Icon, title, desc, last = false }) {
  return (
    <div style={{ display: "flex", gap: 14, padding: "14px 0", borderTop: "1px solid var(--pub-line)", borderBottom: last ? "1px solid var(--pub-line)" : "none" }}>
      <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: "var(--pub-paper)", color: "var(--pub-accent-ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon width={16} height={16} />
      </div>
      <div>
        <b style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: "var(--pub-ink)" }}>{title}</b>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--pub-ink-soft)", lineHeight: 1.5 }}>{desc}</p>
      </div>
    </div>
  );
}
