// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminLayout } from "./AdminLayout.js";
import { AdminMenu, type AdminMenuSection } from "./AdminMenu.js";
import { BulkActions } from "./BulkActions.js";
import { FormActions, FormTable, FormTableRow } from "./FormTable.js";
import { ListTable, type ListColumn } from "./ListTable.js";
import { NavTabs } from "./NavTabs.js";
import { Notice } from "./Notice.js";
import { Pagination } from "./Pagination.js";
import { PostBox, PostBoxes, usePostBoxLayout } from "./PostBox.js";
import { ScreenHeader } from "./ScreenHeader.js";
import { ScreenOptions } from "./ScreenOptions.js";
import { useListSelection } from "./useListSelection.js";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const sections: AdminMenuSection[] = [
  { key: "overview", label: "Overview", href: "/admin/overview", icon: <svg /> },
  {
    key: "articles",
    label: "Articles",
    href: "/admin/articles",
    items: [
      { key: "all", label: "All articles", href: "/admin/articles", current: true },
      { key: "new", label: "Add new", href: "/admin/articles/new" },
    ],
  },
  {
    key: "editorial",
    label: "Editorial",
    href: "/admin/reviews",
    count: 3,
    countLabel: "3 waiting for review",
    items: [{ key: "reviews", label: "Reviews", href: "/admin/reviews" }],
  },
];

