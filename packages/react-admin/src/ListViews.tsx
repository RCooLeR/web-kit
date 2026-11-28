// The status views above a list table: "All (24) | Published (16) | Drafts (5) | Trash (2)".
// A view is a link when it has an address (deep-linkable filters) and a button otherwise.
import type { ReactNode } from "react";

import { cx } from "@rcooler/react-ui";

export interface ListView {
  key: string;
  label: ReactNode;
  /** Items in this view; shown in brackets after the label. */
  count?: number | undefined;
  current?: boolean | undefined;
  href?: string | undefined;
  onSelect?: (() => void) | undefined;
}

export interface ListViewsProps {
  /** Accessible name of the list, such as "Filter articles by status". */
  label: string;
  views: readonly ListView[];
  /** Formats a count; brackets around the number when omitted. */
  formatCount?: ((count: number) => string) | undefined;
  className?: string | undefined;
}

export function ListViews({ label, views, formatCount, className }: ListViewsProps) {
  return (
    <ul className={cx("rc-list-views", className)} aria-label={label}>
      {views.map((view) => {
        const content = (
          <>
            {view.label}
            {view.count !== undefined && (
              <>
                {" "}
                <span className="rc-list-views-count">
                  {formatCount ? formatCount(view.count) : `(${view.count})`}
                </span>
              </>
            )}
          </>
        );
        return (
          <li key={view.key} className={cx(view.current && "is-current")}>
            {view.href !== undefined ? (
              <a
                href={view.href}
                aria-current={view.current ? "page" : undefined}
                onClick={view.onSelect}
              >
                {content}
              </a>
            ) : (
              <button
                type="button"
                aria-current={view.current ? "true" : undefined}
                onClick={view.onSelect}
              >
                {content}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
