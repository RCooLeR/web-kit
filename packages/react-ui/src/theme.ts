// The shell's theme: dark unless the user chose light, and that choice remembered in this browser.
import { useCallback, useState } from "react";

export type Theme = "dark" | "light";

/** Where the choice is kept unless the app names another key. */
export const DEFAULT_THEME_KEY = "rcooler.theme";

/** The remembered theme; dark when nothing is stored or storage is not available. */
export function readTheme(storageKey: string = DEFAULT_THEME_KEY): Theme {
  try {
    return window.localStorage.getItem(storageKey) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Remembers the theme; a browser that refuses storage keeps it for this page only. */
export function rememberTheme(theme: Theme, storageKey: string = DEFAULT_THEME_KEY): void {
  try {
    window.localStorage.setItem(storageKey, theme);
  } catch {
    // Private windows and blocked storage: the switch still works until the page is left.
  }
}

/** The current theme and a setter that remembers the choice. */
export function useTheme(storageKey: string = DEFAULT_THEME_KEY): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => readTheme(storageKey));
  const change = useCallback(
    (next: Theme) => {
      setTheme(next);
      rememberTheme(next, storageKey);
    },
    [storageKey],
  );
  return [theme, change];
}
