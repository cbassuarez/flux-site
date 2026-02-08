import { useEffect, useState } from "react";

export type Theme = "dark" | "light" | "blueprint";

const STORAGE_KEY = "flux.theme";
const THEMES: Theme[] = ["dark", "light", "blueprint"];

const isTheme = (value: string | null): value is Theme =>
  !!value && THEMES.includes(value as Theme);

export const getStoredTheme = (): Theme | null => {
  if (typeof window === "undefined") return null;
  try {
    const storedTheme = localStorage.getItem(STORAGE_KEY);
    return isTheme(storedTheme) ? storedTheme : null;
  } catch (error) {
    return null;
  }
};

export const getPreferredTheme = (): Theme => {
  if (typeof window === "undefined") return "dark";
  try {
    const mediaQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    if (mediaQuery?.matches) {
      return "dark";
    }
  } catch (error) {
    // no-op
  }
  return "light";
};

export const getTheme = (): Theme => getStoredTheme() ?? getPreferredTheme();

export const applyTheme = (theme: Theme) => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
};

export const persistTheme = (theme: Theme) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    // no-op
  }
};

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => getTheme());

  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  return { theme, setTheme };
};
