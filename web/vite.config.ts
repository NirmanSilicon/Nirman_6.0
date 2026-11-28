import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Ouroboros — PCB value & recovery",
        short_name: "Ouroboros",
        description: "One phone photo in → value and next step out.",
        theme_color: "#166534",
        background_color: "#fafaf9",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/v1/, /^\/docs/, /^\/openapi/, /^\/healthz/],
        runtimeCaching: [
          { urlPattern: /\/v1\/(prices|recyclers)/, handler: "NetworkFirst", options: { cacheName: "ref-data", networkTimeoutSeconds: 4 } },
        ],
      },
    }),
  ],
  server: { proxy: { "/v1": "http://localhost:8000", "/healthz": "http://localhost:8000" } },
});
