/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e8f4f8',
          100: '#c3e0ec',
          200: '#96c9de',
          300: '#64b1d0',
          400: '#3d9dc5',
          500: '#1a8ab8',
          600: '#147fa8',
          700: '#0d7195',
          800: '#076280',
          900: '#024160',
        },
        military: {
          dark: '#1a2332',
          darker: '#141c28',
          card: '#1e2a3a',
          green: '#4a7c59',
          amber: '#d4841a',
          red: '#c0392b',
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
