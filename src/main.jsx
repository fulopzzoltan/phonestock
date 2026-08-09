import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import StatusLookup from "./StatusLookup.jsx";
import { AuthProvider } from "./lib/AuthContext";
import "./index.css";

const statusMatch = window.location.pathname.match(/^\/status\/?([0-9a-f-]{36})?$/i);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {statusMatch ? (
      <StatusLookup token={statusMatch[1] || null} />
    ) : (
      <AuthProvider>
        <App />
      </AuthProvider>
    )}
  </React.StrictMode>
);
