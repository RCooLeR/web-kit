// Screen options: a tab at the top right of a screen that opens a panel above it with the
// columns of a list, the boxes of an edit screen and the number of items per page. Columns and
// boxes apply as they are ticked; the item count applies with its Apply button.
import { useId, useState, type SubmitEvent, type ReactNode } from "react";

import { cx } from "@rcooler/react-ui";

export interface ScreenOptionChoice {
  key: string;
  label: string;
  checked: boolean;
  disabled?: boolean | undefined;
}

export interface ScreenOptionGroup {
  /** The group's legend, such as "Columns" or "Boxes". */
  legend: string;
  items: readonly ScreenOptionChoice[];
  onToggle: (key: string, checked: boolean) => void;
}

export interface ScreenOptionsPerPage {
  /** Label of the field, such as "Number of items per page". */
  label: string;
  /** Legend of its group, such as "Pagination". */
  legend: string;
  value: number;
  min?: number | undefined;
  max?: number | undefined;
  onApply: (value: number) => void;
}

export interface ScreenOptionsProps {
  /** Text of the tab and name of the panel, such as "Screen options". */
  label: string;
  columns?: ScreenOptionGroup | undefined;
  boxes?: ScreenOptionGroup | undefined;
  perPage?: ScreenOptionsPerPage | undefined;
  applyLabel?: string | undefined;
  /** More fieldsets in the panel. */
  children?: ReactNode;
  /** More tabs beside this one, such as Help. */
  links?: ReactNode;
  /** Controlled open state; the panel keeps its own when omitted. */
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  className?: string | undefined;
}

function Choices({ group }: { group: ScreenOptionGroup }) {
  return (
    <fieldset className="rc-screen-options-group">
      <legend>{group.legend}</legend>
      {group.items.map((item) => (
        <label key={item.key} className="rc-screen-options-choice">
          <input
            type="checkbox"
            checked={item.checked}
            disabled={item.disabled}
            onChange={(event) => group.onToggle(item.key, event.target.checked)}
          />
          {item.label}
        </label>
      ))}
    </fieldset>
  );
}

export function ScreenOptions({
  label,
  columns,
  boxes,
  perPage,
  applyLabel = "Apply",
  children,
  links,
  open: controlled,
  onOpenChange,
  className,
}: ScreenOptionsProps) {
  const panelId = useId();
  const fieldId = useId();
  const [own, setOwn] = useState(false);
  const open = controlled ?? own;
  const setOpen = (value: boolean) => {
    if (controlled === undefined) setOwn(value);
    onOpenChange?.(value);
  };
  // The typed count belongs to the value it was typed over; a new value starts from itself.
  const [typed, setTyped] = useState({
    base: perPage?.value ?? 0,
    value: String(perPage?.value ?? ""),
  });
  const draft =
    perPage && typed.base === perPage.value ? typed.value : String(perPage?.value ?? "");
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!perPage) return;
    const value = Number.parseInt(draft, 10);
    const min = perPage.min ?? 1;
    const max = perPage.max ?? 999;
    if (!Number.isFinite(value)) return;
    perPage.onApply(Math.min(Math.max(value, min), max));
  };
  return (
    <div className={cx("rc-screen-options", className)}>
      <form
        id={panelId}
        className="rc-screen-options-panel"
        aria-label={label}
        hidden={!open}
        onSubmit={submit}
      >
        {columns && <Choices group={columns} />}
        {boxes && <Choices group={boxes} />}
        {perPage && (
          <fieldset className="rc-screen-options-group">
            <legend>{perPage.legend}</legend>
            <label className="rc-screen-options-choice" htmlFor={fieldId}>
              {perPage.label}
            </label>
            <input
              id={fieldId}
              className="rc-input rc-screen-options-number"
              type="number"
              inputMode="numeric"
              min={perPage.min ?? 1}
              max={perPage.max ?? 999}
              value={draft}
              onChange={(event) => setTyped({ base: perPage.value, value: event.target.value })}
            />
          </fieldset>
        )}
        {children}
        {perPage && (
          <div className="rc-screen-options-actions">
            <button type="submit" className="rc-button rc-button-primary">
              {applyLabel}
            </button>
          </div>
        )}
      </form>
      <div className="rc-screen-meta-links">
        <button
          type="button"
          className="rc-screen-meta-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
        >
          {label}
          <svg
            viewBox="0 0 24 24"
            width="11"
            height="11"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={open ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
          </svg>
        </button>
        {links}
      </div>
    </div>
  );
}
