// The admin menu: top-level sections with an icon, each with an optional submenu. The current
// section shows its submenu in place; the others open theirs as a flyout on hover or keyboard
// focus. Folded, the menu shows icons only and every submenu is a flyout headed by the section's
// name. At phone width (AdminLayout's panel) every submenu is open. All entries are plain links,
// so a router can intercept their clicks (onNavigate) and the browser can open them in a new tab.
import type { MouseEvent, ReactNode } from "react";

import { cx } from "@rcooler/react-ui";

export interface AdminMenuItem {
  /** Stable key, unique within its section. */
  key: string;
  label: ReactNode;
  href: string;
  /** The screen shown now: highlighted and announced as the current page. */
  current?: boolean | undefined;
  /** A count beside the label, such as items waiting for review; hidden at zero. */
  count?: number | undefined;
  /** What the count means, read out instead of the bare number ("3 waiting for review"). */
  countLabel?: string | undefined;
}

export interface AdminMenuSection extends AdminMenuItem {
  /** An icon drawn in the text colour; the app brings its own icon set. */
  icon?: ReactNode;
  /** The section's submenu. A section without items is a single link. */
  items?: readonly AdminMenuItem[] | undefined;
}

export interface AdminMenuProps {
  /** Accessible name of the navigation, such as "Workspace". */
  label: string;
  sections: readonly AdminMenuSection[];
  /** Icons only, with flyouts. */
  folded?: boolean | undefined;
  /** Shows the fold button at the foot of the menu. */
  onFoldedChange?: ((folded: boolean) => void) | undefined;
  /** Text of the fold button while the menu is expanded, such as "Collapse menu". */
  foldLabel?: string | undefined;
  /** Accessible name of the fold button while the menu is folded, such as "Expand menu". */
  unfoldLabel?: string | undefined;
  /** Called for every click on an entry, before the browser follows it. */
  onNavigate?: ((event: MouseEvent<HTMLAnchorElement>, href: string) => void) | undefined;
  id?: string | undefined;
  className?: string | undefined;
}

function Count({ item }: { item: AdminMenuItem }) {
  if (item.count === undefined || item.count <= 0) return null;
  return (
    <>
      <span className="rc-admin-menu-count" aria-hidden={item.countLabel ? true : undefined}>
        {item.count}
      </span>
      {item.countLabel && <span className="rc-visually-hidden">{item.countLabel}</span>}
    </>
  );
}

function FoldIcon({ folded }: { folded: boolean }) {
  return (
    <svg
      className="rc-admin-menu-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        d={
          folded
            ? "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0zM10.5 8.5L14 12l-3.5 3.5"
            : "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0zM13.5 8.5L10 12l3.5 3.5"
        }
      />
    </svg>
  );
}

export function AdminMenu({
  label,
  sections,
  folded = false,
  onFoldedChange,
  foldLabel = "Collapse menu",
  unfoldLabel = "Expand menu",
  onNavigate,
  id,
  className,
}: AdminMenuProps) {
  const link = (item: AdminMenuItem, linkClass: string, current: boolean) => (
    <a
      className={linkClass}
      href={item.href}
      aria-current={current ? "page" : undefined}
      onClick={onNavigate ? (event) => onNavigate(event, item.href) : undefined}
    >
      {item.label}
      <Count item={item} />
    </a>
  );

  return (
    <nav
      id={id}
      className={cx("rc-admin-menu", className)}
      aria-label={label}
      data-folded={folded ? "true" : "false"}
    >
      <ul className="rc-admin-menu-list">
        {sections.map((section) => {
          const items = section.items ?? [];
          const current = section.current === true || items.some((item) => item.current);
          // A section is the current page itself only when it has no submenu to point at.
          const sectionIsPage = items.length === 0 && section.current === true;
          return (
            <li
              key={section.key}
              className={cx(
                "rc-admin-menu-section",
                current && "is-current",
                items.length > 0 && "has-items",
              )}
            >
              <a
                className="rc-admin-menu-top"
                href={section.href}
                aria-current={sectionIsPage ? "page" : undefined}
                onClick={onNavigate ? (event) => onNavigate(event, section.href) : undefined}
              >
                {section.icon !== undefined && (
                  <span className="rc-admin-menu-icon" aria-hidden="true">
                    {section.icon}
                  </span>
                )}
                <span className="rc-admin-menu-label">{section.label}</span>
                <Count item={section} />
              </a>
              {items.length > 0 ? (
                <ul className="rc-admin-menu-sub">
                  <li className="rc-admin-menu-head" aria-hidden="true">
                    {section.label}
                  </li>
                  {items.map((item) => (
                    <li key={item.key}>
                      {link(
                        item,
                        cx("rc-admin-menu-item", item.current && "is-current"),
                        item.current === true,
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="rc-admin-menu-sub is-head-only" aria-hidden="true">
                  <li className="rc-admin-menu-head">{section.label}</li>
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      {onFoldedChange && (
        <button
          type="button"
          className="rc-admin-menu-fold"
          aria-expanded={!folded}
          aria-label={folded ? unfoldLabel : undefined}
          onClick={() => onFoldedChange(!folded)}
        >
          <FoldIcon folded={folded} />
          <span className="rc-admin-menu-label">{foldLabel}</span>
        </button>
      )}
    </nav>
  );
}
