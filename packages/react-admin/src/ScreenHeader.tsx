// The top of an admin screen: the screen-meta row (screen options, help) on the right, then the
// title with its page action ("Add new") and any further actions, then whatever the screen puts
// under its title (notices, a description).
import type { MouseEvent, ReactNode } from "react";

import { cx } from "@rcooler/react-ui";

export interface PageAction {
  label: ReactNode;
  /** A link to the screen the action opens; without one the action is a button. */
  href?: string | undefined;
  onSelect?: ((event: MouseEvent<HTMLElement>) => void) | undefined;
  disabled?: boolean | undefined;
}

export interface ScreenHeaderProps {
  title: ReactNode;
  /** The screen's main action beside the title, such as "Add new". */
  action?: PageAction | undefined;
  /** More controls after the page action. */
  actions?: ReactNode;
  /** The screen-meta row above the title, usually ScreenOptions. */
  meta?: ReactNode;
  children?: ReactNode;
  className?: string | undefined;
}

export function PageActionLink({ action }: { action: PageAction }) {
  if (action.href !== undefined && !action.disabled) {
    return (
      <a className="rc-page-action" href={action.href} onClick={action.onSelect}>
        {action.label}
      </a>
    );
  }
  return (
    <button
      type="button"
      className="rc-page-action"
      disabled={action.disabled}
      onClick={action.onSelect}
    >
      {action.label}
    </button>
  );
}

export function ScreenHeader({
  title,
  action,
  actions,
  meta,
  children,
  className,
}: ScreenHeaderProps) {
  return (
    <div className={cx("rc-screen-header", className)}>
      {meta !== undefined && <div className="rc-screen-meta">{meta}</div>}
      <div className="rc-screen-title-row">
        <h1 className="rc-screen-title">{title}</h1>
        {action && <PageActionLink action={action} />}
        {actions}
      </div>
      {children}
    </div>
  );
}
