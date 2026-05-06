/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./hooks/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["IBM Plex Sans", "Arial", "sans-serif"] },
      colors: {
        accent: { DEFAULT: "#0F6E56", light: "#E1F5EE", dark: "#085041" },
        pass: { DEFAULT: "#3B6D11", bg: "#EAF3DE" },
        fail: { DEFAULT: "#A32D2D", bg: "#FCEBEB" },
        hold: { DEFAULT: "#854F0B", bg: "#FAEEDA" },
        info: { DEFAULT: "#185FA5", bg: "#E6F1FB" },
        surface: "#f7f7f5",
        bdr: "#e5e5e3",
        tp: "#1a1a18",
        ts: "#6b6b68",
        tm: "#9d9d9a"
      },
      borderRadius: { DEFAULT: "6px" }
    }
  },
  plugins: []
};
