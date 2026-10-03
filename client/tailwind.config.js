/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        coffee: {
          50: '#fdfbf7',
          100: '#f7f2ea',
          200: '#ebe0d0',
          300: '#d9c5ab',
          400: '#bf9e7a',
          500: '#a67c52',
          600: '#8c623d',
          700: '#6f4c2e',
          800: '#4a321e',
          900: '#2c1e12',
          950: '#191009',
        },
        crema: {
          light: '#fbf8f3',
          DEFAULT: '#eadecb',
          dark: '#cbb69d'
        },
        amberGold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Cabinet Grotesk', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      animation: {
        'steam-slow': 'steam 3s ease-out infinite',
        'steam-fast': 'steam 2.2s ease-out infinite 0.8s',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        steam: {
          '0%': { transform: 'translateY(0) scaleX(1)', opacity: '0.8' },
          '50%': { transform: 'translateY(-14px) scaleX(1.3) translateX(4px)', opacity: '0.4' },
          '100%': { transform: 'translateY(-28px) scaleX(1.8) translateX(-4px)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
}
