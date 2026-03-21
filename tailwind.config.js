/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        hype: '#FF3B5C',
        chill: '#4ECDC4',
        social: '#FFE66D',
        creative: '#A855F7',
      },
    },
  },
  plugins: [],
};
