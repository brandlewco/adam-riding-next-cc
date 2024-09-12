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
        '75vh': '75vh',
      },
      maxHeight: {
        '75vh': '75vh', // Adds a custom max-height class of 70vh
      },
    },
  },
  plugins: [],
}
