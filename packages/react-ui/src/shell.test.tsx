// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppShell, type NavGroup, type SignOut } from "./AppShell.js";
import { iconNames } from "./icons.js";
import {
  CheckLine,
  Field,
  Input,
  Plate,
  Progress,
  RowGrid,
  Segmented,
  Stat,
  Tabs,
} from "./parts.js";
import { DEFAULT_THEME_KEY } from "./theme.js";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const nav: NavGroup[] = [
  {
    items: [
      { href: "#/", label: "Огляд", icon: "overview", current: true },
      { href: "#/apps", label: "Застосунки й канали", icon: "bell", count: 5, countTone: "warn" },
      { href: "#/empty", label: "Нічого", icon: "list", count: 0 },
    ],
  },
  { label: "Довідка", items: [{ href: "#/help", label: "Довідник", icon: "book" }] },
];

function Shell(props: { cockpit?: string; nav?: NavGroup[]; signOut?: SignOut }) {
  const [language, setLanguage] = useState("uk");
  return (
    <AppShell
      name="Herald"
      subtitle="Служба сповіщень"
      icon="send"
      navLabel="Розділи"
      nav={props.nav ?? nav}
      {...(props.cockpit ? { cockpit: { href: props.cockpit, label: "Cockpit" } } : {})}
      {...(props.signOut ? { signOut: props.signOut } : {})}
      footer="1a2b3c4"
      languages={{
        label: "Мова",
        current: language,
        options: [
          { code: "uk", label: "UK" },
          { code: "en", label: "EN" },
        ],
        onChange: setLanguage,
      }}
      themeLabel="Світла тема"
    >
      <h1 className="h1">Огляд</h1>
    </AppShell>
  );
}

