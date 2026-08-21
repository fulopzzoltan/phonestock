import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { t } from "../lib/i18n";
import { CallIcon, PinIcon } from "./icons";

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
          <span>{s.footerRights(new Date().getFullYear())}</span>
          <span className="pub-footer-legal">
            <a href="/aszf">{s.footerTerms}</a>
            <a href="/adatvedelem">{s.footerPrivacy}</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
