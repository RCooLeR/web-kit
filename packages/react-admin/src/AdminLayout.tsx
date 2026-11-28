// The admin frame: a top bar across the page, the admin menu on the left and the screen beside it.
// At phone width (760 px and below) the menu leaves the page and opens from a button in the top
// bar as a panel over the screen: focus moves into it and stays there, and Escape, a tap outside,
// widening the window or following an entry closes it. Between 761 and 960 px the menu folds to
// icons unless the app folds it at every width.
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";

import { cx, useFocusTrap } from "@rcooler/react-ui";

import { AdminMenu, type AdminMenuProps } from "./AdminMenu.js";

/** The width at which the menu becomes a panel; admin.css uses the same. */
export const ADMIN_PHONE_QUERY = "(max-width: 760px)";

export interface AdminLayoutProps {
  /** The top bar's content after the phone menu button: brand, site links, account tools. */
  bar: ReactNode;
  menu: Omit<AdminMenuProps, "id">;
  /** Accessible name of the phone menu button, such as "Menu". */
  menuButtonLabel: string;
  /** Accessible name of the close button inside the open panel; menuButtonLabel when omitted. */
  closeMenuLabel?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} />
    </svg>
  );
}

export function AdminLayout({
  bar,
  menu,
  menuButtonLabel,
  closeMenuLabel,
  children,
  className,
}: AdminLayoutProps) {
  const menuId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  useFocusTrap(open, panelRef, close);

  // The panel exists only at phone width: widening the window closes it.
  useEffect(() => {
    if (!open || typeof window.matchMedia !== "function") return undefined;
    const phone = window.matchMedia(ADMIN_PHONE_QUERY);
    const onChange = () => {
      if (!phone.matches) setOpen(false);
    };
    phone.addEventListener("change", onChange);
    return () => phone.removeEventListener("change", onChange);
  }, [open]);

  const navigate = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    menu.onNavigate?.(event, href);
    setOpen(false);
  };

  return (
    <div
      className={cx("rc-admin-layout", className)}
      data-menu-open={open ? "true" : "false"}
      data-folded={menu.folded ? "true" : "false"}
    >
      <header className="rc-admin-bar">
        <button
          type="button"
          className="rc-admin-bar-menu"
          aria-label={menuButtonLabel}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          <MenuIcon open={open} />
        </button>
        {bar}
      </header>
      <div className="rc-admin-body">
        {open && <div className="rc-admin-scrim" aria-hidden="true" onClick={close} />}
        <div ref={panelRef} className="rc-admin-menu-frame">
          {open && (
            <button
              type="button"
              className="rc-admin-menu-close"
              aria-label={closeMenuLabel ?? menuButtonLabel}
              onClick={close}
            >
              <MenuIcon open />
            </button>
          )}
          <AdminMenu {...menu} id={menuId} onNavigate={navigate} />
        </div>
        <div className="rc-admin-content" inert={open}>
          {children}
        </div>
      </div>
    </div>
  );
}
