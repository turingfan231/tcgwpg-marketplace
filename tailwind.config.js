/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#1a5b78",
        orange: "#ff9900",
        mist: "#ecf2f5",
        ink: "#163445",
        steel: "#5e7785",
        sand: "#f4f0e8",
        paper: "#fbf8f1",
        slatepaper: "#f2efe7",
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
          "linear-gradient(rgba(26,91,120,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(26,91,120,0.08) 1px, transparent 1px)",
        "hero-glow":
          "radial-gradient(circle at top left, rgba(255,153,0,0.18), transparent 24%), radial-gradient(circle at bottom right, rgba(255,255,255,0.14), transparent 30%)",
      },
    },
  },
  plugins: [],
};
