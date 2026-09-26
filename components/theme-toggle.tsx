"use client";

import { useEffect, useState } from "react";
import { Icon } from "./ui/icon";

/**
 * Only an explicit choice is stored. The site opens in light mode, and a
 * visitor who picks dark keeps it. (The old "theme" key was written on every
 * load, so it can't tell a choice from a default and is ignored.)
 */
export const THEME_KEY = "rr_theme";

export function saveTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // storage unavailable (private mode): the choice lasts for this page only
  }
}

export function ThemeToggle() {
  // The NO_FLASH_SCRIPT in layout.tsx writes data-theme on <html> before
  // hydration; the mount effect reads it so SSR and the first render agree.
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.getAttribute("data-theme") === "dark");
    sync();
    setMounted(true);
    // keep the icon honest when the ⌘K palette switches the theme
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  function toggle() {
    // read the page, not local state: the ⌘K palette can switch the theme too
    const next = document.documentElement.getAttribute("data-theme") !== "dark";
    setIsDark(next);
    saveTheme(next ? "dark" : "light");
  }

  const label = mounted
    ? (isDark ? "Switch to light mode" : "Switch to dark mode")
    : "Toggle theme";

  return (
    <button
      type="button"
      onClick={toggle}
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
