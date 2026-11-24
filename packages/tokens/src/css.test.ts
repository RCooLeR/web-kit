import bootstrapCss from "bootstrap/dist/css/bootstrap.css?raw";
import { describe, expect, it } from "vitest";

import { renderCss, rgbTriplet } from "./css.js";
import { dark, light, tokens } from "./theme.js";

const css = renderCss();

/** The declarations of the first rule with exactly this selector. */
function rule(selector: string): string {
  const start = css.indexOf(`${selector} {\n`);
  if (start === -1) throw new Error(`no rule for ${selector}`);
  return css.slice(start, css.indexOf("}\n", start));
}

/** The custom properties a piece of the stylesheet sets, in order. */
function propertiesSet(text: string): string[] {
  return [...text.matchAll(/^ {2}(--[\w-]+):/gm)].map((match) => match[1] ?? "");
}

describe("theme values", () => {
  it("writes every colour as #rrggbb or #rrggbbaa", () => {
    for (const scheme of [light, dark]) {
      const colors = Object.values(scheme.color).flat();
      expect(colors.length).toBeGreaterThan(30);
      for (const color of colors) expect(color).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/);
    }
  });

  it("defines the same roles for light and dark", () => {
    expect(Object.keys(dark.color)).toEqual(Object.keys(light.color));
    expect(dark.color.series).toHaveLength(light.color.series.length);
  });

  it("exports light, dark and the scheme-independent values as one JSON-ready object", () => {
    const exported = JSON.parse(JSON.stringify(tokens)) as typeof tokens;
    expect(exported.light.color.accent).toBe("#2a78d6");
    expect(exported.dark.color.accent).toBe("#3987e5");
    expect(exported.radius.control).toBe("10px");
    expect(exported.spacing.gap).toBe("16px");
  });
});

describe("rgbTriplet", () => {
  it("turns a hex colour into Bootstrap's triplet and drops the alpha", () => {
    expect(rgbTriplet("#2a78d6")).toBe("42, 120, 214");
    expect(rgbTriplet("#0f142017")).toBe("15, 20, 32");
    expect(rgbTriplet("#ffffff")).toBe("255, 255, 255");
  });
});

describe("renderCss", () => {
  it("makes light the default and binds dark to data-bs-theme", () => {
    const lightRule = rule(':root,\n[data-bs-theme="light"]');
    expect(lightRule).toContain("color-scheme: light;");
    expect(lightRule).toContain("--rc-accent: #2a78d6;");
    expect(lightRule).toContain("--rc-surface-raised: #ffffff;");
    expect(lightRule).toContain("--rc-series-1: #2a78d6;");
    expect(lightRule).toContain("--bs-body-bg: #f1f3f8;");
    expect(lightRule).toContain("--bs-primary: #2a78d6;");
    expect(lightRule).toContain("--bs-primary-rgb: 42, 120, 214;");

    const darkRule = rule('[data-bs-theme="dark"]');
    expect(darkRule).toContain("color-scheme: dark;");
    expect(darkRule).toContain("--rc-accent: #3987e5;");
    expect(darkRule).toContain("--bs-body-bg: #0d0e11;");
    expect(darkRule).toContain("--bs-body-color: #f0efec;");
  });

  it("sets the same properties in both schemes, so nothing of light shows through in dark", () => {
    expect(propertiesSet(rule('[data-bs-theme="dark"]'))).toEqual(
      propertiesSet(rule(':root,\n[data-bs-theme="light"]')),
    );
  });

  it("gives the same bytes on every call", () => {
    expect(renderCss()).toBe(css);
  });

  it("only sets Bootstrap variables that Bootstrap has", () => {
    const set = new Set(propertiesSet(css).filter((property) => property.startsWith("--bs-")));
    expect(set.size).toBeGreaterThan(60);
    const unknown = [...set].filter((variable) => !bootstrapCss.includes(`${variable}:`));
    expect(unknown).toEqual([]);
  });

  it("only refers to custom properties that exist", () => {
    const defined = new Set(propertiesSet(css));
    const used = new Set([...css.matchAll(/var\((--[\w-]+)\)/g)].map((match) => match[1] ?? ""));
    expect(used.size).toBeGreaterThan(10);
    const missing = [...used].filter(
      (variable) => !defined.has(variable) && !bootstrapCss.includes(`${variable}:`),
    );
    expect(missing).toEqual([]);
  });

  it("re-binds the components Bootstrap colours at compile time", () => {
    expect(rule(".btn-primary")).toContain("--bs-btn-bg: var(--rc-accent);");
    expect(rule(".btn-primary")).toContain("--bs-btn-hover-bg: var(--rc-accent-strong);");
    expect(rule(".card")).toContain("--bs-card-bg: var(--rc-surface);");
    expect(rule(".form-check-input:checked")).toContain("background-color: var(--rc-accent);");
  });
});
