"use client";

import { useEffect, useState } from "react";
import { Icon } from "./ui/icon";

export function ThemeToggle() {
  // Defer reading the actual theme to a mount-only effect. The NO_FLASH_SCRIPT
  // in layout.tsx writes data-theme on <html> before hydration, so SSR and the
  // first client render both see no icon, then the effect syncs to the real value.
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
      className="inline-flex h-8 w-8 items-center justify-center rounded-pill text-fg-soft transition-colors duration-300 hover:text-fg"
    >
      {mounted ? (
        <Icon name={isDark ? "sun" : "moon"} className="h-[17px] w-[17px]" />
      ) : (
        <span aria-hidden className="inline-block h-[17px] w-[17px]" />
      )}
    </button>
  );
}
