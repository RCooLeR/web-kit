// Renders the theme as one stylesheet: every role as an --rc-* custom property, and the
// Bootstrap 5.3 variables bound to those roles. Pure string building, no DOM.
//
// Only Bootstrap variables that have a matching role are set; the rest keep Bootstrap's own
// values. Bootstrap compiles the colours of some components (buttons, pagination, form focus)
// into literals instead of reading --bs-primary, so those components are re-bound below.

import { base, dark, light, type ColorRoles, type HexColor, type Scheme } from "./theme.js";

/** The prefix of the role custom properties: `--rc-accent`, `--rc-surface-raised`. */
export const ROLE_PREFIX = "--rc-";

/** `"#2a78d6"` to `"42, 120, 214"`, the form Bootstrap's `*-rgb` variables hold. Alpha is dropped. */
export function rgbTriplet(color: HexColor): string {
  const channel = (offset: number) => Number.parseInt(color.slice(offset, offset + 2), 16);
  return `${channel(1)}, ${channel(3)}, ${channel(5)}`;
}

/** `surfaceRaised` to `surface-raised`. */
function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

type Declaration = readonly [property: string, value: string];

function roleDeclarations(scheme: Scheme): Declaration[] {
  const declarations: Declaration[] = [];
  for (const [role, value] of Object.entries(scheme.color)) {
    if (typeof value === "string") {
      declarations.push([`${ROLE_PREFIX}${kebab(role)}`, value]);
    }
  }
  scheme.color.series.forEach((color, index) => {
    declarations.push([`${ROLE_PREFIX}series-${index + 1}`, color]);
  });
  declarations.push([`${ROLE_PREFIX}shadow-card`, scheme.shadow.card]);
  declarations.push([`${ROLE_PREFIX}shadow-pop`, scheme.shadow.pop]);
  return declarations;
}

/** A Bootstrap colour variable together with its `-rgb` twin. */
function withRgb(variable: string, color: HexColor): Declaration[] {
  return [
    [variable, color],
    [`${variable}-rgb`, rgbTriplet(color)],
  ];
}

/** One of Bootstrap's theme colours: the fill, its text form and its tinted background. */
function themeColor(name: string, fill: HexColor, text: HexColor, subtle: HexColor): Declaration[] {
  return [
    ...withRgb(`--bs-${name}`, fill),
    [`--bs-${name}-text-emphasis`, text],
    [`--bs-${name}-bg-subtle`, subtle],
  ];
}

function bootstrapDeclarations(color: ColorRoles): Declaration[] {
  return [
    ...withRgb("--bs-body-bg", color.page),
    ...withRgb("--bs-body-color", color.text),
    ...withRgb("--bs-emphasis-color", color.text),
    ...withRgb("--bs-secondary-color", color.textSecondary),
    ...withRgb("--bs-secondary-bg", color.surfaceSunken),
    ...withRgb("--bs-tertiary-color", color.textMuted),
    ...withRgb("--bs-tertiary-bg", color.surface),
    ["--bs-border-color", color.border],
    ["--bs-border-color-translucent", color.border],
    ...themeColor("primary", color.accent, color.accentText, color.accentSoft),
    ["--bs-primary-border-subtle", color.trackOk],
    ...themeColor("info", color.accent, color.accentText, color.noticeInfo),
    ["--bs-info-border-subtle", color.trackOk],
    ...themeColor("success", color.statusGood, color.statusGoodText, color.noticeGood),
    ...themeColor("warning", color.statusWarning, color.statusWarningText, color.noticeWarning),
    ["--bs-warning-border-subtle", color.trackWarning],
    ...themeColor("danger", color.statusCritical, color.statusCriticalText, color.noticeError),
    ["--bs-danger-border-subtle", color.trackCritical],
    ...withRgb("--bs-link-color", color.accentText),
    ...withRgb("--bs-link-hover-color", color.accentStrong),
    ["--bs-focus-ring-color", `rgba(${rgbTriplet(color.accent)}, 0.25)`],
  ];
}

/** Declarations that are the same in both schemes. */
function baseDeclarations(): Declaration[] {
  return [
    [`${ROLE_PREFIX}radius-card`, base.radius.card],
    [`${ROLE_PREFIX}radius-control`, base.radius.control],
    [`${ROLE_PREFIX}gap`, base.spacing.gap],
    ["--bs-border-radius", base.radius.control],
    ["--bs-border-radius-lg", base.radius.card],
    ["--bs-font-sans-serif", base.font.family],
    ["--bs-body-font-size", base.font.size],
    ["--bs-body-line-height", base.font.lineHeight],
    ["--bs-box-shadow-sm", `var(${ROLE_PREFIX}shadow-card)`],
    ["--bs-box-shadow", `var(${ROLE_PREFIX}shadow-pop)`],
  ];
}

function block(selector: string, declarations: readonly Declaration[]): string {
  const lines = declarations.map(([property, value]) => `  ${property}: ${value};`);
  return `${selector} {\n${lines.join("\n")}\n}\n`;
}

function schemeBlock(selector: string, name: "light" | "dark", scheme: Scheme): string {
  return block(selector, [
    ["color-scheme", name],
    ...roleDeclarations(scheme),
    ...bootstrapDeclarations(scheme.color),
  ]);
}

const focusRing: Declaration[] = [
  ["border-color", "var(--rc-accent)"],
  ["box-shadow", "0 0 0 0.25rem var(--bs-focus-ring-color)"],
];

