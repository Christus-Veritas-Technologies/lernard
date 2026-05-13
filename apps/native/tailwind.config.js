/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}', './rnr/**/*.{js,ts,tsx}', './hooks/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/tailwind')],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        // --- Brand: Periwinkle / Lavender Blue ---
        primary: {
          DEFAULT: '#6478B8',
          50:  '#F0F2FA',
          100: '#E0E4F4',
          200: '#C1C9E9',
          300: '#A8B5E0',
          400: '#7B8EC8',
          500: '#6478B8',
          600: '#4F62A3',
          700: '#3D4E8A',
          800: '#2C3A6E',
          900: '#1E2A54',
        },
        // --- Secondary: Mint / Sage ---
        secondary: {
          DEFAULT: '#72B08C',
          50:  '#F6FBF8',
          100: '#EDF7F1',
          200: '#C8E6D0',
          300: '#A8D8B9',
          400: '#8DC5A3',
          500: '#72B08C',
          600: '#5E9978',
          700: '#4C7E63',
        },
        // --- Semantic ---
        success: '#4CAF7D',
        warning: '#E5A84B',
        error:   '#E07B7B',
        // --- Auth palette (hero sections) ---
        'auth-primary':        '#6478B8',
        'auth-primary-strong': '#3D4E8A',
        'auth-primary-soft':   '#E0E4F4',
        'auth-secondary':      '#72B08C',
        'auth-secondary-strong': '#4C7E63',
        'auth-secondary-soft': '#EDF7F1',
        'auth-warm-soft':      '#FFF0EC',
      },
    },
  },
  plugins: [],
};
