// A list table in the familiar admin layout: status views and search above, then bulk actions,
// filters and pagination, the table with checkboxes, sortable headers and row actions under the
// primary column, and the pagination again below. Every part is optional and also
// exported on its own. Sorting and paging are controlled by the app, which usually keeps them in
// the address so a list can be shared and reloaded; sortRows from @rcooler/react-ui sorts rows
// that are all loaded. At phone width only the primary column stays, with a button per row that
// shows the other columns as labelled lines.
import { useState, type ReactNode } from "react";

import { cx, type Sort } from "@rcooler/react-ui";

import { BulkActions, type BulkActionsProps } from "./BulkActions.js";
import { ListSearch, type ListSearchProps } from "./ListSearch.js";
import { ListViews, type ListViewsProps } from "./ListViews.js";
import { Pagination, type PaginationProps } from "./Pagination.js";

export interface ListColumn<Row> {
  key: string;
  header: ReactNode;
  /** The column's name as text, for the phone layout; the header when that is text. */
  label?: string | undefined;
  render: (row: Row) => ReactNode;
  /** The header sorts the list by this column's key. */
  sortable?: boolean | undefined;
  /** The title column: row actions and the phone details button; the first column by default. */
  primary?: boolean | undefined;
  className?: string | undefined;
}

export interface RowAction {
  key: string;
  label: ReactNode;
  href?: string | undefined;
  onSelect?: (() => void) | undefined;
  /** Destructive actions (trash, delete) in the danger colour. */
  tone?: "danger" | undefined;
  disabled?: boolean | undefined;
  /** Accessible name when the label alone is ambiguous, such as "Restore “Garden notes”". */
  ariaLabel?: string | undefined;
}

export interface ListTableLabels {
  selectAll: string;
  selectRow: (row: string) => string;
  /** The phone layout's per-row button. */
  showDetails: string;
  loading: string;
}

export const defaultListTableLabels: ListTableLabels = {
  selectAll: "Select all",
  selectRow: (row) => `Select ${row}`,
  showDetails: "Show more details",
  loading: "Loading…",
};

export interface ListTableSelection {
  selected: ReadonlySet<string>;
  onChange: (next: ReadonlySet<string>) => void;
}

export interface ListTableProps<Row> {
  /** The table's caption, read out as its name. */
  label: string;
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  columns: readonly ListColumn<Row>[];
  /** The row's name in checkbox labels; the key when omitted. */
  rowLabel?: ((row: Row) => string) | undefined;
  /** Columns hidden through screen options; the primary column always shows. */
  hiddenColumns?: ReadonlySet<string> | undefined;
  rowActions?: ((row: Row) => readonly RowAction[]) | undefined;
  rowClassName?: ((row: Row) => string | undefined) | undefined;
  /** Shows the checkbox column. */
  selection?: ListTableSelection | undefined;
  sort?: Sort | null | undefined;
  onSort?: ((sort: Sort) => void) | undefined;
  /** Makes sortable headers links, for sorting kept in the address. */
  sortHref?: ((sort: Sort) => string) | undefined;
  loading?: boolean | undefined;
  /** Shown in the table when there are no rows and nothing is loading. */
  empty?: ReactNode;
  /** Shown above the table, such as a load error with a retry button. */
  problem?: ReactNode;
  labels?: Partial<ListTableLabels> | undefined;
  views?: ListViewsProps | undefined;
  search?: ListSearchProps | undefined;
  bulkActions?: Omit<BulkActionsProps, "selectedCount"> | undefined;
  /** Filter controls between bulk actions and pagination, with their own Filter button. */
  filters?: ReactNode;
  pagination?: PaginationProps | undefined;
  className?: string | undefined;
}

function nextSort(sort: Sort | null | undefined, key: string): Sort {
  return sort?.key === key
    ? { key, direction: sort.direction === "asc" ? "desc" : "asc" }
    : { key, direction: "asc" };
}

function SortGlyph({ direction }: { direction: "asc" | "desc" | undefined }) {
  return (
    <svg
      className="rc-sort-indicator"
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        d={
          direction === "asc"
            ? "M6 15l6-6 6 6"
            : direction === "desc"
              ? "M6 9l6 6 6-6"
              : "M8 10l4-4 4 4M8 14l4 4 4-4"
        }
      />
    </svg>
  );
}

