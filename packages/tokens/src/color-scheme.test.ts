import { describe, expect, it } from "vitest";

import { followSystemColorScheme, type SchemeQuery } from "./color-scheme.js";

/** A media query whose answer the test changes by hand. */
function fakeQuery(matches: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches,
    addEventListener: (_type: "change", listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: "change", listener: () => void) => listeners.delete(listener),
  };
  const change = (next: boolean) => {
    query.matches = next;
    listeners.forEach((listener) => listener());
  };
  return { query: query satisfies SchemeQuery, change, listeners };
}

function fakeRoot() {
  const attributes = new Map<string, string>();
  return {
    attributes,
    root: { setAttribute: (name: string, value: string) => void attributes.set(name, value) },
  };
}

describe("followSystemColorScheme", () => {
  it("applies the system scheme at once", () => {
    const { root, attributes } = fakeRoot();
    followSystemColorScheme(root, fakeQuery(true).query);
    expect(attributes.get("data-bs-theme")).toBe("dark");

    followSystemColorScheme(root, fakeQuery(false).query);
    expect(attributes.get("data-bs-theme")).toBe("light");
  });

  it("follows a change of the system setting", () => {
    const { root, attributes } = fakeRoot();
    const { query, change } = fakeQuery(false);
    followSystemColorScheme(root, query);

    change(true);
    expect(attributes.get("data-bs-theme")).toBe("dark");
    change(false);
    expect(attributes.get("data-bs-theme")).toBe("light");
  });

  it("stops following when asked and leaves the last value", () => {
    const { root, attributes } = fakeRoot();
    const { query, change, listeners } = fakeQuery(true);
    const stop = followSystemColorScheme(root, query);

    stop();
    change(false);
    expect(listeners.size).toBe(0);
    expect(attributes.get("data-bs-theme")).toBe("dark");
  });
});
