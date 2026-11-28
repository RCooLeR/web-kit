// The settings form table: one row per setting, its name on the left and the control with its
// description on the right; at phone width the name sits above the control. A row hands its
// control the id its label points at and the ids of the description and error (the FieldControl
// of @rcooler/react-ui). A group row (radio buttons, several inputs) is a fieldset named by its
// legend instead.
import { useId, type ReactNode } from "react";

import { cx, type FieldControl } from "@rcooler/react-ui";

export interface FormTableProps {
  children: ReactNode;
  className?: string | undefined;
}

export function FormTable({ children, className }: FormTableProps) {
  return <div className={cx("rc-form-table", className)}>{children}</div>;
}

export interface FormTableRowProps {
  label: ReactNode;
  /** Help under the control. */
  description?: ReactNode;
  /** A problem with the value: the control is marked invalid and points at it. */
  error?: ReactNode;
  /** A fieldset with a legend, for radio buttons and other groups of controls. */
  group?: boolean | undefined;
  /** Disables every control of a group row at once, as while it saves. */
  disabled?: boolean | undefined;
  children: (control: FieldControl) => ReactNode;
  className?: string | undefined;
}

export function FormTableRow({
  label,
  description,
  error,
  group,
  disabled,
  children,
  className,
}: FormTableRowProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const describedBy = [description !== undefined && descriptionId, error !== undefined && errorId]
    .filter(Boolean)
    .join(" ");
  const control: FieldControl = { id };
  if (describedBy !== "") control["aria-describedby"] = describedBy;
  if (error !== undefined) control["aria-invalid"] = true;
  const notes = (
    <>
      {description !== undefined && (
        <div className="rc-form-description" id={descriptionId}>
          {description}
        </div>
      )}
      {error !== undefined && (
        <div className="rc-form-error" id={errorId}>
          {error}
        </div>
      )}
    </>
  );
  if (group) {
    return (
      <fieldset
        className={cx("rc-form-row", error !== undefined && "is-invalid", className)}
        aria-describedby={describedBy || undefined}
        disabled={disabled}
      >
        <legend className="rc-form-label">{label}</legend>
        <div className="rc-form-field">
          {children(control)}
          {notes}
        </div>
      </fieldset>
    );
  }
  return (
    <div className={cx("rc-form-row", error !== undefined && "is-invalid", className)}>
      <div className="rc-form-label">
        <label htmlFor={id}>{label}</label>
      </div>
      <div className="rc-form-field">
        {children(control)}
        {notes}
      </div>
    </div>
  );
}

/** The buttons under a form table: the save button first. */
export function FormActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return <div className={cx("rc-form-actions", className)}>{children}</div>;
}
