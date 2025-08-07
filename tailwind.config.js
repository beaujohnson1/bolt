/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dark-blue': {
          900: '#0f0f23',
          800: '#1a1a2e',
          700: '#16213e',
        },
        'cyber-blue': {
          500: '#00d4ff',
          600: '#090979',
        }
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
};