describe("AppShell", () => {
  it("draws the brand, the groups and the counts, and marks the current page", () => {
    render(<Shell />);
    const navigation = screen.getByRole("navigation", { name: "Розділи" });
    expect(navigation.querySelector(".bn")?.textContent).toBe("Herald");
    const current = screen.getByRole("link", { name: "Огляд" });
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(current.className).toBe("nav on");
    const apps = screen.getByRole("link", { name: /Застосунки й канали/ });
    expect(apps.querySelector(".cnt.wr")?.textContent).toBe("5");
    expect(screen.getByRole("link", { name: "Нічого" }).querySelector(".cnt")).toBeNull();
    expect(screen.getByText("Довідка").className).toBe("grp");
    expect(screen.getByRole("main").textContent).toBe("Огляд");
  });

  it("shows the cockpit link only when the app knows the cockpit", () => {
    render(<Shell />);
    expect(screen.queryByRole("link", { name: "Cockpit" })).toBeNull();
    cleanup();
    render(<Shell cockpit="https://cockpit.example.test/" />);
    const link = screen.getByRole("link", { name: "Cockpit" });
    expect(link.getAttribute("href")).toBe("https://cockpit.example.test/");
    expect(link.compareDocumentPosition(screen.getByRole("link", { name: "Огляд" }))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("is dark by default and remembers the switch to light", () => {
    render(<Shell />);
    const app = document.querySelector(".app");
    expect(app?.classList.contains("light")).toBe(false);
    const toggle = screen.getByRole("button", { name: "Світла тема" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(app?.classList.contains("light")).toBe(true);
    expect(window.localStorage.getItem(DEFAULT_THEME_KEY)).toBe("light");
    cleanup();
    render(<Shell />);
    expect(document.querySelector(".app")?.classList.contains("light")).toBe(true);
  });

  it("switches the language with real buttons", () => {
    render(<Shell />);
    const group = screen.getByRole("group", { name: "Мова" });
    const english = screen.getByRole("button", { name: "EN" });
    expect(group.contains(english)).toBe(true);
    expect(english.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(english);
    expect(english.getAttribute("aria-pressed")).toBe("true");
    expect(english.className).toBe("chip ac");
  });
});

describe("AppShell brands", () => {
  it("names its brand on the .app element only when one is given", () => {
    render(<Shell />);
    expect(document.querySelector(".app")?.hasAttribute("data-brand")).toBe(false);
    cleanup();
    render(
      <AppShell
        name="HomeLedger"
        brand="homeledger"
        navLabel="Розділи"
        nav={nav}
        themeLabel="Світла тема"
      >
        <p>page</p>
      </AppShell>,
    );
    expect(document.querySelector(".app")?.getAttribute("data-brand")).toBe("homeledger");
  });

  it("draws the brand's own mark instead of an icon, in the sidebar and the top bar", () => {
    render(
      <AppShell
        name="HomeLedger"
        mark={<svg data-testid="logo" aria-hidden="true" />}
        navLabel="Розділи"
        nav={nav}
        themeLabel="Світла тема"
      >
        <p>page</p>
      </AppShell>,
    );
    const marks = document.querySelectorAll(".mark");
    expect(marks).toHaveLength(2);
    marks.forEach((mark) => {
      expect(mark.querySelector("[data-testid=logo]")).not.toBeNull();
      expect(mark.querySelector(".i")).toBeNull();
    });
  });
});

describe("AppShell at phone width", () => {
  const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));
  const parts = () => {
    const bar = document.querySelector<HTMLElement>(".topbar");
    const menu = bar?.querySelector<HTMLButtonElement>("button.menu");
    if (!bar || !menu) throw new Error("no top bar");
    return { bar, menu, navigation: screen.getByRole("navigation", { name: "Розділи" }) };
  };

  it("names the current page in the top bar and opens the navigation from its menu button", async () => {
    render(<Shell />);
    const { bar, menu, navigation } = parts();
    expect(bar.querySelector(".bn")?.textContent).toBe("Огляд");
    expect(menu.getAttribute("aria-label")).toBe("Розділи");
    expect(menu.getAttribute("aria-expanded")).toBe("false");
    expect(menu.getAttribute("aria-controls")).toBe(navigation.id);
    expect(navigation.classList.contains("open")).toBe(false);
    menu.focus();
    fireEvent.click(menu);
    expect(menu.getAttribute("aria-expanded")).toBe("true");
    expect(navigation.classList.contains("open")).toBe(true);
    expect(bar.hasAttribute("inert")).toBe(true);
    expect(screen.getByRole("main").hasAttribute("inert")).toBe(true);
    await settle();
    expect(navigation.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(navigation.classList.contains("open")).toBe(false);
    expect(bar.hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(menu);
  });

  it("closes on choosing an entry, on a tap outside and with its close button", () => {
    render(<Shell cockpit="#/cockpit" />);
    const { menu, navigation } = parts();
    for (const close of [
      () => screen.getByRole("link", { name: "Довідник" }),
      () => screen.getByRole("link", { name: "Cockpit" }),
      () => document.querySelector(".scrim"),
      () => navigation.querySelector("button.shut"),
    ]) {
      fireEvent.click(menu);
      expect(navigation.classList.contains("open")).toBe(true);
      const target = close();
      if (!target) throw new Error("nothing to tap");
      fireEvent.click(target);
      expect(navigation.classList.contains("open")).toBe(false);
      expect(menu.getAttribute("aria-expanded")).toBe("false");
    }
    expect(document.querySelector(".scrim")).toBeNull();
  });

  it("closes when the window grows past phone width", () => {
    const listeners: (() => void)[] = [];
    const query = {
      matches: true,
      addEventListener: (_type: string, listener: () => void) => listeners.push(listener),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => query),
    );
    try {
      render(<Shell />);
      const { menu, navigation } = parts();
      fireEvent.click(menu);
      query.matches = false;
      act(() => listeners.forEach((listener) => listener()));
      expect(navigation.classList.contains("open")).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("marks the menu button while an entry has a count, in the problem colour unless all warn", () => {
    render(<Shell />);
    expect(parts().menu.querySelector(".mdot")?.className).toBe("mdot");
    cleanup();
    render(
      <Shell nav={[{ items: [{ href: "#/", label: "Огляд", icon: "overview", count: 2 }] }]} />,
    );
    expect(parts().menu.querySelector(".mdot")?.className).toBe("mdot bd");
    cleanup();
    render(
      <Shell nav={[{ items: [{ href: "#/", label: "Огляд", icon: "overview", count: 0 }] }]} />,
    );
    expect(parts().menu.querySelector(".mdot")).toBeNull();
    expect(parts().bar.querySelector(".bn")?.textContent).toBe("Herald");
  });

  it("signs out from a labelled button at the foot of the sidebar, inside the menu", () => {
    const onSignOut = vi.fn();
    render(<Shell signOut={{ label: "Вийти", onSignOut }} />);
    const { menu, navigation } = parts();
    const button = screen.getByRole("button", { name: "Вийти" });
    expect(navigation.contains(button)).toBe(true);
    expect(button.nextElementSibling?.className).toBe("foot");
    expect(button.parentElement?.className).toBe("sfoot");
    expect(navigation.lastElementChild).toBe(button.parentElement);
    fireEvent.click(menu);
    fireEvent.click(button);
    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(navigation.classList.contains("open")).toBe(false);
    cleanup();
    render(<Shell />);
    expect(screen.queryByRole("button", { name: "Вийти" })).toBeNull();
  });
});

describe("parts", () => {
  it("labels a field's control and points it at the hint and the problem", () => {
    render(
      <Field label="Токен" hint="З файлу секретів" error="Немає файлу">
        {(control) => <Input {...control} />}
      </Field>,
    );
    const input = screen.getByLabelText("Токен");
    expect(input.className).toBe("in");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const described = input.getAttribute("aria-describedby")?.split(" ") ?? [];
    expect(described.map((id) => document.getElementById(id)?.textContent)).toEqual([
      "З файлу секретів",
      "Немає файлу",
    ]);
  });

  it("makes a segmented choice a radio group the arrow keys move", () => {
    function Choice() {
      const [value, setValue] = useState<"all" | "dead" | "retry">("all");
      return (
        <Segmented
          label="Стан"
          value={value}
          onChange={setValue}
          options={[
            { value: "all", label: "Усі" },
            { value: "dead", label: "Недоставлені" },
            { value: "retry", label: "Повтор" },
          ]}
        />
      );
    }
    render(<Choice />);
    const group = screen.getByRole("radiogroup", { name: "Стан" });
    const all = screen.getByRole("radio", { name: "Усі" });
    expect(all.getAttribute("aria-checked")).toBe("true");
    expect(all.tabIndex).toBe(0);
    expect(screen.getByRole("radio", { name: "Повтор" }).tabIndex).toBe(-1);
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    const retry = screen.getByRole("radio", { name: "Повтор" });
    expect(retry.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(retry);
    fireEvent.click(screen.getByRole("radio", { name: "Недоставлені" }));
    expect(screen.getByRole("radio", { name: "Недоставлені" }).className).toBe("btn on");
  });

  it("draws a row grid with its header, right-aligned numbers and an empty state", () => {
    interface Source {
      id: string;
      name: string;
      count: number;
    }
    const rows: Source[] = [
      { id: "a", name: "Дуже довга назва джерела подій, що не влазить у рядок", count: 1234 },
      { id: "b", name: "example-source", count: 7 },
    ];
    const columns = [
      { key: "name", header: "Джерело", cell: (row: Source) => row.name },
      { key: "count", header: "Подій", cell: (row: Source) => row.count, align: "end" as const },
    ];
    render(
      <RowGrid
        label="Джерела"
        columns={columns}
        template="minmax(0,3fr) 96px"
        rows={rows}
        rowKey={(row) => row.id}
        empty="Немає"
      />,
    );
    const table = screen.getByRole("table", { name: "Джерела" });
    expect(table.className).toBe("scroll");
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Джерело",
      "Подій",
    ]);
    expect(screen.getAllByRole("row")[1]?.getAttribute("style")).toContain(
      "--cols: minmax(0,3fr) 96px",
    );
    expect(screen.getAllByRole("cell")[1]?.className).toBe("ar");
    cleanup();
    render(
      <RowGrid
        label="Джерела"
        columns={columns}
        template="1fr 96px"
        rows={[]}
        rowKey={(row) => row.id}
        empty="Немає джерел"
      />,
    );
    expect(screen.getByRole("cell").textContent).toBe("Немає джерел");
  });

  it("reports progress, tabs, stats, plates and check lines in words", () => {
    render(
      <>
        <Progress label="Показники" value={7} max={12} valueText="7 з 12" />
        <Tabs
          label="Вигляд"
          items={[
            { key: "a", label: "Журнал", href: "#/log", current: true },
            { key: "b", label: "Деталі", onSelect: () => undefined },
          ]}
        />
        <Stat
          label="Готові канали"
          value="0 з 5"
          note="жоден застосунок ще не створено"
          tone="warn"
        />
        <Plate
          icon="send"
          tone="warn"
          title="Telegram"
          detail="потрібен токен бота"
          href="#/apps"
        />
        <CheckLine label="Критичні" checked onChange={() => undefined} />
      </>,
    );
    const bar = screen.getByRole("progressbar", { name: "Показники" });
    expect(bar.getAttribute("aria-valuetext")).toBe("7 з 12");
    expect((bar.firstElementChild as HTMLElement).style.width).toBe("58.3%");
    expect(screen.getByRole("link", { name: "Журнал" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "Деталі" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
    expect(screen.getByText("0 з 5").getAttribute("style")).toContain("var(--wr)");
    expect(screen.getByRole("link", { name: /Telegram/ }).className).toBe("pl");
    expect(screen.getByRole("checkbox", { name: "Критичні" })).toBeTruthy();
  });

  it("names every icon once", () => {
    expect(new Set(iconNames).size).toBe(iconNames.length);
    expect(iconNames.length).toBe(77);
  });
});
