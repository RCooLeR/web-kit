// A notice under the screen header. Errors and warnings are alerts and are read out at once;
// success and information are status messages read out when the reader is idle. A dismissible
// notice has a close button; the app decides what dismissing means.
import type { ReactNode } from "react";

import { cx } from "@rcooler/react-ui";

export type NoticeTone = "success" | "info" | "warning" | "error";

export interface NoticeProps {
  tone?: NoticeTone | undefined;
  children: ReactNode;
  /** Shows the close button. */
  onDismiss?: (() => void) | undefined;
  /** Accessible name of the close button, such as "Dismiss this notice". */
  dismissLabel?: string | undefined;
  /** Inside a box or form instead of under the header: no outer margin. */
  inline?: boolean | undefined;
  className?: string | undefined;
}

const iconPaths: Record<NoticeTone, string> = {
  success: "M5 12.5l4.5 4.5L19 7.5",
  info: "M12 11v6M12 7.5v.01M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z",
  warning:
    "M12 8v5M12 16.5v.01M10.3 3.9L2.6 17.3A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.7L13.7 3.9a2 2 0 0 0-3.4 0z",
  error: "M12 8v5M12 16.5v.01M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z",
};

export function Notice({
  tone = "info",
  children,
  onDismiss,
  dismissLabel = "Dismiss this notice",
  inline,
  className,
}: NoticeProps) {
  const urgent = tone === "error" || tone === "warning";
  return (
    <div
      className={cx("rc-notice", `rc-notice-${tone}`, inline && "rc-notice-inline", className)}
      role={urgent ? "alert" : "status"}
    >
      <svg
        className="rc-notice-icon"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={iconPaths[tone]} />
      </svg>
      <div className="rc-notice-body">{children}</div>
      {onDismiss && (
        <button
          type="button"
          className="rc-notice-dismiss"
          aria-label={dismissLabel}
          onClick={onDismiss}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}
