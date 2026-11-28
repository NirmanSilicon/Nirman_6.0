/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#090d16",
        surface: "#101827",
        "surface-card": "#151f32",
        "border-glow": "#1e293b",
        hazard: "#38bdf8",
        damage: "#ef4444",
        operational: "#10b981",
        degraded: "#f59e0b",
        unavailable: "#ef4444",
        repairing: "#6366f1",
        recovered: "#06b6d4"
      }
    },
  },
  plugins: [],
}
