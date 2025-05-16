/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      height : {
        '85vh': 'calc(85vh - 2rem)',
      },
      maxHeight: {
        '85vh': '85vh', // Adds a custom max-height class of 70vh
      },
      inset: {
        '1/6': '16.666667%', 
      },
      maxWidth: {
        '8xl': '90rem',   // 1440 px
        '9xl': '100rem',  // 1600 px
      },
    },
  },
  plugins: [],
}
