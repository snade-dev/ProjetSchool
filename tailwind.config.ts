import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        lamaSky: "rgb(var(--lama-sky) / <alpha-value>)",
        lamaSkyLight: "rgb(var(--lama-sky-light) / <alpha-value>)",
        lamaPurple: "rgb(var(--lama-purple) / <alpha-value>)",
        lamaPurpleLight: "rgb(var(--lama-purple-light) / <alpha-value>)",
        lamaYellow: "rgb(var(--lama-yellow) / <alpha-value>)",
        lamaYellowLight: "rgb(var(--lama-yellow-light) / <alpha-value>)"
      },
    },
  },
  plugins: [],
};
export default config;
