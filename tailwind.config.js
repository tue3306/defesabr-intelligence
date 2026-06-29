/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // [ALTERADO] Cor principal = GRAFITE (cinza institucional/militar), sem azul.
        // O acento patriótico fica por conta do OURO (gold) — botões, links, foco.
        brand: {
          50: '#f4f5f6',
          100: '#e5e7e9',
          200: '#c9ccd1',
          300: '#a4a9b1', // texto-acento sobre fundo escuro
          400: '#7d828b',
          500: '#5c616a',
          600: '#494e56',
          700: '#393d44',
          800: '#2a2d33',
          900: '#1c1f24',
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
          fab: '#64748b',      // Azul — Força Aérea Brasileira
          marinha: '#475569',  // Azul-marinho — Marinha do Brasil
          exercito: '#2e7d46', // Verde — Exército Brasileiro
          defesa: '#caa733',   // Ouro — Ministério da Defesa
        },
        // [ALTERADO] Ouro nacional como cor de destaque/secundária
        gold: {
          400: '#e0c25a',
          500: '#caa733',
          600: '#a98a23',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      // [ALTERADO] Escala de sombras suaves (estilo SaaS moderno)
      boxShadow: {
        card: '0 1px 2px rgba(16,18,22,0.04), 0 1px 3px rgba(16,18,22,0.06)',
        'card-hover': '0 6px 16px -4px rgba(16,18,22,0.10), 0 2px 6px rgba(16,18,22,0.06)',
        dropdown: '0 10px 30px -8px rgba(16,18,22,0.22), 0 2px 8px rgba(16,18,22,0.10)',
        modal: '0 28px 60px -16px rgba(0,0,0,0.55), 0 6px 18px rgba(0,0,0,0.30)',
        'glow-gold': '0 0 0 1px rgba(202,167,51,0.25), 0 6px 22px -6px rgba(202,167,51,0.18)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
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
        'fade-in-up': 'fade-in-up 0.4s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        shimmer: 'shimmer 1.6s infinite',
        marquee: 'marquee 40s linear infinite',
        'pulse-dot': 'pulse-dot 1.5s ease-in-out infinite',
        wiggle: 'wiggle 0.4s ease-in-out 2',
      },
    },
  },
  plugins: [],
}
