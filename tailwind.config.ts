import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FDF8F4",
        surface: "#FFFFFF",
        primary: {
          DEFAULT: "#7C3AED",
          soft: "#EDE9FE",
        },
        earthy: "#C2956B",
        score: {
          green: "#16A34A",
          amber: "#D97706",
          red: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        heading: ["Lora", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
