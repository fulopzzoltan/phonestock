import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import StatusLookup from "./StatusLookup.jsx";
import ReceiptLookup from "./ReceiptLookup.jsx";
import StockShowcase from "./StockShowcase.jsx";
import { AuthProvider } from "./lib/AuthContext";
import "./index.css";

const statusMatch = window.location.pathname.match(/^\/status\/?([0-9a-f-]{36})?$/i);
const receiptMatch = window.location.pathname.match(/^\/receipt\/?([0-9a-f-]{36})?$/i);
const stockMatch = window.location.pathname.match(/^\/keszlet\/?$/i);

function Root() {
  if (statusMatch) return <StatusLookup token={statusMatch[1] || null} />;
  if (receiptMatch) return <ReceiptLookup token={receiptMatch[1] || null} />;
  if (stockMatch) return <StockShowcase />;
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
