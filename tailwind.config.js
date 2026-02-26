/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        vault: {
          900: "#0B0F19",
          800: "#111827",
          700: "#1F2937",
          500: "#6366F1",
          400: "#818CF8",
        },
      },
      boxShadow: {
        glow: "0 0 20px rgba(99, 102, 241, 0.25)",
      },
    },
  },
  plugins: [],
};
