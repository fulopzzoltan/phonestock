import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "./lib/supabaseClient";
import { t } from "./lib/i18n";
import { FAQ_CONTENT } from "./lib/faqContent";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import { CartIcon, PhoneCaseIcon, WarrantyIcon, ReturnIcon, BuybackIcon, ServiceIcon, CardIcon, PinIcon, ChevronDownIcon } from "./components/icons";

const ICON_MAP = {
  cart: CartIcon, phone: PhoneCaseIcon, warranty: WarrantyIcon, return: ReturnIcon,
  buyback: BuybackIcon, service: ServiceIcon, payment: CardIcon, location: PinIcon,
};

const SITE = "https://telefonos.ro";

export default function GyikPage({ lang = "hu" }) {
  const s = t(lang);
  const categories = FAQ_CONTENT[lang] || FAQ_CONTENT.hu;
  const [activeKey, setActiveKey] = useState(categories[0].key);
  const [openQ, setOpenQ] = useState(null);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_locations");
      setLocations(data || []);
    })();
  }, []);

  const active = categories.find((c) => c.key === activeKey) || categories[0];
  const langSwitchHref = lang === "ro" ? "/gyik" : "/ro/intrebari-frecvente";
  const canonical = lang === "ro" ? `${SITE}/ro/intrebari-frecvente` : `${SITE}/gyik`;
  const locationsText = locations.map((l) => l.name).join(", ");

  function toggleQ(key, i) {
    const id = `${key}:${i}`;
    setOpenQ((cur) => (cur === id ? null : id));
  }

  return (
    <div className="pub-shop">
      <Helmet>
        <html lang={lang} />
        <title>{s.faqPageTitle}</title>
        <meta name="description" content={s.faqPageSubtitle} />
        <link rel="canonical" href={canonical} />
        <link rel="alternate" hrefLang="hu" href={`${SITE}/gyik`} />
        <link rel="alternate" hrefLang="ro" href={`${SITE}/ro/intrebari-frecvente`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org", "@type": "FAQPage",
          mainEntity: categories.flatMap((c) => c.questions
            .filter((qa) => !qa.locations || locationsText)
            .map((qa) => ({
              "@type": "Question", name: qa.q,
              acceptedAnswer: { "@type": "Answer", text: qa.locations ? locationsText : qa.a },
            }))),
        })}</script>
      </Helmet>
      <PublicHeader activeNav="stock" lang={lang} langSwitchHref={langSwitchHref} />
      <main className="pub-faq-main">
        <h1 className="pub-faq-title">{s.faqPageTitle}</h1>
        <p className="pub-faq-subtitle">{s.faqPageSubtitle}</p>

        <div className="pub-faq-chips">
          {categories.map((c) => {
            const Icon = ICON_MAP[c.icon];
            return (
              <button
                key={c.key} type="button"
                className={`pub-faq-chip${c.key === activeKey ? " active" : ""}`}
                onClick={() => { setActiveKey(c.key); setOpenQ(null); }}
              >
                <Icon width={18} height={18} />
                <span>{c.title}</span>
              </button>
            );
          })}
        </div>

        <div className="pub-faq-list">
          {active.questions.map((qa, i) => {
            const id = `${active.key}:${i}`;
            const open = openQ === id;
            return (
              <div key={i} className="pub-faq-item">
                <button type="button" className="pub-faq-q" onClick={() => toggleQ(active.key, i)}>
                  <span>{qa.q}</span>
                  <ChevronDownIcon style={{ transform: open ? "none" : "rotate(-90deg)", transition: "transform .15s", flexShrink: 0 }} />
                </button>
                {open && (
                  <div className="pub-faq-a">
                    {qa.locations ? (
                      locations.length === 0 ? s.faqLocationsLoading : (
                        <ul className="pub-faq-loc-list">
                          {locations.map((l) => <li key={l.id}>{l.name}</li>)}
                        </ul>
                      )
                    ) : qa.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
      <PublicFooter lang={lang} />
    </div>
  );
}
