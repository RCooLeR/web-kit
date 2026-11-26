// The application shell of the shared look: a sidebar with the brand, grouped navigation with
// counters and a footer with the language and theme switches, and the page beside it. At phone
// width (760 px and below) a top bar with the brand mark, the page's name and a menu button takes
// the sidebar's place, and the sidebar opens from that button as a panel over the page. Above
// that width the sidebar stays in view while the page scrolls.
import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Icon, cx } from "./Icon.js";
import type { IconName } from "./icons.js";
import { useTheme, type Theme } from "./theme.js";
import { useFocusTrap } from "./useFocusTrap.js";

export interface NavItem {
  href: string;
  label: ReactNode;
  icon: IconName;
  /** The page shown now: highlighted and announced as the current page. */
  current?: boolean;
  /** A count beside the label (open findings, apps that need setting up); hidden at zero. */
  count?: number;
  /** "warn" shows the count in the warning colour; the default is the problem colour. */
  countTone?: "bad" | "warn";
}

export interface NavGroup {
  /** Heading above the group; a group without one continues the list above. */
  label?: ReactNode;
  items: readonly NavItem[];
}

export interface LanguageSwitch {
  /** Accessible name of the switch, such as "Мова". */
  label: string;
  current: string;
  options: readonly { code: string; label: string }[];
  onChange: (code: string) => void;
}

export interface SignOut {
  /** The button's text and accessible name, such as "Вийти". */
  label: string;
  onSignOut: () => void;
}

export interface AppShellProps {
  /** The application's name and what it is, beside its mark. */
  name: ReactNode;
  subtitle?: ReactNode;
  icon: IconName;
  /** Accessible name of the navigation, such as "Розділи". */
  navLabel: string;
  /** Accessible name of the phone menu button and of the panel's close button; navLabel when omitted. */
  menuLabel?: string;
  nav: readonly NavGroup[];
  /** A link to the cockpit above the navigation, when the app knows its address. */
  cockpit?: { href: string; label: ReactNode };
  /** The footer's left side: the version or commit. */
  footer?: ReactNode;
  languages?: LanguageSwitch;
  /** Accessible name of the light theme switch, such as "Світла тема". */
  themeLabel: string;
  /** Storage key of the remembered theme; DEFAULT_THEME_KEY when omitted. */
  themeKey?: string;
  /** The theme from the app's own state; the shell remembers its own when omitted. */
  theme?: Theme;
  onThemeChange?: (theme: Theme) => void;
  /** A sign-out button at the foot of the sidebar, and so in the phone menu too. */
  signOut?: SignOut;
  children: ReactNode;
}

/** The width at which the sidebar becomes the phone menu; kit.css uses the same. */
const PHONE_QUERY = "(max-width: 760px)";

export function AppShell(props: AppShellProps) {
  const [ownTheme, setOwnTheme] = useTheme(props.themeKey);
  const theme = props.theme ?? ownTheme;
  const setTheme = (next: Theme) => {
    if (props.onThemeChange) props.onThemeChange(next);
    if (props.theme === undefined) setOwnTheme(next);
  };
  const { languages, signOut } = props;

  const navId = useId();
  const sideRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  useFocusTrap(menuOpen, sideRef, closeMenu);

  // The top bar is inert while the panel is open, so the trap may not find the menu button
  // focused; focus goes back to it here.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const button = menuRef.current;
    return () => button?.focus();
  }, [menuOpen]);

  // The panel exists only at phone width: widening the window closes it, so no trap stays behind.
  useEffect(() => {
    if (!menuOpen || typeof window.matchMedia !== "function") return undefined;
    const phone = window.matchMedia(PHONE_QUERY);
    const onChange = () => {
      if (!phone.matches) setMenuOpen(false);
    };
    phone.addEventListener("change", onChange);
    return () => phone.removeEventListener("change", onChange);
  }, [menuOpen]);

  const items = props.nav.flatMap((group) => group.items);
  const current = items.find((item) => item.current);
  const counted = items.filter((item) => item.count !== undefined && item.count > 0);
  const menuLabel = props.menuLabel ?? props.navLabel;

  return (
    <div className={cx("app", theme === "light" && "light")}>
      <header className="topbar" inert={menuOpen}>
        <span className="mark">
          <Icon name={props.icon} />
        </span>
        <div className="grow ell bn">{current ? current.label : props.name}</div>
        <button
          ref={menuRef}
          type="button"
          className="btn gh sq menu"
          aria-label={menuLabel}
          aria-expanded={menuOpen}
          aria-controls={navId}
          onClick={() => setMenuOpen(true)}
        >
          <Icon name="lines" />
          {counted.length > 0 && (
            <span
              className={cx("mdot", counted.some((item) => item.countTone !== "warn") && "bd")}
              aria-hidden="true"
            />
          )}
        </button>
      </header>
      {menuOpen && <div className="scrim" aria-hidden="true" onClick={closeMenu} />}
      <nav
        id={navId}
        ref={sideRef}
        className={cx("side", menuOpen && "open")}
        aria-label={props.navLabel}
      >
        <div className="brand">
          <span className="mark">
            <Icon name={props.icon} />
          </span>
          <div className="grow">
            <div className="bn">{props.name}</div>
            {props.subtitle !== undefined && <div className="mu sm">{props.subtitle}</div>}
          </div>
          <button
            type="button"
            className="btn gh sq shut"
            aria-label={menuLabel}
            aria-expanded={menuOpen}
            aria-controls={navId}
            onClick={closeMenu}
          >
            <Icon name="close" />
          </button>
        </div>
        {props.cockpit && (
          <a className="nav" href={props.cockpit.href} onClick={closeMenu}>
            <Icon name="cockpit" />
            {props.cockpit.label}
          </a>
        )}
        {props.nav.map((group, index) => (
          <Fragment key={index}>
            {group.label !== undefined && <div className="grp">{group.label}</div>}
            {group.items.map((item) => (
              <a
                key={item.href}
                className={cx("nav", item.current && "on")}
                href={item.href}
                aria-current={item.current ? "page" : undefined}
                onClick={closeMenu}
              >
                <Icon name={item.icon} />
                {item.label}
                {item.count !== undefined && item.count > 0 && (
                  <span className={cx("cnt", item.countTone === "warn" && "wr")}>{item.count}</span>
                )}
              </a>
            ))}
          </Fragment>
        ))}
        <div className="sfoot">
          {signOut && (
            <button
              type="button"
              className="nav out"
              onClick={() => {
                closeMenu();
                signOut.onSignOut();
              }}
            >
              <Icon name="lock" />
              {signOut.label}
            </button>
          )}
          <div className="foot">
            <span className="grow ell">{props.footer}</span>
            {languages && (
              <div className="hd" role="group" aria-label={languages.label} style={{ gap: 6 }}>
                {languages.options.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    className={cx("chip", option.code === languages.current && "ac")}
                    aria-pressed={option.code === languages.current}
                    onClick={() => languages.onChange(option.code)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              className={cx("btn gh sq", theme === "light" && "on")}
              aria-label={props.themeLabel}
              aria-pressed={theme === "light"}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              <Icon name="sun" />
            </button>
          </div>
        </div>
      </nav>
      <main className="main" inert={menuOpen}>
        {props.children}
      </main>
    </div>
  );
}
