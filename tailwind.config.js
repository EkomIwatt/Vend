/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Vend palette — Section 10 of build spec
        primary: {
          DEFAULT: '#0F4C3A',
          hover: '#1B5E47',
        },
        surface: '#FAF7F2',
        ink: {
          DEFAULT: '#0A0A0A',
          muted: '#6B6B6B',
        },
        line: '#E8E4DD',
        danger: '#B91C1C',
        warn: '#B45309',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontFeatureSettings: {
        tnum: '"tnum"',
      },
    },
  },
  plugins: [],
}
