import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  corePlugins: {
    preflight: false
  },
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0a1628",
          900: "#0f2744",
          800: "#1a365d",
          700: "#2563eb",
          600: "#3b82f6",
          500: "#60a5fa"
        },
        chacha: {
          amber: "#F59E0B",
          "amber-muted": "rgb(245 158 11 / 0.15)",
          teal: "#0D9488",
          "teal-muted": "rgb(13 148 136 / 0.15)"
        }
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem"
      },
      boxShadow: {
        glow: "0 0 20px -5px rgb(59 130 246 / 0.2)",
        "glow-teal": "0 0 20px -5px rgb(13 148 136 / 0.2)"
      },
      transitionDuration: {
        200: "200ms",
        300: "300ms"
      }
    }
  },
  plugins: []
};

export default config;

