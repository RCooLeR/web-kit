// Bulk actions of a list table: a select of actions and an Apply button. Apply is enabled once an
// action is chosen and at least one row is selected; after applying, the choice resets.
import { useId, useState } from "react";

import { cx } from "@rcooler/react-ui";

export interface BulkAction {
  value: string;
  label: string;
  disabled?: boolean | undefined;
}

export interface BulkActionsProps {
  actions: readonly BulkAction[];
  /** Number of selected rows; Apply stays disabled at zero. */
  selectedCount: number;
  onApply: (action: string) => void;
  /** Label of the select and its empty option, such as "Bulk actions". */
  label?: string | undefined;
  applyLabel?: string | undefined;
  /** The "2 selected" text after Apply; nothing is shown when omitted. */
  selectedLabel?: ((count: number) => string) | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

export function BulkActions({
  actions,
  selectedCount,
  onApply,
  label = "Bulk actions",
  applyLabel = "Apply",
  selectedLabel,
  disabled,
  className,
}: BulkActionsProps) {
  const id = useId();
  const [choice, setChoice] = useState("");
  const chosen = actions.find((action) => action.value === choice && !action.disabled);
  return (
    <div className={cx("rc-bulk-actions", className)}>
      <label className="rc-visually-hidden" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="rc-input"
        value={chosen ? choice : ""}
        disabled={disabled}
        onChange={(event) => setChoice(event.target.value)}
      >
        <option value="">{label}</option>
        {actions.map((action) => (
          <option key={action.value} value={action.value} disabled={action.disabled}>
            {action.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="rc-button"
        disabled={disabled || !chosen || selectedCount === 0}
        onClick={() => {
          if (!chosen) return;
          onApply(chosen.value);
          setChoice("");
        }}
      >
        {applyLabel}
      </button>
      {selectedLabel && selectedCount > 0 && (
        <span className="rc-bulk-actions-count" role="status">
          {selectedLabel(selectedCount)}
        </span>
      )}
    </div>
  );
}
