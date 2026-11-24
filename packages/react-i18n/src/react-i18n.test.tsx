// @vitest-environment jsdom
import type { Dictionary } from "@rcooler/i18n-core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createI18n, initialLocale } from "./index.js";

const en = { "app.hello": "Hello, {name}", "error.unknown": "Something went wrong." } as const;
const uk: Dictionary<keyof typeof en> = {
  "app.hello": "Привіт, {name}",
  "error.unknown": "Щось пішло не так.",
};

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const { I18nProvider, useI18n } = createI18n({ en, uk }, { storageKey: "test.locale" });

function Greeting() {
  const { t, locale, locales, setLocale } = useI18n();
  return (
    <>
      <p>{t("app.hello", { name: "Olena" })}</p>
      {locales.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={code === locale}
          onClick={() => setLocale(code)}
        >
          {code}
        </button>
      ))}
    </>
  );
}

describe("createI18n", () => {
  it("speaks the chosen language, switches, and remembers the choice", () => {
    render(
      <I18nProvider initialLocale="uk">
        <Greeting />
      </I18nProvider>,
    );
    expect(screen.getByText("Привіт, Olena")).toBeTruthy();
    expect(document.documentElement.lang).toBe("uk");

    fireEvent.click(screen.getByRole("button", { name: "en" }));
    expect(screen.getByText("Hello, Olena")).toBeTruthy();
    expect(document.documentElement.lang).toBe("en");
    expect(window.localStorage.getItem("test.locale")).toBe("en");
  });

  it("starts in the stored language", () => {
    window.localStorage.setItem("test.locale", "en");
    render(
      <I18nProvider>
        <Greeting />
      </I18nProvider>,
    );
    expect(screen.getByText("Hello, Olena")).toBeTruthy();
  });

  it("needs a provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Greeting />)).toThrow("I18nProvider");
  });
});

describe("initialLocale", () => {
  it("falls back to the browser's language, then to the fallback", () => {
    vi.stubGlobal("navigator", { language: "en-GB" });
    expect(initialLocale(undefined, "uk")).toBe("en");
    vi.stubGlobal("navigator", { language: "de-DE" });
    expect(initialLocale(undefined, "uk")).toBe("uk");
  });

  it("works when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    vi.stubGlobal("navigator", { language: "uk-UA" });
    expect(initialLocale("test.locale", "en")).toBe("uk");
  });
});
