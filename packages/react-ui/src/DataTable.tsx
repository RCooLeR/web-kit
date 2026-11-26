// A Bootstrap 5 table whose columns can be sorted by clicking their header. Sorting is a pure
// function so it can be tested without a DOM.
import { useState, type ReactNode } from "react";

export interface Column<Row> {
  key: string;
  header: ReactNode;
  render: (row: Row) => ReactNode;
  /** The value this column sorts by; a column without one cannot be sorted. */
  sortValue?: (row: Row) => string | number | undefined;
  /** Extra classes of the cells, such as "text-end" or "text-nowrap". */
  className?: string;
}

export type SortDirection = "asc" | "desc";

export interface Sort {
  key: string;
  direction: SortDirection;
}

/**
 * Rows sorted by one column. Missing values sort last in either direction; text compares in
 * the locale's order, with numbers inside text compared as numbers.
 */
export function sortRows<Row>(
  rows: readonly Row[],
  columns: readonly Column<Row>[],
  sort: Sort | null,
  locale?: string,
): Row[] {
  const column = sort ? columns.find((candidate) => candidate.key === sort.key) : undefined;
  if (!sort || !column?.sortValue) return [...rows];
  const valueOf = column.sortValue;
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = valueOf(a);
    const right = valueOf(b);
    const leftMissing = isMissing(left);
    const rightMissing = isMissing(right);
    if (leftMissing || rightMissing) {
      return leftMissing === rightMissing ? 0 : leftMissing ? 1 : -1;
    }
    const order =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : collator.compare(String(left), String(right));
    return order * factor;
  });
}

/**
 * Whether a sort value counts as missing: undefined, and the null and NaN that JSON and Number()
 * hand over for an unknown value. Missing values sort last in both directions.
 */
function isMissing(value: unknown): boolean {
  return (
    value === undefined || value === null || (typeof value === "number" && Number.isNaN(value))
  );
}

export interface DataTableProps<Row> {
  rows: readonly Row[];
  columns: readonly Column<Row>[];
  rowKey: (row: Row) => string;
  /** Shown in place of the rows when there are none. */
  empty: ReactNode;
  /** Sorting at first; none when omitted. */
  initialSort?: Sort;
  /** Locale for comparing text. */
  locale?: string;
  caption?: string;
}

export function DataTable<Row>({
  rows,
  columns,
  rowKey,
  empty,
  initialSort,
  locale,
  caption,
}: DataTableProps<Row>) {
  const [sort, setSort] = useState<Sort | null>(initialSort ?? null);
  const sorted = sortRows(rows, columns, sort, locale);

  const toggle = (key: string) =>
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        {caption !== undefined && <caption className="visually-hidden">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => {
              const ariaSort =
                sort?.key === column.key
                  ? sort.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : undefined;
              return (
                <th key={column.key} scope="col" className={column.className} aria-sort={ariaSort}>
                  {column.sortValue ? (
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-reset text-decoration-none fw-semibold"
                      onClick={() => toggle(column.key)}
                    >
                      {column.header}
                      {ariaSort && (
                        <span aria-hidden="true">{ariaSort === "ascending" ? " ▲" : " ▼"}</span>
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center text-body-secondary py-4">
                {empty}
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} className={column.className}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
