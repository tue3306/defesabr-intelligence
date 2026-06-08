/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // [ALTERADO] Azul institucional (Força Aérea) profundo e sóbrio — menos brilhante
        brand: {
          50: '#eef3f8',
          100: '#d4e1ee',
          200: '#a9c2db',
          300: '#7ba0c4',
          400: '#5183ad',
          500: '#2f5d88',
          600: '#264c70',
          700: '#1e3c59',
          800: '#172d43',
          900: '#10202f',
        },
        // Base grafite/cinza-chumbo (neutra) — fundo institucional
        military: {
          dark: '#1c2128',
          darker: '#15191e',
          card: '#232a33',
          green: '#2e7d46',
          amber: '#caa733',
          red: '#c0392b',
        },
        // Paleta institucional/patriótica — uma cor por Força + Defesa
        forca: {
          fab: '#2b6cb0',      // Azul — Força Aérea Brasileira
          marinha: '#13315c',  // Azul-marinho — Marinha do Brasil
          exercito: '#2e7d46', // Verde — Exército Brasileiro
          defesa: '#caa733',   // Ouro — Ministério da Defesa
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-12deg)' },
          '75%': { transform: 'rotate(12deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        marquee: 'marquee 40s linear infinite',
        'pulse-dot': 'pulse-dot 1.5s ease-in-out infinite',
        wiggle: 'wiggle 0.4s ease-in-out 2',
      },
    },
  },
  plugins: [],
}
