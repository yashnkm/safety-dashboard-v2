/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          ivory: '#ede7dc',
          sand: '#dcd2cc',
          rose: '#ccafa5',
          gray: '#bdc3cb',
        },
      },
      fontFamily: {
        sans: ['Open Sans', 'sans-serif'],
        secondary: ['Montserrat', 'sans-serif'],
      },
    },
  },
}
