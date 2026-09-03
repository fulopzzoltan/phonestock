import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./lib/AuthContext";
import { redirectToPreferredLang } from "./lib/langPref";
import "./index.css";

// Útvonalanként külön chunk — így egy nyilvános látogató (készletoldal, becslő stb.)
// nem tölti le a teljes admin-felületet (App.jsx, az összes fül/modal, pdfjs-dist),
// és fordítva, az admin sem a nyilvános oldalak kódját.
const App = lazy(() => import("./App.jsx"));
const StatusLookup = lazy(() => import("./StatusLookup.jsx"));
const ReceiptLookup = lazy(() => import("./ReceiptLookup.jsx"));
const StockShowcase = lazy(() => import("./StockShowcase.jsx"));
const PhoneDetail = lazy(() => import("./PhoneDetail.jsx"));
const BuybackFlow = lazy(() => import("./BuybackFlow.jsx"));
const RepairEstimator = lazy(() => import("./RepairEstimator.jsx"));
const PhoneFinder = lazy(() => import("./PhoneFinder.jsx"));
const CustomerPortal = lazy(() => import("./CustomerPortal.jsx"));
const Cart = lazy(() => import("./Cart.jsx"));
const Checkout = lazy(() => import("./Checkout.jsx"));
const OrderStatus = lazy(() => import("./OrderStatus.jsx"));
const LegalPage = lazy(() => import("./LegalPage.jsx"));
const GyikPage = lazy(() => import("./GyikPage.jsx"));
const PaymentMock = lazy(() => import("./PaymentMock.jsx"));

function RouteFallback() {
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F4F6F3", color: "#6B7280", fontSize: 13 }}>Betöltés...</div>;
}

// Az admin-felület külön Netlify site-on fut (phonestock-admin.netlify.app), külön originen —
// ez a build-időben beállított flag mindig az adminfelületet rendereli, útvonaltól függetlenül,
// hogy a személyzeti bejelentkezés session-je sose kerülhessen a publikus webshop originjébe.
const ADMIN_ONLY = import.meta.env.VITE_ADMIN_ONLY === "true";

// A "csak nyomonkövetés" origin (nyomonkovetes.telefonos.ro) — amíg a többi publikus
// funkció (webshop, felvásárlás stb.) nincs kész az éles indulásra, ezen a külön
// Netlify site-on/aldomain-en szándékosan CSAK a /status és /receipt önkiszolgáló
// oldalak érhetők el, minden más útvonal (a "/" gyökér is) ezekre esik vissza.
// Amint kész egy újabb funkció, itt egy sorral bővíthető — nem kell újraépíteni semmit.
const PUBLIC_SCOPE = import.meta.env.VITE_PUBLIC_SCOPE || "full"; // "full" | "tracking"

const statusMatch = window.location.pathname.match(/^\/status\/?([0-9a-f-]{36})?$/i);
const receiptMatch = window.location.pathname.match(/^\/receipt\/?([0-9a-f-]{36})?$/i);
// "?sign=service_intake|service_handover|sale" — aláírás mód a publikus /status és /receipt oldalakon (ld. TASKS_DIGITALIS_ALAIRAS.md)
const signStage = new URLSearchParams(window.location.search).get("sign");
// rövid SMS-link: /s/xxxxxxxx — ugyanaz mint a /status/:token, csak rövidebb kóddal
const shortMatch = window.location.pathname.match(/^\/s\/([a-f0-9]{8})\/?$/i);
const phoneDetailMatch = window.location.pathname.match(/^\/telefon\/([0-9a-f-]{36})\/?$/i);
const buybackMatch = window.location.pathname.match(/^\/eladom\/?$/i);
const repairMatch = window.location.pathname.match(/^\/becsles\/?$/i);
const finderMatch = window.location.pathname.match(/^\/segito\/?$/i);
const accountMatch = window.location.pathname.match(/^\/fiok(\/.*)?$/i);
const cartMatch = window.location.pathname.match(/^\/kosar\/?$/i);
const checkoutMatch = window.location.pathname.match(/^\/penztar\/?$/i);
const orderStatusMatch = window.location.pathname.match(/^\/rendeles\/([0-9a-f-]{36})\/?$/i);
const paymentMockMatch = window.location.pathname.match(/^\/fizetes\/([0-9a-f-]{36})\/?$/i);
const termsMatch = window.location.pathname.match(/^\/aszf\/?$/i);
const privacyMatch = window.location.pathname.match(/^\/adatvedelem\/?$/i);
const returnsMatch = window.location.pathname.match(/^\/visszakuldes\/?$/i);
// Az ÁSZF/Adatvédelem/Visszaküldés szövege csak magyarul létezik, nincs saját RO route-ja —
// a ?lang=ro jelzést a PublicFooter teszi rá a linkre, hogy legalább a fejléc/lábléc/nyelvváltó
// megmaradjon román nézetben, ne váltson csendben egészben magyarra.
const legalLang = new URLSearchParams(window.location.search).get("lang") === "ro" ? "ro" : "hu";
const faqMatch = window.location.pathname.match(/^\/gyik\/?$/i);
// "/" és "/keszlet" is a nyilvános készletoldalt mutatja — ez az, amit valaki
// a Netlify domain-re érkezve először lát, nem a bejelentkezés.
const stockMatch = window.location.pathname.match(/^\/(keszlet\/?)?$/i);

