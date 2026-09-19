import type { Config } from "tailwindcss";

/* eslint-disable @typescript-eslint/no-require-imports */
const qh = require("./public/brand/tokens/tailwind.theme.js");

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: qh,
  },
  plugins: [],
};
export default config;
