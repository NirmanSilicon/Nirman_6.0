/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'forest-green': '#183D32',
        'secondary-green': '#285B45',
        'muted-blue': '#527C91',
        'dark-blue-grey': '#344C59',
        champagne: '#C5A46D',
        'warm-ivory': '#F5F1E8',
        charcoal: '#252A25',
        terracotta: '#A34F37',
        'success-green': '#299764',
      },
      fontFamily: {
        sans: ['"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Consolas"', 'monospace'],
      },
    },
  },
  plugins: [],
};
