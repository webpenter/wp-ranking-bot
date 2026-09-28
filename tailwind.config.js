/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./popup.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bbdaff',
          300: '#8dc1ff',
          400: '#589eff',
          500: '#307aff',
          600: '#1b5cf5',
          700: '#1446e1',
          800: '#173ab6',
          900: '#18348f',
          950: '#122057',
        },
      },
    },
  },
  plugins: [],
}
