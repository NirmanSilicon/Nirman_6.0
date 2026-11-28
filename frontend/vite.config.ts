import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The dev server proxies the API, the MJPEG stream and the WebSocket to the
// FastAPI backend so the browser sees a single origin and CORS never applies.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  server: {
    port: 5173,
    // Listen on the LAN too, so a phone scanning a belt's QR label can open
    // the dashboard at this machine's network address.
    host: true,
    // Fail loudly instead of drifting to 5174: run.cmd frees 5173 first, and a
    // dashboard on a surprise port breaks the QR labels printed for 5173.
    strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/ws": { target: "ws://127.0.0.1:8000", ws: true },
    },
  },
});
