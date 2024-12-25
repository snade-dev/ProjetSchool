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
        lamaSky: "#A6D8F7",        // Un bleu doux mais plus saturé
        lamaSkyLight: "#C8E9F8",   // Un bleu pâle et lumineux
        lamaPurple: "#B5A4F1",     // Un violet doux avec un ton plus prononcé
        lamaPurpleLight: "#D4C9FF",// Un violet très clair et apaisant
        lamaYellow: "#F1D76D",     // Un jaune plus doux, moins intense
        lamaYellowLight: "#F9F0B5" // Un jaune pâle mais encore lumineux
      },
    },
  },
  plugins: [],
};
export default config;
