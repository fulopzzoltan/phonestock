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

export default function PublicFooter({ lang = "hu" }) {
  const s = t(lang);
  const [locations, setLocations] = useState([]);
  const stockHref = lang === "ro" ? "/ro/telefoane" : "/";
  const repairHref = lang === "ro" ? "/ro/estimare" : "/becsles";

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_locations");
      setLocations(data || []);
    })();
  }, []);

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
            <span className="pub-footer-company">Telefonos S.R.L. · CUI 50623366 · Lunca de Sus 494, bloc 3, ap. 6.</span>
          </div>
          <span className="pub-footer-legal">
            <a href="/aszf">{s.footerTerms}</a>
            <a href="/visszakuldes">{s.footerReturns}</a>
            <a href="/adatvedelem">{s.footerPrivacy}</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
