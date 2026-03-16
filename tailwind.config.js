/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Override slate to a deeper, blue-tinted dark palette
        slate: {
          950: '#04050C',
          900: '#07090F',
          850: '#0A0F1C',
          800: '#0E1525',
          750: '#13192E',
          700: '#1A2235',
          650: '#202B42',
          600: '#293550',
          500: '#3D4F6A',
          400: '#5C718C',
          300: '#8899B0',
          200: '#B3BFD1',
          100: '#D6DEE8',
          50:  '#EDF1F7',
        },
        surface: {
          DEFAULT: '#07090F',
          card:    '#0E1525',
          raised:  '#13192E',
          hover:   '#1A2235',
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
        card: '0 2px 20px rgba(0,0,0,0.5)',
        glow: '0 0 20px rgba(34,211,238,0.15)',
      },
    },
  },
  plugins: [],
}
