import { t } from "../lib/i18n";

export default function PublicFooter({ lang = "hu" }) {
  const s = t(lang);
  return (
    <footer className="pub-footer">
      <div className="pub-footer-inner">{s.footer}</div>
    </footer>
  );
}
