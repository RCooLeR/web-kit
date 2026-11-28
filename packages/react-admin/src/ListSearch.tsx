// The search box of a list table: a labelled search field and its submit button. The field is
// controlled; the search runs on submit, so typing does not refetch on every key.
import { useId, type SubmitEvent } from "react";

import { cx } from "@rcooler/react-ui";

export interface ListSearchProps {
  /** Label of the field and, unless buttonLabel is given, of the button ("Search articles"). */
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  buttonLabel?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

export function ListSearch({
  label,
  value,
  onChange,
  onSubmit,
  buttonLabel,
  disabled,
  className,
}: ListSearchProps) {
  const id = useId();
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(value.trim());
  };
  return (
    <form className={cx("rc-list-search", className)} role="search" onSubmit={submit}>
      <label className="rc-visually-hidden" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="rc-input"
        type="search"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <button type="submit" className="rc-button" disabled={disabled}>
        {buttonLabel ?? label}
      </button>
    </form>
  );
}
