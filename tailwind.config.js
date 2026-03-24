/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#f03737",
        orange: "#6d86f0",
        mist: "#e6eef4",
        ink: "#112738",
        steel: "#617989",
        sand: "#e8eef3",
        paper: "#f4f8fb",
        slatepaper: "#edf3f7",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "sans-serif"],
        body: ['"Public Sans"', "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 40px -24px rgba(22, 52, 69, 0.18)",
        lift: "0 30px 70px -34px rgba(22, 52, 69, 0.26)",
      },
      backgroundImage: {
        "market-grid":
          "linear-gradient(rgba(20,54,74,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(20,54,74,0.08) 1px, transparent 1px)",
        "hero-glow":
          "radial-gradient(circle at top left, rgba(109,134,240,0.18), transparent 22%), radial-gradient(circle at bottom right, rgba(240,55,55,0.18), transparent 28%)",
      },
    },
  },
  plugins: [],
};
