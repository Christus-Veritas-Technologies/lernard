/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}', './rnr/**/*.{js,ts,tsx}', './hooks/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'auth-primary': '#6478B8',
        'auth-primary-strong': '#3D4E8A',
        'auth-primary-soft': '#E0E4F4',
        'auth-secondary': '#72B08C',
        'auth-secondary-strong': '#4C7E63',
        'auth-secondary-soft': '#EDF7F1',
        'auth-warm-soft': '#FFF0EC',
      },
    },
  },
  plugins: [],
};
