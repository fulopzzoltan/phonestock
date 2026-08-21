import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./lib/AuthContext";
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

function RouteFallback() {
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F4F6F3", color: "#6B7280", fontSize: 13 }}>Betöltés...</div>;
}

const statusMatch = window.location.pathname.match(/^\/status\/?([0-9a-f-]{36})?$/i);
const receiptMatch = window.location.pathname.match(/^\/receipt\/?([0-9a-f-]{36})?$/i);
// rövid SMS-link: /s/xxxxxxxx — ugyanaz mint a /status/:token, csak rövidebb kóddal
const shortMatch = window.location.pathname.match(/^\/s\/([a-f0-9]{8})\/?$/i);
const adminMatch = window.location.pathname.match(/^\/admin\/?$/i);
const phoneDetailMatch = window.location.pathname.match(/^\/telefon\/([0-9a-f-]{36})\/?$/i);
const buybackMatch = window.location.pathname.match(/^\/eladom\/?$/i);
const repairMatch = window.location.pathname.match(/^\/becsles\/?$/i);
// "/" és "/keszlet" is a nyilvános készletoldalt mutatja — ez az, amit valaki
// a Netlify domain-re érkezve először lát, nem a bejelentkezés.
const stockMatch = window.location.pathname.match(/^\/(keszlet\/?)?$/i);

// Román nyelvű tükör-útvonalak (ld. TASKS_SEO_GEO.md) — a magyar útvonalak változatlanok maradnak.
const roStockMatch = window.location.pathname.match(/^\/ro\/telefoane\/?$/i);
const roPhoneDetailMatch = window.location.pathname.match(/^\/ro\/telefon\/([0-9a-f-]{36})\/?$/i);
const roRepairMatch = window.location.pathname.match(/^\/ro\/estimare\/?$/i);

function Root() {
  if (statusMatch) return <StatusLookup token={statusMatch[1] || null} />;
  if (shortMatch) return <StatusLookup shortCode={shortMatch[1]} />;
  if (receiptMatch) return <ReceiptLookup token={receiptMatch[1] || null} />;
  if (adminMatch) return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
  if (roPhoneDetailMatch) return <PhoneDetail id={roPhoneDetailMatch[1]} lang="ro" />;
  if (phoneDetailMatch) return <PhoneDetail id={phoneDetailMatch[1]} lang="hu" />;
  if (buybackMatch) return <BuybackFlow />;
  if (roRepairMatch) return <RepairEstimator lang="ro" />;
  if (repairMatch) return <RepairEstimator lang="hu" />;
  if (roStockMatch) return <StockShowcase lang="ro" />;
  if (stockMatch) return <StockShowcase lang="hu" />;
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <Suspense fallback={<RouteFallback />}>
        <Root />
      </Suspense>
    </HelmetProvider>
  </React.StrictMode>
);
