/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // New tokens
        bg: "var(--bg)",
        "bg-elev": "var(--bg-elev)",
        "bg-sunk": "var(--bg-sunk)",
        fg: "var(--fg)",
        "fg-soft": "var(--fg-soft)",
        muted: "var(--muted)",
        "muted-2": "var(--muted-2)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        "accent-ink": "var(--accent-ink)",
      },
      fontFamily: {
        serif: ['var(--serif)', '"Charter"', '"Source Serif 4"', "Georgia", "serif"],
        sans: ['var(--sans)', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['var(--mono)', "ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
      borderRadius: {
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
