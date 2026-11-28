import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { SimulatedProvider } from "./components/DataBadge";
import "maplibre-gl/dist/maplibre-gl.css";

// Log unhandled promise rejections without logging response bodies or credentials
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  if (reason && typeof reason === "object") {
    console.error("Unhandled rejection:", reason.name || "Error", reason.message || "");
  } else {
    console.error("Unhandled rejection:", String(reason));
  }
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing #root");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SimulatedProvider>
          <App />
        </SimulatedProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
