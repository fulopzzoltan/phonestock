import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    strictPort: false,
  },
  define: {
    // Netlify minden build-hez automatikusan beállítja a SITE_NAME-et — ebből tudjuk build-időben,
    // hogy a külön admin-only Netlify site-ot építjük-e, dashboard env-változó beállítása nélkül
    // (az korábban megbízhatatlannak bizonyult: a repo összekötése törölte a kézzel beállított értéket).
    "import.meta.env.VITE_ADMIN_ONLY": JSON.stringify(process.env.SITE_NAME === "phonestock-admin" ? "true" : process.env.VITE_ADMIN_ONLY || ""),
  },
});
