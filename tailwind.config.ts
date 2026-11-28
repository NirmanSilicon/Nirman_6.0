import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        palette: {
          deepBlue: "#3B62AB",
          deepBlueHover: "#2C4C87",
          deepBlueLight: "#E8EEF8",
          dawnGreen: "#DAE9C6",
          dawnGreenDark: "#8EA873",
          dawnGreenText: "#2C471E",
          softDawn: "#FFF6F2",
          softDawnLight: "#FFFBF9",
          softDawnBorder: "#F3E5DD",
        },
        brand: {
          50: "#FFF6F2",
          100: "#F5EBE6",
          200: "#DAE9C6",
          500: "#5077C3",
          600: "#3B62AB",
          700: "#2C4C87",
          900: "#1A2E54",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
