import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: token("paper"),
        card: token("card"),
        fill: token("fill"),
        ink: token("ink"),
        danger: token("red"),
        warn: token("orange"),
        ok: token("green"),
        accent: token("blue"),
        // Already carry their own alpha, as Apple's label and separator colours do.
        muted: "rgb(var(--muted))",
        line: "rgb(var(--line))",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Text", "var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
