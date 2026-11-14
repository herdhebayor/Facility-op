"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

export type SiteTheme = "system" | "light" | "dark";

const STORAGE_KEY = "facility-site-theme";
const CHANGE_EVENT = "facility-site-theme-change";
const ThemeContext = createContext<SiteTheme>("system");

function readTheme(): SiteTheme {
  if (typeof window === "undefined") return "system";
  const storedTheme = window.localStorage.getItem(STORAGE_KEY);
  return storedTheme === "light" || storedTheme === "dark" ? storedTheme : "system";
}

function getServerTheme(): SiteTheme {
  return "system";
}

function subscribeToThemeChanges(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setSiteTheme(theme: SiteTheme) {
  window.localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useSiteTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeToThemeChanges, readTheme, getServerTheme);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const prefersDark = mediaQuery.matches;
      const isDark = theme === "dark" || (theme === "system" && prefersDark);
      root.dataset.theme = isDark ? "dark" : "light";
      root.style.colorScheme = isDark ? "dark" : "light";
    };
    applyTheme();
    mediaQuery.addEventListener("change", applyTheme);
    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [theme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
