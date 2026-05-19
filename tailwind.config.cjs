/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        text: "var(--text)",
        "text-soft": "var(--text-soft)",
        muted: "var(--muted)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        accent: "var(--accent)",
        "accent-bg": "var(--accent-bg)",
        "code-bg": "var(--code-bg)",
        highlight: "var(--highlight)",
      },
      fontFamily: {
        serif: ['"Charter"', '"Source Serif 4"', "Georgia", "serif"],
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
      boxShadow: { token: "var(--shadow)" },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
