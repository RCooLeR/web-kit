// Keeps keyboard focus inside an open dialog and gives it back when the dialog closes.
import { useEffect, useEffectEvent, type RefObject } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * The open traps, the one opened last at the end. Every trap listens on the document, so only the
 * last one answers keys: one Escape closes one dialog, and the dialogs behind it leave Tab alone.
 */
const openTraps: object[] = [];

/** The elements inside root that Tab can reach, in document order. */
export function focusableChildren(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) =>
      !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true",
  );
}

/**
 * While `open`: moves focus into the panel, keeps Tab and Shift+Tab inside it, and calls
 * `onClose` on Escape. When it closes, focus returns to the element that had it before. With
 * dialogs open on top of each other, only the one opened last does any of this.
 */
export function useFocusTrap(
  open: boolean,
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  const close = useEffectEvent(onClose);

  useEffect(() => {
    if (!open) return undefined;
    const panel = panelRef.current;
    if (!panel) return undefined;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => {
      const first = focusableChildren(panel)[0];
      (first ?? panel).focus();
    }, 0);
    const trap = {};
    openTraps.push(trap);
    const onKeyDown = (event: KeyboardEvent) => {
      if (openTraps[openTraps.length - 1] !== trap) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = focusableChildren(panel);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        panel.focus();
        return;
      }
      if (!panel.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      openTraps.splice(openTraps.indexOf(trap), 1);
      previouslyFocused?.focus();
    };
  }, [open, panelRef]);
}
