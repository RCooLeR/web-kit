// Pagination of a list table: the item count, then first, previous, the page and next, last.
// Numbered lists know their page count and get a page field. Cursor lists (the server hands out
// a "next" cursor and no totals) leave pageCount out and say whether a next page exists; they get
// previous and next only. Controls are links when hrefFor is given (deep-linkable pages) and
// buttons otherwise.
import { useState, type KeyboardEvent } from "react";

import { cx } from "@rcooler/react-ui";

export interface PaginationLabels {
  first: string;
  previous: string;
  next: string;
  last: string;
  /** Accessible name of the page field. */
  currentPage: string;
  /** Text after the page field: "of 4". */
  of: (pageCount: number) => string;
  /** The page of a cursor list: "Page 2". */
  page: (page: number) => string;
  /** The item count: "24 items". */
  items: (count: number) => string;
}

export const defaultPaginationLabels: PaginationLabels = {
  first: "First page",
  previous: "Previous page",
  next: "Next page",
  last: "Last page",
  currentPage: "Current page",
  of: (pageCount) => `of ${pageCount}`,
  page: (page) => `Page ${page}`,
  items: (count) => (count === 1 ? "1 item" : `${count} items`),
};

export interface PaginationProps {
  /** The page shown, from 1. */
  page: number;
  /** Pages in all; leave out for a cursor list. */
  pageCount?: number | undefined;
  /** For a cursor list: whether there is a page after this one. */
  hasNext?: boolean | undefined;
  /** Items in all, when the server says. */
  total?: number | undefined;
  onPage?: ((page: number) => void) | undefined;
  hrefFor?: ((page: number) => string) | undefined;
  labels?: Partial<PaginationLabels> | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

export function Pagination({
  page,
  pageCount,
  hasNext,
  total,
  onPage,
  hrefFor,
  labels: given,
  disabled,
  className,
}: PaginationProps) {
  const labels = { ...defaultPaginationLabels, ...given };
  const numbered = pageCount !== undefined;
  const last = numbered ? Math.max(1, pageCount) : undefined;
  const nextExists = numbered ? page < (last ?? 1) : hasNext === true;
  // The field's text belongs to the page it was typed on; a new page starts from its number.
  const [typed, setTyped] = useState({ page, value: String(page) });
  const draft = typed.page === page ? typed.value : String(page);
  const setDraft = (value: string) => setTyped({ page, value });

  const control = (target: number, available: boolean, label: string, glyph: string) => {
    const usable = available && !disabled;
    if (hrefFor !== undefined) {
      return usable ? (
        <a
          className="rc-button rc-pagination-button"
          href={hrefFor(target)}
          aria-label={label}
          onClick={onPage ? () => onPage(target) : undefined}
        >
          <span aria-hidden="true">{glyph}</span>
        </a>
      ) : (
        <span className="rc-button rc-pagination-button" aria-hidden="true" data-disabled="true">
          {glyph}
        </span>
      );
    }
    return (
      <button
        type="button"
        className="rc-button rc-pagination-button"
        aria-label={label}
        disabled={!usable}
        onClick={() => onPage?.(target)}
      >
        <span aria-hidden="true">{glyph}</span>
      </button>
    );
  };

  const commit = () => {
    const value = Number.parseInt(draft, 10);
    if (!Number.isFinite(value) || last === undefined) {
      setDraft(String(page));
      return;
    }
    const target = Math.min(Math.max(value, 1), last);
    setDraft(String(target));
    if (target !== page) onPage?.(target);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }
  };

  const single = numbered ? (last ?? 1) <= 1 : page <= 1 && !nextExists;
  return (
    <div className={cx("rc-pagination", className)}>
      {total !== undefined && <span className="rc-pagination-total">{labels.items(total)}</span>}
      {!single && (
        <span className="rc-pagination-links">
          {numbered && control(1, page > 1, labels.first, "«")}
          {control(page - 1, page > 1, labels.previous, "‹")}
          {numbered ? (
            onPage && !hrefFor ? (
              <span className="rc-pagination-current">
                <input
                  className="rc-input rc-pagination-input"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={last}
                  value={draft}
                  disabled={disabled}
                  aria-label={labels.currentPage}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={commit}
                  onKeyDown={onKeyDown}
                />
                <span>{labels.of(last ?? 1)}</span>
              </span>
            ) : (
              <span className="rc-pagination-current">
                {page} {labels.of(last ?? 1)}
              </span>
            )
          ) : (
            <span className="rc-pagination-current">{labels.page(page)}</span>
          )}
          {control(page + 1, nextExists, labels.next, "›")}
          {numbered && control(last ?? 1, page < (last ?? 1), labels.last, "»")}
        </span>
      )}
    </div>
  );
}
