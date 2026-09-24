import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { t } from "../lib/i18n";
import { PinIcon, FacebookIcon, InstagramIcon, YoutubeIcon, TiktokIcon } from "./icons";
import { markLangChosen } from "../lib/langPref";

const SOCIAL_LINKS = [
  { Icon: FacebookIcon, href: "https://www.facebook.com/telefonos.ro", label: "Facebook" },
  { Icon: InstagramIcon, href: "https://www.instagram.com/telefonos.ro/", label: "Instagram" },
  { Icon: YoutubeIcon, href: "https://www.youtube.com/@telefonosro", label: "YouTube" },
  { Icon: TiktokIcon, href: "https://www.tiktok.com/@telefonos.ro", label: "TikTok" },
];

// Konkrét Google Maps link, ahol már van — a többinél egy név-alapú keresőlinkre esünk
// vissza (nincs cím rögzítve a locations táblában), amíg nem kapunk pontosabbat.
const LOCATION_MAPS_URL = {
  "Gyimes": "https://share.google/EnrnhRGT6LgrWxRVs",
  "Szentgyörgy": "https://share.google/1p5lZA2Erlnvk9XlF",
  "Csíkmadaras": "https://share.google/9pmy0iwklNkanY3EB",
};
function mapsHref(name) {
  return LOCATION_MAPS_URL[name] || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Telefonos ${name}`)}`;
}
// Csíkmadarason egy franchise-partner üzemelteti a Telefonos brand alatt — nem szerepel
// a locations táblában (nincs saját raktár/személyzet-hozzárendelése a rendszerben), ezért
// itt statikusan tüntetjük fel, külön "Franchise partner" jelöléssel.
const FRANCHISE_LOCATIONS = [{ name: "Csíkmadaras" }];

function FooterAccordion({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pub-footer-acc">
      <button type="button" className="pub-footer-acc-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span>{title}</span>
        <span className="pub-footer-acc-icon">{open ? "−" : "+"}</span>
      </button>
      <div className={`pub-footer-acc-body${open ? " open" : ""}`}>
        <div className="pub-footer-acc-body-inner">{children}</div>
      </div>
    </div>
  );
}

function LocationLinks({ locations }) {
  return (
    <>
      {locations.map((l) => (
        <a key={l.id} className="pub-footer-loc" href={mapsHref(l.name)} target="_blank" rel="noopener noreferrer">
          <PinIcon width={12} height={12} />{l.name}
        </a>
      ))}
      {FRANCHISE_LOCATIONS.map((l) => (
        <a key={l.name} className="pub-footer-loc pub-footer-loc-franchise" href={mapsHref(l.name)} target="_blank" rel="noopener noreferrer">
          <PinIcon width={12} height={12} />
          <span>
            {l.name}
            <small>Franchise partner</small>
          </span>
        </a>
      ))}
    </>
  );
}

