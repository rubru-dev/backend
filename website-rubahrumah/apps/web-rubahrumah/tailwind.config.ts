import type { Config } from "tailwindcss";

// Warna brand rubahrumah.id (dari analisis frontend)
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#FF9122",
          teal: "#0B7B7B",
          blue: "#0A5168",
          "light-blue": "#BBDAFF",
          peach: "#FFDAB5",
        },
      },
      fontFamily: {
        maven: ["Maven Pro", "sans-serif"],
        montserrat: ["Montserrat", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
