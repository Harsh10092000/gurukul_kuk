/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gurukul: {
          50: '#fff9ed',
          100: '#fef2d6',
          200: '#fde0ac',
          300: '#fbc978',
          400: '#f8a93e',
          500: '#f58a14', // Rich Saffron / Vedic Ochre
          600: '#d96c0a',
          700: '#b44e0b',
          800: '#903e10',
          900: '#753410',
          navy: '#0b192c',
          navyLight: '#1e3e62',
          navyDark: '#060d17',
          gold: '#dfa838',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-merriweather)', 'Georgia', 'serif'],
        hindi: ['var(--font-devanagari)', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'card-hover': '0 20px 35px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