// Román nyelvű tükör-útvonalak (ld. TASKS_SEO_GEO.md) — a magyar útvonalak változatlanok maradnak.
const roStockMatch = window.location.pathname.match(/^\/ro\/telefoane\/?$/i);
const roPhoneDetailMatch = window.location.pathname.match(/^\/ro\/telefon\/([0-9a-f-]{36})\/?$/i);
const roRepairMatch = window.location.pathname.match(/^\/ro\/estimare\/?$/i);
const roFinderMatch = window.location.pathname.match(/^\/ro\/asistent\/?$/i);
const roFaqMatch = window.location.pathname.match(/^\/ro\/intrebari-frecvente\/?$/i);

function Root() {
  if (ADMIN_ONLY) return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
  // A "csak nyomonkövetés" origin-en minden útvonal ugyanide esik vissza (ld. lent), tehát a
  // fejléc/lábléc egyéb menüpontjai (webshop, kosár, fiók stb.) sosem vezetnének sehova —
  // ott a header/footer "minimal" módban csak a logót és az elérhetőséget mutatja.
  const trackingOnly = PUBLIC_SCOPE === "tracking";
  if (statusMatch) return <StatusLookup token={statusMatch[1] || null} signStage={signStage} minimal={trackingOnly} />;
  if (shortMatch) return <StatusLookup shortCode={shortMatch[1]} signStage={signStage} minimal={trackingOnly} />;
  if (receiptMatch) return <ReceiptLookup token={receiptMatch[1] || null} signStage={signStage} minimal={trackingOnly} />;
  if (trackingOnly) {
    // Erre a subdomain-re szándékosan nem megy ki más — sem a webshop, sem a
    // többi publikus oldal — még nincs kész éles indulásra.
    return <StatusLookup token={null} signStage={signStage} minimal />;
  }
  if (accountMatch) return <CustomerPortal />;
  if (cartMatch) return <Cart />;
  if (checkoutMatch) return <Checkout />;
  if (orderStatusMatch) return <OrderStatus token={orderStatusMatch[1]} />;
  if (paymentMockMatch) return <PaymentMock token={paymentMockMatch[1]} />;
  if (termsMatch) return <LegalPage title={legalLang === "ro" ? "Termeni și condiții generale" : "Általános Szerződési Feltételek"} variant="terms" lang={legalLang} />;
  if (privacyMatch) return <LegalPage title={legalLang === "ro" ? "Politica de confidențialitate" : "Adatvédelmi tájékoztató"} variant="privacy" lang={legalLang} />;
  if (returnsMatch) return <LegalPage title={legalLang === "ro" ? "Politica de retur" : "Visszaküldési és Visszatérítési Szabályzat"} variant="returns" lang={legalLang} />;
  if (roFaqMatch) return <GyikPage lang="ro" />;
  if (faqMatch) return <GyikPage lang="hu" />;
  if (roPhoneDetailMatch) return <PhoneDetail id={roPhoneDetailMatch[1]} lang="ro" />;
  if (phoneDetailMatch) return <PhoneDetail id={phoneDetailMatch[1]} lang="hu" />;
  if (buybackMatch) return <BuybackFlow />;
  if (roRepairMatch) return <RepairEstimator lang="ro" />;
  if (repairMatch) return <RepairEstimator lang="hu" />;
  if (roFinderMatch) return <PhoneFinder lang="ro" />;
  if (finderMatch) return <PhoneFinder lang="hu" />;
  if (roStockMatch) return <StockShowcase lang="ro" />;
  if (stockMatch) return <StockShowcase lang="hu" />;
  // Ismeretlen útvonal a publikus oldalon — a személyzeti admin ide már nem tartozik
  // (külön originen fut), így a készletoldalra esünk vissza.
  return <StockShowcase lang="hu" />;
}

// Első látogatáskor, ha a böngésző/eszköz nyelve román, átirányítunk a RO tüköroldalra
// (ha van neki) — utána ez sose fut le újra, sem automatikusan, sem a kézi HU/RO váltás után.
const redirectingByLang = !ADMIN_ONLY && PUBLIC_SCOPE !== "tracking" && redirectToPreferredLang({ stockMatch, phoneDetailMatch, repairMatch, finderMatch });

if (!redirectingByLang) {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <HelmetProvider>
        <Suspense fallback={<RouteFallback />}>
          <Root />
        </Suspense>
      </HelmetProvider>
    </React.StrictMode>
  );
}
