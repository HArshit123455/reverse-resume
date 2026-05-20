"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  // Defer reading the actual theme to a mount-only effect. The NO_FLASH_SCRIPT
  // in layout.tsx writes data-theme on <html> before hydration, so SSR and the
  // first client render both see no icon, then the effect syncs to the real value.
  // This avoids the SSR/client mismatch where localStorage is unavailable on the server.
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    window.localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark, mounted]);

  const label = mounted
    ? (isDark ? "Switch to light mode" : "Switch to dark mode")
    : "Toggle theme";

  return (
    <button
      type="button"
      onClick={() => setIsDark((v) => !v)}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-muted hover:bg-bg-sunk hover:text-fg transition-colors"
    >
      {mounted ? (
        isDark ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )
      ) : (
        <span aria-hidden className="inline-block h-4 w-4" />
      )}
    </button>
  );
}
