// The application shell of the shared look: a sidebar with the brand, grouped navigation with
// counters and a footer with the language and theme switches, and the page beside it. At phone
// width (760 px and below) a top bar with the brand mark, the page's name and a menu button takes
// the sidebar's place, and the sidebar opens from that button as a panel over the page; an app can
// add a tab bar at the bottom of the phone screen. Above that width the sidebar stays in view while
// the page scrolls. A scope control (such as a property selector) can sit under the brand, and the
// signed-in account at the foot.
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
  /**
   * "warn" shows the count in the warning colour, "brand" in the brand's main colour (--pri), for
   * counts that are tasks rather than problems; the default is the problem colour.
   */
  countTone?: "bad" | "warn" | "brand";
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

/** The signed-in account at the foot of the sidebar: a button (onClick) or a link (href). */
export interface Account {
  name: ReactNode;
  /** The line under the name, such as the role and the language. */
  detail?: ReactNode;
  /** One or two letters in the round badge. */
  initials: string;
  onClick?: () => void;
  href?: string;
}

/** The phone tab bar: the main sections, and optionally a last tab that opens the menu. */
export interface PhoneTabs {
  /** Accessible name of the tab bar, such as "Головні розділи". */
  label: string;
  items: readonly NavItem[];
  /** The text of a last tab that opens the navigation panel, such as "Ще". */
  more?: ReactNode;
}

export interface AppShellProps {
  /** The application's name and what it is, beside its mark. */
  name: ReactNode;
  subtitle?: ReactNode;
  /** The application's mark: an icon of the set, or the brand's own drawing in `mark`. */
  icon?: IconName;
  /** The brand's own mark, such as its logo as an SVG, drawn instead of the icon. */
  mark?: ReactNode;
  /**
   * The brand whose tokens apply, for a stylesheet from `brands/` such as "homeledger": set as
   * data-brand on the .app element. The rcooler look when omitted.
   */
  brand?: string;
  /** Accessible name of the navigation, such as "Розділи". */
  navLabel: string;
  /** Accessible name of the phone menu button and of the panel's close button; navLabel when omitted. */
  menuLabel?: string;
  nav: readonly NavGroup[];
  /** A control under the brand, above the navigation, such as a property selector. */
  scope?: ReactNode;
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
  /** The signed-in account at the foot of the sidebar. */
  account?: Account;
  /** A tab bar at the bottom of the phone screen; the top bar and the menu stay. */
  phoneTabs?: PhoneTabs;
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
  const { languages, signOut, account, phoneTabs } = props;

  const navId = useId();
  const sideRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const openMenu = (opener: HTMLButtonElement) => {
    openerRef.current = opener;
    setMenuOpen(true);
  };
  useFocusTrap(menuOpen, sideRef, closeMenu);

  // The top bar and the tab bar are inert while the panel is open, so the trap may not find the
  // button that opened it focused; focus goes back to it here.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const button = openerRef.current ?? menuRef.current;
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
  // The menu button's dot takes the strongest tone among the counts: problem, warning, brand.
  const dotTone = counted.some((item) => item.countTone === undefined || item.countTone === "bad")
    ? "bd"
    : counted.some((item) => item.countTone === "warn")
      ? undefined
      : "br";
  const mark = props.mark ?? (props.icon ? <Icon name={props.icon} /> : null);

  return (
    <div
      className={cx("app", theme === "light" && "light", phoneTabs && "tabbed")}
      data-brand={props.brand}
    >
      <header className="topbar" inert={menuOpen}>
        <span className="mark">{mark}</span>
        <div className="grow ell bn">{current ? current.label : props.name}</div>
        <button
          ref={menuRef}
          type="button"
          className="btn gh sq menu"
          aria-label={menuLabel}
          aria-expanded={menuOpen}
          aria-controls={navId}
          onClick={(event) => openMenu(event.currentTarget)}
        >
          <Icon name="lines" />
          {counted.length > 0 && <span className={cx("mdot", dotTone)} aria-hidden="true" />}
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
          <span className="mark">{mark}</span>
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
        {props.scope !== undefined && <div className="sscope">{props.scope}</div>}
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
                <Count item={item} />
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
          {account && <AccountBlock account={account} onChoose={closeMenu} />}
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
      {phoneTabs && (
        <nav className="tabbar" aria-label={phoneTabs.label} inert={menuOpen}>
          {phoneTabs.items.map((item) => (
            <a
              key={item.href}
              className={cx("ptab", item.current && "on")}
              href={item.href}
              aria-current={item.current ? "page" : undefined}
            >
              <Icon name={item.icon} />
              {item.label}
              <Count item={item} />
            </a>
          ))}
          {phoneTabs.more !== undefined && (
            <button
              type="button"
              className="ptab"
              aria-expanded={menuOpen}
              aria-controls={navId}
              onClick={(event) => openMenu(event.currentTarget)}
            >
              <Icon name="more" />
              {phoneTabs.more}
            </button>
          )}
        </nav>
      )}
    </div>
  );
}

const countClass: Record<NonNullable<NavItem["countTone"]>, string | undefined> = {
  bad: undefined,
  warn: "wr",
  brand: "br",
};

/** An entry's count, hidden at zero. */
function Count({ item }: { item: NavItem }) {
  if (item.count === undefined || item.count <= 0) return null;
  return (
    <span className={cx("cnt", item.countTone && countClass[item.countTone])}>{item.count}</span>
  );
}

function AccountBlock({ account, onChoose }: { account: Account; onChoose: () => void }) {
  const body = (
    <>
      <span className="av" aria-hidden="true">
        {account.initials}
      </span>
      <span className="who">
        <span className="b ell">{account.name}</span>
        {account.detail !== undefined && <span className="mu ell">{account.detail}</span>}
      </span>
    </>
  );
  if (account.href !== undefined) {
    return (
      <a className="acct" href={account.href} onClick={onChoose}>
        {body}
      </a>
    );
  }
  return (
    <button
      type="button"
      className="acct"
      onClick={() => {
        onChoose();
        account.onClick?.();
      }}
    >
      {body}
    </button>
  );
}
