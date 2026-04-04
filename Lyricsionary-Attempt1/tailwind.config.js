/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        surface: '#0d0d0d',
        muted: '#1a1a1a',
        accent: '#a3e635',
        'text-primary': '#f5f5f5',
        'text-secondary': '#a3a3a3',
      },
      fontFamily: {
        sans: ['System'],
        mono: ['Courier'],
      },
    },
  },
  plugins: [],
};
