"use client";

// src/components/theme-toggle.tsx
//
// QA audit finding F1: dozens of `dark:` Tailwind classes existed across
// the app, but nothing ever added the `.dark` class the CSS is keyed on
// (see globals.css's header comment) — dead, unreachable styling. This is
// the real toggle that makes them live, rather than stripping them.
//
// Persisted to localStorage so the choice survives a reload; falls back
// to the OS preference the first time a visitor shows up with no stored
// choice. The actual `.dark` class is applied by an inline, render-blocking
// script in the root layout's <head> (see layout.tsx) — doing it there,
// not here, is what avoids a flash of the wrong theme on first paint,
// since this component only mounts after hydration.
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@/components/icons";

const STORAGE_KEY = "certivo-theme";

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  } catch {
    // Private browsing / storage disabled — theme just won't persist
    // across reloads. Not worth failing the toggle over.
  }
}

export function ThemeToggle() {
  // Starts `null` (renders nothing) until mount, so this client-only
  // component's first render matches whatever the blocking script already
  // set — reading document state during SSR isn't possible.
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  if (isDark === null) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const next = !isDark;
        applyTheme(next);
        setIsDark(next);
      }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed bottom-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  );
}

/**
 * Inline script source for the root layout's `<head>` — must run before
 * paint (Next's `beforeInteractive` strategy) so the correct theme applies
 * on the very first frame, with no flash of the other theme. Kept as a
 * plain string (not JSX) because it has to execute as a raw, unmodified
 * `<script>` tag, outside React's render cycle.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("${STORAGE_KEY}");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;
