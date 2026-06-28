/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./hooks/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "Arial", "sans-serif"] },
      colors: {
        accent: { DEFAULT: "#285f90", light: "#e9f2ff", dark: "#03497a" },
        pass: { DEFAULT: "#16713b", bg: "#dcf6e4" }, fail: { DEFAULT: "#ba1a1a", bg: "#ffdad6" }, hold: { DEFAULT: "#9a4f00", bg: "#ffdfbd" }, info: { DEFAULT: "#285f90", bg: "#d0e4ff" },
        surface: "#f9f9ff", bdr: "#c1c6d5", tp: "#181c22", ts: "#5d6270", tm: "#8c92a0"
      },
      borderRadius: { DEFAULT: "8px", lg: "12px", xl: "16px" },
      boxShadow: { card: "0 8px 24px rgba(37, 50, 79, .08)" }
    }
  },
  plugins: []
};
