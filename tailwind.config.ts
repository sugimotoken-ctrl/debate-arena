import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        claude: {
          DEFAULT: "#d97757",
          soft: "#f6ede8",
        },
        gpt: {
          DEFAULT: "#10a37f",
          soft: "#e7f5f0",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
