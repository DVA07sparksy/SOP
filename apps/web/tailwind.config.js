/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eaf5f2",
          100: "#cbe7df",
          400: "#2e7d6b",
          600: "#1f4e5f",
          700: "#173b48",
        },
      },
    },
  },
  plugins: [],
};
