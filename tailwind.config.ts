import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        prompt: "#2563eb",
        agent: "#7c3aed",
        vibecode: "#059669",
      },
    },
  },
  plugins: [],
};
export default config;
