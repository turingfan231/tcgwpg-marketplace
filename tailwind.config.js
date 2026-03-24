/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#b11d23",
        orange: "#ef3b33",
        mist: "#f3eeee",
        ink: "#23262d",
        steel: "#6f727b",
        sand: "#f5efef",
        paper: "#fbf8f8",
        slatepaper: "#f0eaea",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "sans-serif"],
        body: ['"Public Sans"', "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 40px -24px rgba(91, 22, 22, 0.16)",
        lift: "0 30px 70px -34px rgba(91, 22, 22, 0.24)",
      },
      backgroundImage: {
        "market-grid":
          "linear-gradient(rgba(177,29,35,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(177,29,35,0.06) 1px, transparent 1px)",
        "hero-glow":
          "radial-gradient(circle at top left, rgba(239,59,51,0.14), transparent 22%), radial-gradient(circle at bottom right, rgba(177,29,35,0.18), transparent 28%)",
      },
    },
  },
  plugins: [],
};
