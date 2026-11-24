// @rcooler/tokens: the shared theme. Import the stylesheet with
// `import "@rcooler/tokens/tokens.css"` after Bootstrap's CSS; this module gives the same values
// to code (charts, canvas) and the helper that follows the system's colour scheme.

export { base, dark, light, tokens } from "./theme.js";
export type { ColorRoles, HexColor, Scheme } from "./theme.js";
export { renderCss, rgbTriplet, ROLE_PREFIX } from "./css.js";
export { followSystemColorScheme, SCHEME_ATTRIBUTE } from "./color-scheme.js";
export type { ColorScheme, SchemeQuery, SchemeRoot } from "./color-scheme.js";
