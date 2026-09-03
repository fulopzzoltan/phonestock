import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { t } from "../lib/i18n";
import { CallIcon, PinIcon, FacebookIcon, InstagramIcon, YoutubeIcon, TiktokIcon } from "./icons";

const SOCIAL_LINKS = [
  { Icon: FacebookIcon, href: "https://www.facebook.com/telefonos.ro", label: "Facebook" },
  { Icon: InstagramIcon, href: "https://www.instagram.com/telefonos.ro/", label: "Instagram" },
  { Icon: YoutubeIcon, href: "https://www.youtube.com/@telefonosro", label: "YouTube" },
  { Icon: TiktokIcon, href: "https://www.tiktok.com/@telefonos.ro", label: "TikTok" },
];

export default function PublicFooter({ lang = "hu", minimal = false }) {
  const s = t(lang);
  const [locations, setLocations] = useState([]);
  const stockHref = lang === "ro" ? "/ro/telefoane" : "/";
  const repairHref = lang === "ro" ? "/ro/estimare" : "/becsles";
  const faqHref = lang === "ro" ? "/ro/intrebari-frecvente" : "/gyik";
  // Az ÁSZF/Visszaküldés/Adatvédelem szövege egyelőre csak magyarul létezik — nincs külön RO
  // route rájuk, de a ?lang=ro jelzéssel legalább a fejléc/lábléc (és a nyelvváltó) a
  // látogató nyelvén marad, ahelyett hogy a teljes oldal csendben visszaváltana magyarra.
  const legalLangQuery = lang === "ro" ? "?lang=ro" : "";

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
          <div className="pub-footer-grid">
            <div className="pub-footer-col">
              <div className="pub-footer-brand">
                <img src="/logo.png" alt="Telefonos" className="pub-footer-logo" />
              </div>
              <a className="pub-footer-phone" href="tel:0773985278"><CallIcon width={12} height={12} />0773 985 278</a>
              <a className="pub-footer-phone" href="mailto:info@telefonos.ro">info@telefonos.ro</a>
              <div className="pub-footer-social">
                {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                    <Icon width={16} height={16} />
                  </a>
                ))}
              </div>
            </div>

            <div className="pub-footer-col">
              <div className="pub-footer-heading">{s.footerLocations}</div>
              {locations.map((l) => (
                <div key={l.id} className="pub-footer-loc"><PinIcon width={12} height={12} />{l.name}</div>
              ))}
            </div>
          </div>

          <div className="pub-footer-bottom">
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
        <div className="pub-footer-grid">
          <div className="pub-footer-col">
            <div className="pub-footer-brand">
              <img src="/logo.png" alt="Telefonos" className="pub-footer-logo" />
            </div>
            <p className="pub-footer-about">{s.footer}</p>
            <a className="pub-footer-phone" href="tel:0773985278"><CallIcon width={12} height={12} />0773 985 278</a>
            <a className="pub-footer-phone" href="mailto:info@telefonos.ro">info@telefonos.ro</a>
            <div className="pub-footer-social">
              {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                  <Icon width={16} height={16} />
                </a>
              ))}
            </div>
          </div>

          <div className="pub-footer-col">
            <div className="pub-footer-heading">{s.footerShop}</div>
            <a href={stockHref}>{s.navStock}</a>
            <a href={repairHref}>{s.navRepair}</a>
            <a href="/eladom">{s.navBuyback}</a>
            <a href="/status">{s.navStatus}</a>
            <a href="/kosar">{s.footerCart}</a>
          </div>

          <div className="pub-footer-col">
            <div className="pub-footer-heading">{s.footerAccount}</div>
            <a href="/fiok">{s.footerMyAccount}</a>
            <a href={faqHref}>{s.footerFaq}</a>
          </div>

          <div className="pub-footer-col">
            <div className="pub-footer-heading">{s.footerLocations}</div>
            {locations.map((l) => (
              <div key={l.id} className="pub-footer-loc"><PinIcon width={12} height={12} />{l.name}</div>
            ))}
          </div>

          <div className="pub-footer-col">
            <div className="pub-footer-heading">{s.footerPayment}</div>
            <div className="pub-footer-payment-badges">
              <a href="https://netopia-payments.com" target="_blank" rel="noopener noreferrer"><img src="/netopiacolor-telefonos.png" alt="Netopia Payments" /></a>
              <img src="/Mastercard-Logo.png" alt="Mastercard" />
              <img src="/visacolor-telefonos.png" alt="Visa" />
            </div>
          </div>
        </div>

        <div className="pub-footer-bottom">
          <div className="pub-footer-bottom-left">
            <span>{s.footerRights(new Date().getFullYear())}</span>
          </div>
          <span className="pub-footer-legal">
            <a href={`/aszf${legalLangQuery}`}>{s.footerTerms}</a>
            <a href={`/visszakuldes${legalLangQuery}`}>{s.footerReturns}</a>
            <a href={`/adatvedelem${legalLangQuery}`}>{s.footerPrivacy}</a>
          </span>
          <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener noreferrer" className="pub-footer-anpc"><img src="/anpc_sal.v1787810231.png" alt="ANPC SAL" /></a>
        </div>
      </div>
    </footer>
  );
}
