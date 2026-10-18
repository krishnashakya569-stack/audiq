"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

export type AudiqTheme = "dark" | "light";

type ThemeContextValue = {
  theme: AudiqTheme;
  setTheme: (theme: AudiqTheme) => void;
};

type ThemeListener = () => void;

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = "audiq-theme";
const listeners = new Set<ThemeListener>();
let activeTheme: AudiqTheme = "dark";

function applyTheme(theme: AudiqTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function subscribe(listener: ThemeListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return activeTheme;
}

function getServerSnapshot(): AudiqTheme {
  return "dark";
}

function publishTheme(theme: AudiqTheme) {
  activeTheme = theme;
  applyTheme(theme);
  listeners.forEach((listener) => listener());
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const initialTheme = storedTheme === "light" ? "light" : "dark";
    if (initialTheme !== activeTheme) publishTheme(initialTheme);
    else applyTheme(initialTheme);
  }, []);

  const setTheme = useCallback((nextTheme: AudiqTheme) => {
    publishTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAudiqTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAudiqTheme must be used inside ThemeProvider");
  }
  return context;
}
