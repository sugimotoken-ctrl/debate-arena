import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        sans: ["var(--font-sans)", "Segoe UI", "Tahoma", "sans-serif"],
      },
      colors: {
        ink: "#14141C",
        ink2: "#3A3A48",
        muted: "#6B6B7B",
        muted2: "#8A8A9A",
        faint: "#9A9AAC",
        page: "#F6F7FB",
        coral: "#FF6B4A",
        amber: "#FF9F1C",
        green: "#12B981",
        greenD: "#0E9E6E",
        blue: "#2E7BFF",
        violet: "#6C5CFF",
        // legacy aliases still referenced in some result views
        claude: { DEFAULT: "#FF6B4A" },
        gpt: { DEFAULT: "#6C5CFF" },
      },
    },
  },
  plugins: [],
} satisfies Config;
