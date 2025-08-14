import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          600: "#1d4ed8",
          700: "#1e40af",
        },
      },
      boxShadow: {
        soft: "0 6px 20px rgba(0,0,0,0.08)",
      },
    },
  },
  darkMode: "class",
  plugins: [],
} satisfies Config;
