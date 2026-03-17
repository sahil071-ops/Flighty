/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Entire slate palette driven by CSS variables.
        // Swapping html.dark ↔ html.light re-themes every component automatically.
        slate: {
          950: 'rgb(var(--s-950) / <alpha-value>)',
          900: 'rgb(var(--s-900) / <alpha-value>)',
          850: 'rgb(var(--s-850) / <alpha-value>)',
          800: 'rgb(var(--s-800) / <alpha-value>)',
          750: 'rgb(var(--s-750) / <alpha-value>)',
          700: 'rgb(var(--s-700) / <alpha-value>)',
          650: 'rgb(var(--s-650) / <alpha-value>)',
          600: 'rgb(var(--s-600) / <alpha-value>)',
          500: 'rgb(var(--s-500) / <alpha-value>)',
          400: 'rgb(var(--s-400) / <alpha-value>)',
          300: 'rgb(var(--s-300) / <alpha-value>)',
          200: 'rgb(var(--s-200) / <alpha-value>)',
          100: 'rgb(var(--s-100) / <alpha-value>)',
          50:  'rgb(var(--s-50)  / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--s-900) / <alpha-value>)',
          card:    'rgb(var(--s-800) / <alpha-value>)',
          raised:  'rgb(var(--s-750) / <alpha-value>)',
          hover:   'rgb(var(--s-700) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      boxShadow: {
        // Used by cards — meaningful shadow in light mode, invisible in dark
        card: '0 1px 6px rgba(0,15,50,0.07), 0 0 0 1px rgba(0,15,50,0.05)',
        'card-dark': '0 2px 20px rgba(0,0,0,0.5)',
        glow: '0 0 20px rgba(34,211,238,0.15)',
      },
    },
  },
  plugins: [],
}
