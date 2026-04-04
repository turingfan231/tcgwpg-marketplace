/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#d32f2f",
        orange: "#930010",
        ink: "#e7e5e5",
        steel: "#9f9d9d",
        mist: "#191a1a",
        paper: "#131313",
        slatepaper: "#1f2020",
      },
      fontFamily: {
        display: ['"Manrope"', "sans-serif"],
        body: ['"Inter"', "sans-serif"],
      },
      boxShadow: {
        soft: "0 24px 60px -36px rgba(0,0,0,0.62)",
        lift: "0 34px 90px -44px rgba(0,0,0,0.74)",
      },
    },
  },
  plugins: [],
};