describe("AdminMenu", () => {
  it("marks the current entry and keeps every submenu entry reachable", () => {
    render(<AdminMenu label="Workspace" sections={sections} />);
    const nav = screen.getByRole("navigation", { name: "Workspace" });
    expect(
      within(nav).getByRole("link", { name: "All articles" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      within(nav).getByRole("link", { name: "Articles" }).getAttribute("aria-current"),
    ).toBeNull();
    expect(within(nav).getByRole("link", { name: "Reviews" }).getAttribute("href")).toBe(
      "/admin/reviews",
    );
    expect(nav.querySelector(".rc-admin-menu-section.is-current")?.textContent).toContain(
      "Articles",
    );
    // The count is read out by its meaning, not as a bare number.
    expect(within(nav).getByRole("link", { name: /Editorial/ }).textContent).toContain(
      "3 waiting for review",
    );
  });

  it("announces a section without a submenu as the page when it is current", () => {
    render(
      <AdminMenu
        label="Workspace"
        sections={[{ key: "overview", label: "Overview", href: "/admin/overview", current: true }]}
      />,
    );
    expect(screen.getByRole("link", { name: "Overview" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("hands clicks to onNavigate and folds through its button", () => {
    const navigate = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    function Menu() {
      const [folded, setFolded] = useState(false);
      return (
        <AdminMenu
          label="Workspace"
          sections={sections}
          folded={folded}
          onFoldedChange={setFolded}
          onNavigate={navigate}
        />
      );
    }
    render(<Menu />);
    fireEvent.click(screen.getByRole("link", { name: "Add new" }));
    expect(navigate).toHaveBeenCalledWith(expect.anything(), "/admin/articles/new");
    const fold = screen.getByRole("button", { name: "Collapse menu" });
    expect(fold.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(fold);
    expect(screen.getByRole("navigation").getAttribute("data-folded")).toBe("true");
    expect(screen.getByRole("button", { name: "Expand menu" }).getAttribute("aria-expanded")).toBe(
      "false",
    );
  });
});

describe("AdminLayout", () => {
  it("opens the phone menu from the top bar and closes it after navigation", () => {
    vi.useFakeTimers();
    try {
      const { container } = render(
        <AdminLayout
          bar={<span>Site</span>}
          menuButtonLabel="Menu"
          closeMenuLabel="Close menu"
          menu={{ label: "Workspace", sections, onNavigate: (event) => event.preventDefault() }}
        >
          <main>Screen</main>
        </AdminLayout>,
      );
      const layout = container.querySelector(".rc-admin-layout");
      const button = screen.getByRole("button", { name: "Menu" });
      expect(button.getAttribute("aria-controls")).toBe(screen.getByRole("navigation").id);
      fireEvent.click(button);
      expect(layout?.getAttribute("data-menu-open")).toBe("true");
      expect(button.getAttribute("aria-expanded")).toBe("true");
      act(() => {
        vi.runAllTimers();
      });
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close menu" }));
      fireEvent.click(screen.getByRole("link", { name: "Add new" }));
      expect(layout?.getAttribute("data-menu-open")).toBe("false");
      fireEvent.click(button);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(layout?.getAttribute("data-menu-open")).toBe("false");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("ScreenHeader and Notice", () => {
  it("renders the title with its page action and meta row", () => {
    const add = vi.fn();
    render(
      <ScreenHeader
        title="Articles"
        action={{ label: "Add new", onSelect: add }}
        meta={<span>meta</span>}
      >
        <p>Under the title</p>
      </ScreenHeader>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Articles" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add new" }));
    expect(add).toHaveBeenCalledOnce();
    expect(screen.getByText("meta").parentElement?.className).toBe("rc-screen-meta");
  });

  it("links the page action when it has an address", () => {
    render(<ScreenHeader title="Media" action={{ label: "Upload", href: "/admin/media/new" }} />);
    expect(screen.getByRole("link", { name: "Upload" }).getAttribute("href")).toBe(
      "/admin/media/new",
    );
  });

  it("reads errors out at once and success when idle, and dismisses", () => {
    const dismiss = vi.fn();
    render(
      <>
        <Notice tone="error">Could not load.</Notice>
        <Notice tone="success" onDismiss={dismiss} dismissLabel="Close notice">
          Saved.
        </Notice>
      </>,
    );
    expect(screen.getByRole("alert").textContent).toContain("Could not load.");
    expect(screen.getByRole("status").textContent).toContain("Saved.");
    fireEvent.click(screen.getByRole("button", { name: "Close notice" }));
    expect(dismiss).toHaveBeenCalledOnce();
  });
});

interface Item {
  id: string;
  title: string;
  author: string;
}

const items: Item[] = [
  { id: "a", title: "Seed packets", author: "Ann" },
  { id: "b", title: "Cover crops", author: "Bo" },
];

const columns: ListColumn<Item>[] = [
  { key: "title", header: "Title", render: (item) => item.title, sortable: true, primary: true },
  { key: "author", header: "Author", render: (item) => item.author, sortable: true },
];

describe("ListTable", () => {
  it("shows views, search, sortable headers, row actions and hidden columns", () => {
    const onSort = vi.fn();
    const onSearch = vi.fn();
    const trash = vi.fn();
    render(
      <ListTable
        label="Articles"
        rows={items}
        rowKey={(item) => item.id}
        rowLabel={(item) => item.title}
        columns={columns}
        hiddenColumns={new Set(["title", "missing"])}
        sort={{ key: "title", direction: "asc" }}
        onSort={onSort}
        rowActions={(item) => [
          { key: "edit", label: "Edit", href: `/admin/articles/${item.id}` },
          {
            key: "trash",
            label: "Trash",
            tone: "danger",
            onSelect: trash,
            ariaLabel: `Trash ${item.title}`,
          },
        ]}
        views={{
          label: "Filter by status",
          views: [
            { key: "all", label: "All", count: 2, current: true, href: "/admin/articles" },
            { key: "trash", label: "Trash", count: 0, href: "/admin/articles?status=trash" },
          ],
        }}
        search={{
          label: "Search articles",
          value: "  seed ",
          onChange: () => {},
          onSubmit: onSearch,
        }}
      />,
    );
    const table = screen.getByRole("table", { name: "Articles" });
    // The primary column cannot be hidden; the author column has no hide request.
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Title", "Author"]);
    const title = within(table).getByRole("columnheader", { name: "Title" });
    expect(title.getAttribute("aria-sort")).toBe("ascending");
    fireEvent.click(within(title).getByRole("button"));
    expect(onSort).toHaveBeenCalledWith({ key: "title", direction: "desc" });
    fireEvent.click(within(table).getByRole("button", { name: "Author" }));
    expect(onSort).toHaveBeenLastCalledWith({ key: "author", direction: "asc" });
    expect(within(table).getAllByRole("link", { name: "Edit" })[0]?.getAttribute("href")).toBe(
      "/admin/articles/a",
    );
    fireEvent.click(within(table).getByRole("button", { name: "Trash Cover crops" }));
    expect(trash).toHaveBeenCalledOnce();
    const views = screen.getByRole("list", { name: "Filter by status" });
    expect(within(views).getByRole("link", { name: "All (2)" }).getAttribute("aria-current")).toBe(
      "page",
    );
    fireEvent.submit(screen.getByRole("search"));
    expect(onSearch).toHaveBeenCalledWith("seed");
  });

  it("selects rows, marks a partial selection and applies bulk actions", () => {
    const apply = vi.fn();
    function Selectable() {
      const selection = useListSelection(items.map((item) => item.id));
      return (
        <ListTable
          label="Articles"
          rows={items}
          rowKey={(item) => item.id}
          rowLabel={(item) => item.title}
          columns={columns}
          selection={selection}
          bulkActions={{ actions: [{ value: "trash", label: "Move to Trash" }], onApply: apply }}
        />
      );
    }
    render(<Selectable />);
    const all = screen.getByRole<HTMLInputElement>("checkbox", { name: "Select all" });
    const apply_ = screen.getByRole("button", { name: "Apply" });
    const choose = screen.getByRole("combobox", { name: "Bulk actions" });
    fireEvent.change(choose, { target: { value: "trash" } });
    expect(apply_.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Seed packets" }));
    expect(all.indeterminate).toBe(true);
    expect(all.checked).toBe(false);
    fireEvent.click(apply_);
    expect(apply).toHaveBeenCalledWith("trash");
    fireEvent.click(all);
    expect(
      screen.getByRole<HTMLInputElement>("checkbox", { name: "Select Cover crops" }).checked,
    ).toBe(true);
    expect(all.indeterminate).toBe(false);
    fireEvent.click(all);
    expect(
      screen.getByRole<HTMLInputElement>("checkbox", { name: "Select Cover crops" }).checked,
    ).toBe(false);
  });

  it("shows the empty text, the loading state and the phone details button", () => {
    const { rerender } = render(
      <ListTable
        label="Trash"
        rows={[]}
        rowKey={(item: Item) => item.id}
        columns={columns}
        empty="Trash is empty."
      />,
    );
    expect(screen.getByRole("cell", { name: "Trash is empty." })).toBeTruthy();
    rerender(
      <ListTable
        label="Trash"
        rows={[]}
        rowKey={(item: Item) => item.id}
        columns={columns}
        loading
        empty="Trash is empty."
      />,
    );
    expect(screen.getByRole("status").textContent).toBe("Loading…");
    expect(screen.queryByText("Trash is empty.")).toBeNull();
    rerender(<ListTable label="Trash" rows={items} rowKey={(item) => item.id} columns={columns} />);
    const toggle = screen.getAllByRole("button", { name: "Show more details" })[0];
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    if (toggle) fireEvent.click(toggle);
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    expect(toggle?.closest("tr")?.className).toContain("is-expanded");
  });

  it("links sortable headers when sorting lives in the address", () => {
    render(
      <ListTable
        label="Articles"
        rows={items}
        rowKey={(item) => item.id}
        columns={columns}
        sort={{ key: "author", direction: "desc" }}
        sortHref={(sort) => `?orderby=${sort.key}&order=${sort.direction}`}
      />,
    );
    expect(screen.getByRole("link", { name: "Author" }).getAttribute("href")).toBe(
      "?orderby=author&order=asc",
    );
    expect(screen.getByRole("link", { name: "Title" }).getAttribute("href")).toBe(
      "?orderby=title&order=asc",
    );
  });
});

describe("useListSelection", () => {
  it("drops keys that leave the list", () => {
    const { result, rerender } = renderHook(({ keys }) => useListSelection(keys), {
      initialProps: { keys: ["a", "b"] },
    });
    act(() => result.current.onChange(new Set(["a", "b"])));
    rerender({ keys: ["b", "c"] });
    expect([...result.current.selected]).toEqual(["b"]);
    act(() => result.current.clear());
    expect(result.current.selected.size).toBe(0);
  });
});

describe("BulkActions", () => {
  it("resets the choice after applying and says how many rows are selected", () => {
    const apply = vi.fn();
    render(
      <BulkActions
        actions={[{ value: "restore", label: "Restore" }]}
        selectedCount={2}
        onApply={apply}
        selectedLabel={(count) => `${count} selected`}
      />,
    );
    const choose = screen.getByRole<HTMLSelectElement>("combobox", { name: "Bulk actions" });
    fireEvent.change(choose, { target: { value: "restore" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(apply).toHaveBeenCalledWith("restore");
    expect(choose.value).toBe("");
    expect(screen.getByRole("status").textContent).toBe("2 selected");
  });
});

describe("Pagination", () => {
  it("moves through numbered pages and commits a typed page", () => {
    const onPage = vi.fn();
    render(<Pagination page={2} pageCount={4} total={70} onPage={onPage} />);
    expect(screen.getByText("70 items")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "First page" }));
    expect(onPage).toHaveBeenLastCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: "Last page" }));
    expect(onPage).toHaveBeenLastCalledWith(4);
    const field = screen.getByRole("spinbutton", { name: "Current page" });
    fireEvent.change(field, { target: { value: "9" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onPage).toHaveBeenLastCalledWith(4);
  });

  it("offers previous and next only for a cursor list", () => {
    const onPage = vi.fn();
    render(
      <Pagination
        page={1}
        hasNext
        onPage={onPage}
        labels={{ page: (page) => `Сторінка ${page}` }}
      />,
    );
    expect(screen.queryByRole("button", { name: "Last page" })).toBeNull();
    expect(screen.getByRole("button", { name: "Previous page" }).hasAttribute("disabled")).toBe(
      true,
    );
    expect(screen.getByText("Сторінка 1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it("renders links for addressable pages and hides itself on a single page", () => {
    const { container, rerender } = render(
      <Pagination page={1} pageCount={3} hrefFor={(page) => `?paged=${page}`} />,
    );
    expect(screen.getByRole("link", { name: "Next page" }).getAttribute("href")).toBe("?paged=2");
    expect(screen.queryByRole("link", { name: "Previous page" })).toBeNull();
    rerender(<Pagination page={1} pageCount={1} total={3} />);
    expect(container.querySelector(".rc-pagination-links")).toBeNull();
  });
});

describe("PostBox", () => {
  it("collapses and names its handles after the box", () => {
    const toggle = vi.fn();
    const { rerender } = render(
      <PostBox title="SEO" onToggle={toggle} onMoveDown={() => {}}>
        <p>Focus keyword</p>
      </PostBox>,
    );
    const button = screen.getByRole("button", { name: "Toggle panel: SEO" });
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Move SEO box up" }).hasAttribute("disabled")).toBe(
      true,
    );
    fireEvent.click(button);
    expect(toggle).toHaveBeenCalledOnce();
    rerender(
      <PostBox title="SEO" collapsed onToggle={toggle}>
        <p>Focus keyword</p>
      </PostBox>,
    );
    expect(screen.getByText("Focus keyword").closest("[hidden]")).not.toBeNull();
  });

  it("orders, collapses and hides boxes and remembers the layout", () => {
    const boxes = [
      { id: "seo", title: "SEO", render: () => "seo body" },
      { id: "fields", title: "Fields", render: () => "fields body" },
      { id: "revisions", title: "Revisions", render: () => "revisions body" },
    ];
    function Column() {
      const state = usePostBoxLayout({ storageKey: "test.boxes" });
      return <PostBoxes boxes={boxes} state={state} label="Below the editor" />;
    }
    const { unmount } = render(<Column />);
    const titles = () =>
      screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(titles()).toEqual(["SEO", "Fields", "Revisions"]);
    fireEvent.click(screen.getByRole("button", { name: "Move Revisions box up" }));
    expect(titles()).toEqual(["SEO", "Revisions", "Fields"]);
    fireEvent.click(screen.getByRole("button", { name: "Toggle panel: SEO" }));
    unmount();
    render(<Column />);
    expect(titles()).toEqual(["SEO", "Revisions", "Fields"]);
    expect(
      screen.getByRole("button", { name: "Toggle panel: SEO" }).getAttribute("aria-expanded"),
    ).toBe("false");
    expect(JSON.parse(window.localStorage.getItem("test.boxes") ?? "{}")).toMatchObject({
      order: ["seo", "revisions", "fields"],
      collapsed: ["seo"],
    });
  });

  it("leaves hidden boxes out", () => {
    const { result } = renderHook(() => usePostBoxLayout({ initial: { hidden: ["fields"] } }));
    render(
      <PostBoxes
        boxes={[
          { id: "seo", title: "SEO", render: () => null },
          { id: "fields", title: "Fields", render: () => null },
        ]}
        state={result.current}
      />,
    );
    expect(screen.queryByRole("heading", { name: "Fields" })).toBeNull();
    expect(screen.getByRole("heading", { name: "SEO" })).toBeTruthy();
  });
});

describe("FormTable", () => {
  it("labels controls and points them at their description and error", () => {
    render(
      <FormTable>
        <FormTableRow
          label="Posts per page"
          description="From 1 to 100."
          error="Enter a whole number."
        >
          {(control) => <input {...control} />}
        </FormTableRow>
        <FormTableRow label="Feed content" group disabled>
          {() => (
            <label>
              <input type="radio" name="feed" />
              Links only
            </label>
          )}
        </FormTableRow>
        <FormActions>
          <button type="submit">Save changes</button>
        </FormActions>
      </FormTable>,
    );
    const field = screen.getByRole("textbox", { name: "Posts per page" });
    expect(field.getAttribute("aria-invalid")).toBe("true");
    const described = (field.getAttribute("aria-describedby") ?? "").split(" ");
    expect(described.map((id) => document.getElementById(id)?.textContent)).toEqual([
      "From 1 to 100.",
      "Enter a whole number.",
    ]);
    expect(screen.getByRole("group", { name: "Feed content" }).hasAttribute("disabled")).toBe(true);
    expect(
      screen.getByRole<HTMLInputElement>("radio", { name: "Links only" }).matches(":disabled"),
    ).toBe(true);
  });
});

describe("ScreenOptions and NavTabs", () => {
  it("opens its panel, toggles columns at once and applies the item count", () => {
    const toggle = vi.fn();
    const apply = vi.fn();
    render(
      <ScreenOptions
        label="Screen options"
        columns={{
          legend: "Columns",
          items: [{ key: "author", label: "Author", checked: true }],
          onToggle: toggle,
        }}
        perPage={{
          legend: "Pagination",
          label: "Number of items per page",
          value: 20,
          max: 100,
          onApply: apply,
        }}
      />,
    );
    const button = screen.getByRole("button", { name: "Screen options" });
    const panel = document.getElementById(button.getAttribute("aria-controls") ?? "");
    expect(panel?.hidden).toBe(true);
    fireEvent.click(button);
    expect(panel?.hidden).toBe(false);
    fireEvent.click(screen.getByRole("checkbox", { name: "Author" }));
    expect(toggle).toHaveBeenCalledWith("author", false);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Number of items per page" }), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(apply).toHaveBeenCalledWith(50);
  });

  it("draws the react-ui tabs in the admin look", () => {
    render(
      <NavTabs
        label="Reading sections"
        items={[
          { key: "home", label: "Homepage", href: "#home", current: true },
          { key: "feeds", label: "Feeds", href: "#feeds" },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Reading sections" });
    expect(nav.className).toBe("tabs rc-nav-tabs");
    expect(within(nav).getByRole("link", { name: "Homepage" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });
});
