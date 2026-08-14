import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.jsx";
import StatusLookup from "./StatusLookup.jsx";
import ReceiptLookup from "./ReceiptLookup.jsx";
import StockShowcase from "./StockShowcase.jsx";
import PhoneDetail from "./PhoneDetail.jsx";
import BuybackFlow from "./BuybackFlow.jsx";
import RepairEstimator from "./RepairEstimator.jsx";
import { AuthProvider } from "./lib/AuthContext";
import "./index.css";

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
      <Root />
    </HelmetProvider>
  </React.StrictMode>
);
