/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cinema: {
          bg: "#090d16",
          card: "#111827",
          accent: "#e50914",
        },
      },
    },
  },
  plugins: [],
};
