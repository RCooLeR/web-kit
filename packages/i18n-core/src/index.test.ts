import { describe, expect, it } from "vitest";

import {
  createTranslator,
  errorCode,
  fill,
  toLocale,
  type Dictionaries,
  type Dictionary,
  type Translator,
} from "./index.js";

// The way an app declares its texts: English is the contract, Ukrainian must match it.
const en = {
  "common.save": "Save",
  "invite.intro": "Join the family “{family}” as: {role}.",
  "records.one": "{count} record",
  // English never selects these two, but the contract lists every form some language needs.
  "records.few": "{count} records",
  "records.many": "{count} records",
  "records.other": "{count} records",
  "error.unknown": "Something went wrong. Try again.",
  "error.not_found": "Not found. It may have been deleted.",
  "event.incident.opened": "Incident opened",
} as const;
type MessageKey = keyof typeof en;

const uk: Dictionary<MessageKey> = {
  "common.save": "Зберегти",
  "invite.intro": "Приєднайтеся до сім'ї «{family}» як: {role}.",
  "records.one": "{count} запис",
  "records.few": "{count} записи",
  "records.many": "{count} записів",
  "records.other": "{count} записів",
  "error.unknown": "Щось пішло не так. Спробуйте ще раз.",
  "error.not_found": "Не знайдено. Можливо, це вже видалено.",
  "event.incident.opened": "Інцидент відкрито",
};

const dictionaries: Dictionaries<MessageKey> = { en, uk };

describe("toLocale", () => {
  it("maps a language tag to a supported locale", () => {
    expect(toLocale("uk-UA")).toBe("uk");
    expect(toLocale("EN-us")).toBe("en");
    expect(toLocale("en")).toBe("en");
  });

  it("falls back for an unsupported or missing tag", () => {
    expect(toLocale("de-DE")).toBe("uk");
    expect(toLocale(undefined)).toBe("uk");
    expect(toLocale("pl", "en")).toBe("en");
  });
});

describe("fill", () => {
  it("fills named placeholders, numbers included", () => {
    expect(fill("{count} of {total}", { count: 2, total: 10 })).toBe("2 of 10");
  });

  it("leaves a placeholder without a value visible", () => {
    expect(fill("Hello, {name}!")).toBe("Hello, {name}!");
    expect(fill("Hello, {name}!", { other: "x" })).toBe("Hello, {name}!");
  });

  it("does not treat a value as a template", () => {
    expect(fill("{a}", { a: "{b}", b: "nested" })).toBe("{b}");
  });
});

describe("createTranslator", () => {
  const english = createTranslator(dictionaries, "en");
  const ukrainian = createTranslator(dictionaries, "uk");

  it("speaks the language it was created for", () => {
    expect(english.locale).toBe("en");
    expect(english.t("common.save")).toBe("Save");
    expect(ukrainian.t("common.save")).toBe("Зберегти");
  });

  it("fills placeholders in the translated text", () => {
    expect(ukrainian.t("invite.intro", { family: "Коваленки", role: "власник" })).toBe(
      "Приєднайтеся до сім'ї «Коваленки» як: власник.",
    );
  });

  it("looks up a key built from data and says when there is none", () => {
    expect(english.lookup("event.incident.opened")).toBe("Incident opened");
    expect(english.lookup("event.never.heard.of")).toBeUndefined();
    // A key that happens to name something every object has is still not a text.
    expect(english.lookup("toString")).toBeUndefined();
  });

  it("picks the error text by the error's code", () => {
    expect(english.errorText({ code: "not_found" })).toBe("Not found. It may have been deleted.");
    expect(ukrainian.errorText({ code: "not_found" })).toBe(
      "Не знайдено. Можливо, це вже видалено.",
    );
  });

  it("uses the unknown-error text for a code without text or an error without code", () => {
    const fallback = "Something went wrong. Try again.";
    expect(english.errorText({ code: "teapot" })).toBe(fallback);
    expect(english.errorText(new Error("pq: relation users does not exist"))).toBe(fallback);
    expect(english.errorText(undefined)).toBe(fallback);
    expect(english.errorText("not_found")).toBe(fallback);
  });

  it("never shows the error's own message", () => {
    const leaked = Object.assign(new Error("internal detail"), { code: "teapot" });
    expect(english.errorText(leaked)).not.toContain("internal detail");
  });

  it("chooses the plural form of the language", () => {
    const counts = (translator: typeof english, list: number[]) =>
      list.map((count) => translator.plural("records", count));

    expect(counts(english, [1, 2, 0])).toEqual(["1 record", "2 records", "0 records"]);
    expect(counts(ukrainian, [0, 1, 2, 5, 11, 21, 22, 111])).toEqual([
      "0 записів",
      "1 запис",
      "2 записи",
      "5 записів",
      "11 записів",
      "21 запис",
      "22 записи",
      "111 записів",
    ]);
  });

  it("falls back to the other form when the language's own form is missing", () => {
    // A dictionary loaded from outside the type system, without the "few" form.
    const { "records.few": _dropped, ...withoutFew } = uk;
    const sparse = createTranslator({ en, uk: withoutFew as typeof uk }, "uk");
    expect(sparse.plural("records", 2)).toBe("2 записів");
  });

  it("lets the caller set the count's text", () => {
    expect(english.plural("records", 1200, { count: "1,200" })).toBe("1,200 records");
  });
});

describe("the types", () => {
  it("give a translator over every key of the dictionaries, error.unknown included", () => {
    // What a provider does: keep the translator under the app's own key type and hand its
    // functions out separately. This must compile.
    const translator: Translator<MessageKey> = createTranslator(dictionaries, "en");
    const { t, errorText } = translator;
    expect(t("error.unknown")).toBe(errorText(undefined));
  });

  it("refuse dictionaries without the unknown-error text", () => {
    const partial = { en: { "common.save": "Save" }, uk: { "common.save": "Зберегти" } };
    // @ts-expect-error: error.unknown is missing
    const translator = createTranslator(partial, "en");
    // At run time the gap shows as an undefined text, which is why the compiler must catch it.
    expect(translator.errorText(undefined)).toBeUndefined();
  });
});

describe("errorCode", () => {
  it("reads a string code and nothing else", () => {
    expect(errorCode({ code: "timeout" })).toBe("timeout");
    expect(errorCode({ code: 504 })).toBeUndefined();
    expect(errorCode(null)).toBeUndefined();
    expect(errorCode("timeout")).toBeUndefined();
  });
});
