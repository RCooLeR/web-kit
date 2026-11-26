// The application shell of the shared look: a sidebar with the brand, grouped navigation with
// counters and a footer with the language and theme switches, and the page beside it. At phone
// width the sidebar stacks above the page.
import { Fragment, type ReactNode } from "react";

import { Icon, cx } from "./Icon.js";
import type { IconName } from "./icons.js";
import { useTheme, type Theme } from "./theme.js";

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

export interface AppShellProps {
  /** The application's name and what it is, beside its mark. */
  name: ReactNode;
  subtitle?: ReactNode;
  icon: IconName;
  /** Accessible name of the navigation, such as "Розділи". */
  navLabel: string;
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
  children: ReactNode;
}

export function AppShell(props: AppShellProps) {
  const [ownTheme, setOwnTheme] = useTheme(props.themeKey);
  const theme = props.theme ?? ownTheme;
  const setTheme = (next: Theme) => {
    if (props.onThemeChange) props.onThemeChange(next);
    if (props.theme === undefined) setOwnTheme(next);
  };
  const { languages } = props;

  return (
    <div className={cx("app", theme === "light" && "light")}>
      <nav className="side" aria-label={props.navLabel}>
        <div className="brand">
          <span className="mark">
            <Icon name={props.icon} />
          </span>
          <div>
            <div className="bn">{props.name}</div>
            {props.subtitle !== undefined && <div className="mu sm">{props.subtitle}</div>}
          </div>
        </div>
        {props.cockpit && (
          <a className="nav" href={props.cockpit.href}>
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
      </nav>
      <main className="main">{props.children}</main>
    </div>
  );
}
