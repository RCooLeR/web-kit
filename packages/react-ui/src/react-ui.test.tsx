// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable, sortRows, type Column } from "./DataTable.js";
import { ErrorBoundary } from "./ErrorBoundary.js";
import { Modal } from "./Modal.js";
import { MAX_TOASTS, ToastProvider, enqueue, useToasts } from "./toasts.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

interface Row {
  name: string;
  count?: number;
}

const columns: Column<Row>[] = [
  { key: "name", header: "Name", render: (row) => row.name, sortValue: (row) => row.name },
  {
    key: "count",
    header: "Count",
    render: (row) => row.count ?? "—",
    sortValue: (row) => row.count,
  },
  { key: "plain", header: "Plain", render: () => "x" },
];

describe("sortRows", () => {
  const rows: Row[] = [
    { name: "item 10", count: 3 },
    { name: "Item 2" },
    { name: "item 1", count: 7 },
  ];

  it("sorts text in natural order, ignoring case", () => {
    expect(sortRows(rows, columns, { key: "name", direction: "asc" }).map((r) => r.name)).toEqual([
      "item 1",
      "Item 2",
      "item 10",
    ]);
  });

  it("puts missing values last in both directions", () => {
    expect(sortRows(rows, columns, { key: "count", direction: "asc" }).map((r) => r.count)).toEqual(
      [3, 7, undefined],
    );
    expect(
      sortRows(rows, columns, { key: "count", direction: "desc" }).map((r) => r.count),
    ).toEqual([7, 3, undefined]);
  });

  it("treats null and NaN as missing, as JSON and Number() hand them over", () => {
    const loose: { name: string; amount: unknown }[] = [
      { name: "a", amount: null },
      { name: "b", amount: 5 },
      { name: "c", amount: Number.NaN },
      { name: "d", amount: 2 },
    ];
    const byAmount: Column<{ name: string; amount: unknown }>[] = [
      {
        key: "amount",
        header: "Amount",
        render: (row) => row.name,
        sortValue: (row) => row.amount as number | undefined,
      },
    ];
    for (const direction of ["asc", "desc"] as const) {
      const names = sortRows(loose, byAmount, { key: "amount", direction }).map((r) => r.name);
      expect(names.slice(2).sort()).toEqual(["a", "c"]);
    }
  });

  it("leaves the order alone without a sort or for a column that cannot sort", () => {
    expect(sortRows(rows, columns, null)).toEqual(rows);
    expect(sortRows(rows, columns, { key: "plain", direction: "asc" })).toEqual(rows);
  });
});

describe("DataTable", () => {
  it("sorts by a clicked header and marks the direction", () => {
    render(
      <DataTable
        rows={[{ name: "b" }, { name: "a" }]}
        columns={columns}
        rowKey={(r) => r.name}
        empty="Nothing"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    const cells = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.firstElementChild?.textContent);
    expect(cells).toEqual(["a", "b"]);
    expect(screen.getByRole("columnheader", { name: /Name/ }).getAttribute("aria-sort")).toBe(
      "ascending",
    );
    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(screen.getByRole("columnheader", { name: /Name/ }).getAttribute("aria-sort")).toBe(
      "descending",
    );
  });

  it("shows the empty text without rows", () => {
    render(<DataTable rows={[]} columns={columns} rowKey={(r) => r.name} empty="Nothing yet" />);
    expect(screen.getByText("Nothing yet")).toBeTruthy();
  });
});

describe("Modal", () => {
  function Harness({ onClose }: { onClose: () => void }) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open
        </button>
        <Modal
          open={open}
          title="Edit"
          closeLabel="Close"
          onClose={() => {
            onClose();
            setOpen(false);
          }}
          footer={<button type="button">Save</button>}
        >
          <input aria-label="Name" />
        </Modal>
      </>
    );
  }

  it("is labelled by its title, traps focus, and closes on Escape and the backdrop", async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    fireEvent.click(opener);

    const dialog = screen.getByRole("dialog", { name: "Edit" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    await act(() => vi.runAllTimersAsync());
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));

    // Tab from the last element wraps to the first, and Shift+Tab back.
    screen.getByRole("button", { name: "Save" }).focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Save" }));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);

    fireEvent.click(opener);
    const backdrop = document.querySelector(".modal.d-block");
    if (!backdrop) throw new Error("no modal element");
    fireEvent.mouseDown(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  function Nested({
    onCloseOuter,
    onCloseInner,
  }: {
    onCloseOuter: () => void;
    onCloseInner: () => void;
  }) {
    const [outer, setOuter] = useState(true);
    const [inner, setInner] = useState(false);
    return (
      <Modal
        open={outer}
        title="Edit"
        closeLabel="Close edit"
        onClose={() => {
          onCloseOuter();
          setOuter(false);
        }}
      >
        <button type="button" onClick={() => setInner(true)}>
          Discard
        </button>
        <Modal
          open={inner}
          title="Discard changes?"
          closeLabel="Close confirm"
          onClose={() => {
            onCloseInner();
            setInner(false);
          }}
          footer={<button type="button">Yes</button>}
        >
          <p>The edits are lost.</p>
        </Modal>
      </Modal>
    );
  }

  it("leaves keys to the dialog opened last, so one Escape closes one dialog", async () => {
    vi.useFakeTimers();
    const onCloseOuter = vi.fn();
    const onCloseInner = vi.fn();
    render(<Nested onCloseOuter={onCloseOuter} onCloseInner={onCloseInner} />);
    await act(() => vi.runAllTimersAsync());
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    await act(() => vi.runAllTimersAsync());
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close confirm" }));

    // Tab from the confirm's last button wraps inside the confirm, not into the form behind it.
    screen.getByRole("button", { name: "Yes" }).focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close confirm" }));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCloseInner).toHaveBeenCalledOnce();
    expect(onCloseOuter).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Edit" })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Discard changes?" })).toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCloseOuter).toHaveBeenCalledOnce();
  });
});

describe("toasts", () => {
  it("replaces a toast with the same id and keeps at most four", () => {
    let queue = enqueue([], { id: "a", level: "info", title: "1" });
    queue = enqueue(queue, { id: "a", level: "success", title: "2" });
    expect(queue).toEqual([{ id: "a", level: "success", title: "2" }]);
    for (const id of ["b", "c", "d", "e"]) queue = enqueue(queue, { id, level: "info", title: id });
    expect(queue.map((t) => t.id)).toEqual(["b", "c", "d", "e"]);
    expect(queue).toHaveLength(MAX_TOASTS);
  });

  it("shows a pushed toast and removes it after its time", async () => {
    vi.useFakeTimers();
    function Pusher() {
      const { push } = useToasts();
      return (
        <button
          type="button"
          onClick={() => push({ level: "danger", title: "Failed", body: "Try again", ttlMs: 1000 })}
        >
          Push
        </button>
      );
    }
    render(
      <ToastProvider closeLabel="Close">
        <Pusher />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Push" }));
    expect(screen.getByRole("alert").textContent).toContain("Failed");
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("needs a provider", () => {
    function Lonely() {
      useToasts();
      return null;
    }
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Lonely />)).toThrow("ToastProvider");
  });
});

describe("ErrorBoundary", () => {
  it("shows the fallback for a broken child and renders it again on reset", () => {
    let broken = true;
    function Child() {
      if (broken) throw new Error("render failed");
      return <p>Fine</p>;
    }
    const onError = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ErrorBoundary
        onError={onError}
        fallback={(reset) => (
          <button type="button" onClick={reset}>
            Retry
          </button>
        )}
      >
        <Child />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledOnce();
    broken = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByText("Fine")).toBeTruthy();
  });
});
