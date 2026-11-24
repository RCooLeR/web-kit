// Follows the operating system's light or dark setting. Bootstrap switches on the data-bs-theme
// attribute, not on the media query, so something has to copy one to the other.

export type ColorScheme = "light" | "dark";

/** The attribute Bootstrap 5.3 reads the colour scheme from. */
export const SCHEME_ATTRIBUTE = "data-bs-theme";

/** The part of an element this module needs; `document.documentElement` fits. */
export interface SchemeRoot {
  setAttribute(name: string, value: string): void;
}

/** The part of a MediaQueryList this module needs. */
export interface SchemeQuery {
  readonly matches: boolean;
  addEventListener(type: "change", listener: () => void): void;
  removeEventListener(type: "change", listener: () => void): void;
}

/**
 * Sets `data-bs-theme` on `root` to the system's scheme now and whenever the system changes it.
 * Call it once at start, before the first paint if a flash of the wrong scheme matters.
 * @returns a function that stops following; the attribute keeps its last value.
 */
export function followSystemColorScheme(
  root: SchemeRoot = document.documentElement,
  query: SchemeQuery = window.matchMedia("(prefers-color-scheme: dark)"),
): () => void {
  const apply = () => {
    const scheme: ColorScheme = query.matches ? "dark" : "light";
    root.setAttribute(SCHEME_ATTRIBUTE, scheme);
  };
  apply();
  query.addEventListener("change", apply);
  return () => {
    query.removeEventListener("change", apply);
  };
}