export default function PublicFooter({ lang = "hu", minimal = false, onContactClick }) {
  const s = t(lang);
  const [locations, setLocations] = useState([]);
  const stockHref = lang === "ro" ? "/ro/telefoane" : "/";
  const repairHref = lang === "ro" ? "/ro/estimare" : "/becsles";
  const faqHref = lang === "ro" ? "/ro/intrebari-frecvente" : "/gyik";
  const qualityHref = lang === "ro" ? "/ro/reconditionare-verificata" : "/ellenorzott-felujitas";
  // Az ÁSZF/Visszaküldés/Adatvédelem szövege egyelőre csak magyarul létezik — nincs külön RO
  // route rájuk, de a ?lang=ro jelzéssel legalább a fejléc/lábléc (és a nyelvváltó) a
  // látogató nyelvén marad, ahelyett hogy a teljes oldal csendben visszaváltana magyarra.
  const legalLangQuery = lang === "ro" ? "?lang=ro" : "";
  // A fejlécből ide költözött nyelvváltó — a konkrét oldal fordítottját nem ismeri
  // (a lábléc minden oldalon ugyanaz a komponens, saját props nélkül), ezért mindig
  // a telefonlistára visz a másik nyelven, mint a fejléc alapértelmezett esete.
  const otherLangHref = lang === "ro" ? "/" : "/ro/telefoane";
  const footerLangSwitch = (
    <div className="pub-lang-switch" role="group" aria-label="Nyelv">
      {lang === "ro" ? (
        <a className="pub-lang-opt" href={otherLangHref} onClick={() => markLangChosen("hu")}>HU</a>
      ) : (
        <span className="pub-lang-opt pub-lang-active">HU</span>
      )}
      {lang === "ro" ? (
        <span className="pub-lang-opt pub-lang-active">RO</span>
      ) : (
        <a className="pub-lang-opt" href={otherLangHref} onClick={() => markLangChosen("ro")}>RO</a>
      )}
    </div>
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_locations");
      setLocations(data || []);
    })();
  }, []);

  // "Minimal" lábléc — a csak-nyomonkövetés origin-en a webshop/fiók/jogi menüpontok
  // (és a fizetési logók) úgysem vezetnének sehova, csak az elérhetőség marad hasznos.
  if (minimal) {
    return (
      <footer className="pub-footer">
        <div className="pub-footer-inner">
          <div className="pub-footer-grid pub-footer-grid-minimal">
            <div className="pub-footer-col">
              <div className="pub-footer-brand">
                <img src="/logo.png" alt="Telefonos" className="pub-footer-logo" />
              </div>
              <div className="pub-footer-social">
                {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                    <Icon width={16} height={16} />
                  </a>
                ))}
              </div>
              {onContactClick && (
                <button type="button" className="pub-footer-linkbtn" onClick={onContactClick}>{s.bottomNavContact}</button>
              )}
              <a href={`/adatvedelem${legalLangQuery}`}>{s.footerPrivacy}</a>
            </div>
          </div>

          <div className="pub-footer-bottom pub-footer-bottom-minimal">
            <div className="pub-footer-bottom-left">
              <span>{s.footerRights(new Date().getFullYear())}</span>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="pub-footer">
      <div className="pub-footer-inner">
        <div className="pub-footer-top">
          <div className="pub-footer-brand-block">
            <img src="/logo.png" alt="Telefonos" className="pub-footer-logo" />
            <p className="pub-footer-about">{s.footer}</p>
            <div className="pub-footer-social pub-footer-social-mobile">
              {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                  <Icon width={16} height={16} />
                </a>
              ))}
            </div>
          </div>

          <div className="pub-footer-accordions">
            <FooterAccordion title={s.footerShop}>
              <a href={stockHref}>{s.navStock}</a>
              <a href={repairHref}>{s.navRepair}</a>
              <a href="/eladom">{s.navBuyback}</a>
              <a href="/status">{s.navStatus}</a>
              <a href="/kosar">{s.footerCart}</a>
            </FooterAccordion>

            <FooterAccordion title={s.footerAccount}>
              <a href="/fiok">{s.footerMyAccount}</a>
              <a href={faqHref}>{s.footerFaq}</a>
              <a href={qualityHref}>{lang === "ro" ? "Reconditionare Verificată" : "Ellenőrzött Felújítás"}</a>
            </FooterAccordion>

            <FooterAccordion title={s.footerLocations}>
              <LocationLinks locations={locations} />
            </FooterAccordion>
          </div>

          <div className="pub-footer-payment-social-block">
            <div className="pub-footer-payment-badges">
              <a href="https://netopia-payments.com" target="_blank" rel="noopener noreferrer"><img src="/netopiacolor-telefonos.png" alt="Netopia Payments" /></a>
              <img src="/Mastercard-Logo.png" alt="Mastercard" />
              <img src="/visacolor-telefonos.png" alt="Visa" />
            </div>
            <div className="pub-footer-social pub-footer-social-desktop">
              {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                  <Icon width={16} height={16} />
                </a>
              ))}
            </div>
            {footerLangSwitch}
          </div>
        </div>

        <button type="button" className="pub-footer-backtotop" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <span className="pub-footer-backtotop-arrow">↑</span> {s.footerBackToTop}
        </button>

        <div className="pub-footer-payment-badges pub-footer-payment-badges-mobile-only">
          <a href="https://netopia-payments.com" target="_blank" rel="noopener noreferrer"><img src="/netopiacolor-telefonos.png" alt="Netopia Payments" /></a>
          <img src="/Mastercard-Logo.png" alt="Mastercard" />
          <img src="/visacolor-telefonos.png" alt="Visa" />
        </div>

        <div className="pub-footer-lang-mobile-only">{footerLangSwitch}</div>

        <div className="pub-footer-bottom">
          <span className="pub-footer-legal">
            <a href={`/aszf${legalLangQuery}`}>{s.footerTerms}</a>
            <a href={`/visszakuldes${legalLangQuery}`}>{s.footerReturns}</a>
            <a href={`/adatvedelem${legalLangQuery}`}>{s.footerPrivacy}</a>
          </span>
          <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener noreferrer" className="pub-footer-anpc"><img src="/anpc_sal.v1787810231.png" alt="ANPC SAL" /></a>
          <span className="pub-footer-rights">{s.footerRights(new Date().getFullYear())}</span>
        </div>
      </div>
    </footer>
  );
}