function RowActions({ actions }: { actions: readonly RowAction[] }) {
  if (actions.length === 0) return null;
  return (
    <div className="rc-row-actions">
      {actions.map((action) => {
        const className = cx("rc-row-action", action.tone === "danger" && "is-danger");
        return action.href !== undefined && !action.disabled ? (
          <a
            key={action.key}
            className={className}
            href={action.href}
            aria-label={action.ariaLabel}
            onClick={action.onSelect}
          >
            {action.label}
          </a>
        ) : (
          <button
            key={action.key}
            type="button"
            className={className}
            aria-label={action.ariaLabel}
            disabled={action.disabled}
            onClick={action.onSelect}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}

export function ListTable<Row>(props: ListTableProps<Row>) {
  const {
    label,
    rows,
    rowKey,
    rowLabel = rowKey,
    hiddenColumns,
    rowActions,
    rowClassName,
    selection,
    sort,
    onSort,
    sortHref,
    loading = false,
    empty,
    problem,
    views,
    search,
    bulkActions,
    filters,
    pagination,
    className,
  } = props;
  const labels = { ...defaultListTableLabels, ...props.labels };
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const primaryKey = (props.columns.find((column) => column.primary) ?? props.columns[0])?.key;
  const columns = props.columns.filter(
    (column) => column.key === primaryKey || !hiddenColumns?.has(column.key),
  );
  const keys = rows.map(rowKey);
  const selectedHere = selection ? keys.filter((key) => selection.selected.has(key)) : [];
  const allSelected = keys.length > 0 && selectedHere.length === keys.length;
  const someSelected = selectedHere.length > 0 && !allSelected;
  const span = columns.length + (selection ? 1 : 0);

  const toggleAll = () => {
    if (!selection) return;
    const next = new Set(selection.selected);
    for (const key of keys) {
      if (allSelected) next.delete(key);
      else next.add(key);
    }
    selection.onChange(next);
  };
  const toggleRow = (key: string) => {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    selection.onChange(next);
  };
  const toggleDetails = (key: string) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const header = (column: ListColumn<Row>) => {
    const direction = sort?.key === column.key ? sort.direction : undefined;
    const ariaSort =
      direction === "asc" ? "ascending" : direction === "desc" ? "descending" : undefined;
    const content = column.sortable ? (
      sortHref ? (
        <a
          className={cx("rc-sort", direction && "is-sorted")}
          href={sortHref(nextSort(sort, column.key))}
          onClick={onSort ? () => onSort(nextSort(sort, column.key)) : undefined}
        >
          {column.header}
          <SortGlyph direction={direction} />
        </a>
      ) : (
        <button
          type="button"
          className={cx("rc-sort", direction && "is-sorted")}
          onClick={() => onSort?.(nextSort(sort, column.key))}
        >
          {column.header}
          <SortGlyph direction={direction} />
        </button>
      )
    ) : (
      column.header
    );
    return (
      <th
        key={column.key}
        scope="col"
        className={cx(
          `rc-column-${column.key}`,
          column.key === primaryKey && "rc-column-primary",
          column.className,
        )}
        aria-sort={column.sortable ? (ariaSort ?? "none") : undefined}
      >
        {content}
      </th>
    );
  };

  const tablenav = (position: "top" | "bottom") => {
    // The bottom bar repeats only the pagination: one set of bulk controls is enough to find.
    const showBulk = position === "top" && bulkActions !== undefined && selection !== undefined;
    const showFilters = position === "top" && filters !== undefined;
    if (!showBulk && !showFilters && !pagination) return null;
    return (
      <div className={cx("rc-tablenav", `rc-tablenav-${position}`)}>
        {showBulk && <BulkActions {...bulkActions} selectedCount={selectedHere.length} />}
        {showFilters && <div className="rc-list-filters">{filters}</div>}
        {pagination && <Pagination {...pagination} />}
      </div>
    );
  };

  return (
    <div className={cx("rc-list-table-wrap", className)} aria-busy={loading || undefined}>
      {(views || search) && (
        <div className="rc-list-table-top">
          {views && <ListViews {...views} />}
          {search && <ListSearch {...search} />}
        </div>
      )}
      {tablenav("top")}
      {problem}
      {loading && rows.length > 0 && (
        <p className="rc-list-table-loading" role="status">
          {labels.loading}
        </p>
      )}
      <div className="rc-list-table-scroll">
        <table className="rc-list-table">
          <caption className="rc-visually-hidden">{label}</caption>
          <thead>
            <tr>
              {selection && (
                <td className="rc-check-column">
                  <input
                    type="checkbox"
                    aria-label={labels.selectAll}
                    checked={allSelected}
                    disabled={keys.length === 0}
                    ref={(element) => {
                      if (element) element.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                  />
                </td>
              )}
              {columns.map(header)}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              loading ? (
                [0, 1, 2].map((index) => (
                  <tr key={index} className="rc-list-table-placeholder" aria-hidden="true">
                    <td colSpan={span}>
                      <span className="rc-skeleton" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="rc-list-table-empty">
                  <td colSpan={span}>{empty}</td>
                </tr>
              )
            ) : (
              rows.map((row) => {
                const key = rowKey(row);
                const open = expanded.has(key);
                return (
                  <tr
                    key={key}
                    className={cx(
                      open && "is-expanded",
                      selection?.selected.has(key) && "is-selected",
                      rowClassName?.(row),
                    )}
                  >
                    {selection && (
                      <th scope="row" className="rc-check-column">
                        <input
                          type="checkbox"
                          aria-label={labels.selectRow(rowLabel(row))}
                          checked={selection.selected.has(key)}
                          onChange={() => toggleRow(key)}
                        />
                      </th>
                    )}
                    {columns.map((column) => {
                      const primary = column.key === primaryKey;
                      const name =
                        column.label ?? (typeof column.header === "string" ? column.header : "");
                      return (
                        <td
                          key={column.key}
                          className={cx(
                            `rc-column-${column.key}`,
                            primary && "rc-column-primary",
                            column.className,
                          )}
                          data-colname={primary ? undefined : name}
                        >
                          {column.render(row)}
                          {primary && rowActions && <RowActions actions={rowActions(row)} />}
                          {primary && columns.length > 1 && (
                            <button
                              type="button"
                              className="rc-toggle-row"
                              aria-expanded={open}
                              aria-label={labels.showDetails}
                              onClick={() => toggleDetails(key)}
                            >
                              <SortGlyph direction={open ? "asc" : "desc"} />
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {loading && rows.length === 0 && (
        <p className="rc-visually-hidden" role="status">
          {labels.loading}
        </p>
      )}
      {rows.length > 0 && tablenav("bottom")}
    </div>
  );
}
