import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101828",
        mist: "#f4f7f6",
        signal: "#19a974",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Arial", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: { soft: "0 24px 70px -32px rgba(16, 24, 40, .35)" },
    },
  },
  plugins: [],
};
export default config;