/** Components whose colours Bootstrap fixes at compile time, re-bound to the roles. */
const components: ReadonlyArray<readonly [selector: string, declarations: Declaration[]]> = [
  [
    ".btn-primary",
    [
      ["--bs-btn-color", "var(--rc-on-accent)"],
      ["--bs-btn-bg", "var(--rc-accent)"],
      ["--bs-btn-border-color", "var(--rc-accent)"],
      ["--bs-btn-hover-color", "var(--rc-on-accent)"],
      ["--bs-btn-hover-bg", "var(--rc-accent-strong)"],
      ["--bs-btn-hover-border-color", "var(--rc-accent-strong)"],
      ["--bs-btn-focus-shadow-rgb", "var(--bs-primary-rgb)"],
      ["--bs-btn-active-color", "var(--rc-on-accent)"],
      ["--bs-btn-active-bg", "var(--rc-accent-strong)"],
      ["--bs-btn-active-border-color", "var(--rc-accent-strong)"],
      ["--bs-btn-disabled-color", "var(--rc-on-accent)"],
      ["--bs-btn-disabled-bg", "var(--rc-accent)"],
      ["--bs-btn-disabled-border-color", "var(--rc-accent)"],
    ],
  ],
  [
    ".btn-outline-primary",
    [
      ["--bs-btn-color", "var(--rc-accent-text)"],
      ["--bs-btn-border-color", "var(--rc-accent)"],
      ["--bs-btn-hover-color", "var(--rc-on-accent)"],
      ["--bs-btn-hover-bg", "var(--rc-accent)"],
      ["--bs-btn-hover-border-color", "var(--rc-accent)"],
      ["--bs-btn-focus-shadow-rgb", "var(--bs-primary-rgb)"],
      ["--bs-btn-active-color", "var(--rc-on-accent)"],
      ["--bs-btn-active-bg", "var(--rc-accent)"],
      ["--bs-btn-active-border-color", "var(--rc-accent)"],
      ["--bs-btn-disabled-color", "var(--rc-accent-text)"],
      ["--bs-btn-disabled-border-color", "var(--rc-accent)"],
    ],
  ],
  [
    ".card",
    [
      ["--bs-card-bg", "var(--rc-surface)"],
      ["--bs-card-border-color", "var(--rc-border)"],
      ["--bs-card-border-radius", "var(--rc-radius-card)"],
      ["--bs-card-inner-border-radius", "calc(var(--rc-radius-card) - var(--bs-border-width))"],
      ["box-shadow", "var(--rc-shadow-card)"],
    ],
  ],
  [
    ".modal",
    [
      ["--bs-modal-bg", "var(--rc-surface-raised)"],
      ["--bs-modal-border-color", "var(--rc-border)"],
      ["--bs-modal-border-radius", "var(--rc-radius-card)"],
      ["--bs-modal-box-shadow", "var(--rc-shadow-pop)"],
    ],
  ],
  [
    ".modal-backdrop",
    [
      // The role already carries its transparency.
      ["--bs-backdrop-bg", "var(--rc-backdrop)"],
      ["--bs-backdrop-opacity", "1"],
    ],
  ],
  [
    ".dropdown-menu",
    [
      ["--bs-dropdown-bg", "var(--rc-surface-raised)"],
      ["--bs-dropdown-border-color", "var(--rc-border)"],
      ["--bs-dropdown-link-active-color", "var(--rc-on-accent)"],
      ["--bs-dropdown-link-active-bg", "var(--rc-accent)"],
    ],
  ],
  [
    ".nav-pills",
    [
      ["--bs-nav-pills-link-active-color", "var(--rc-on-accent)"],
      ["--bs-nav-pills-link-active-bg", "var(--rc-accent)"],
    ],
  ],
  [
    ".list-group",
    [
      ["--bs-list-group-bg", "var(--rc-surface)"],
      ["--bs-list-group-border-color", "var(--rc-border)"],
      ["--bs-list-group-active-color", "var(--rc-on-accent)"],
      ["--bs-list-group-active-bg", "var(--rc-accent)"],
      ["--bs-list-group-active-border-color", "var(--rc-accent)"],
    ],
  ],
  [
    ".pagination",
    [
      ["--bs-pagination-active-color", "var(--rc-on-accent)"],
      ["--bs-pagination-active-bg", "var(--rc-accent)"],
      ["--bs-pagination-active-border-color", "var(--rc-accent)"],
    ],
  ],
  [
    ".progress,\n.progress-stacked",
    [
      ["--bs-progress-bg", "var(--rc-track-ok)"],
      ["--bs-progress-bar-color", "var(--rc-on-accent)"],
      ["--bs-progress-bar-bg", "var(--rc-accent)"],
    ],
  ],
  [".form-control:focus,\n.form-select:focus,\n.form-check-input:focus", focusRing],
  [
    ".form-check-input:checked",
    [
      ["background-color", "var(--rc-accent)"],
      ["border-color", "var(--rc-accent)"],
    ],
  ],
];

/**
 * Returns the stylesheet. Load it after Bootstrap's own CSS. Light is the default; an element
 * with `data-bs-theme="dark"` (normally `<html>`) switches itself and everything inside to dark.
 * The output depends on the theme values alone, so the same version always gives the same bytes.
 */
export function renderCss(): string {
  return [
    "/* Generated by @rcooler/tokens from src/theme.ts. Do not edit. */\n",
    schemeBlock(':root,\n[data-bs-theme="light"]', "light", light),
    schemeBlock('[data-bs-theme="dark"]', "dark", dark),
    block(":root", baseDeclarations()),
    ...components.map(([selector, declarations]) => block(selector, declarations)),
  ].join("\n");
}
