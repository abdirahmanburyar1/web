"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "aquatrack-theme";

function getStored(): Theme {
  if (typeof window === "undefined") return "light";
  const s = localStorage.getItem(STORAGE_KEY);
  return s === "dark" ? "dark" : "light";
}

function setStored(theme: Theme) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}>({ theme: "light", setTheme: () => {}, toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = getStored();
    setThemeState(t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    setStored(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      setStored(next);
      return next;
    });
  }, []);

  if (!mounted) return <>{children}</>;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
