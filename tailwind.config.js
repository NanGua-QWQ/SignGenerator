/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      spacing: {
        '25px': '25px',
        '5px': '5px',
        '15px': '15px',
      },
      height: {
        '150px': '150px',
        '60px': '60px',
      },
    },
  },
  plugins: [],
}
