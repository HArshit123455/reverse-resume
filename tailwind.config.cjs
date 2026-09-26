/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
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
        nav: "var(--nav)",
      },
      fontFamily: {
        sans: ["var(--sans)"],
        serif: ["var(--sans)"],
        mono: ["var(--mono)"],
      },
      borderRadius: {
        pill: "var(--radius-pill)",
        tile: "var(--radius-lg)",
      },
      boxShadow: {
        sm: "none",
        md: "none",
      },
      transitionTimingFunction: {
        stage: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
