// The parts of the shared look as React components. Each renders the kit.css classes of the
// approved previews, so a page can mix them with its own markup in the same classes.
import {
  useId,
  useRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { Icon, IconBadge, cx, toneClass, toneColor, type Tone } from "./Icon.js";
import type { IconName } from "./icons.js";

export interface CardProps {
  title?: ReactNode;
  /** Shown at the right of the title row: a link, a chip, a button. */
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** A surface with an optional title row (kit.css .card, .hd, .h2). */
export function Card({ title, actions, children, className }: CardProps) {
  return (
    <section className={cx("card", className)}>
      {(title !== undefined || actions !== undefined) && (
        <div className="hd">
          {title !== undefined && <h2 className="h2">{title}</h2>}
          {actions !== undefined && (
            <div className="hd sp" style={{ gap: 8 }}>
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  /** The line under the number that says what it means; it carries the meaning of a tone. */
  note?: ReactNode;
  tone?: Tone;
}

/** A card with one big number (kit.css .kv). */
export function Stat({ label, value, note, tone }: StatProps) {
  return (
    <div className="card">
      <div className="mu sm">{label}</div>
      <div className="kv" style={tone ? { color: toneColor[tone] } : undefined}>
        {value}
      </div>
      {note !== undefined && <div className="mu sm">{note}</div>}
    </div>
  );
}

export interface ChipProps {
  tone?: Tone;
  icon?: IconName;
  className?: string;
  children: ReactNode;
}

/** A short state or label (kit.css .chip). */
export function Chip({ tone, icon, className, children }: ChipProps) {
  return (
    <span className={cx("chip", tone && toneClass[tone], className)}>
      {icon && <Icon name={icon} small />}
      {children}
    </span>
  );
}

type Variant = "primary" | "ghost" | "danger";

const variantClass: Record<Variant, string> = { primary: "pri", ghost: "gh", danger: "bd" };

interface ButtonLook {
  variant?: Variant;
  /** A 44 by 44 icon button; give it an aria-label. */
  square?: boolean;
  /** Pressed or selected, as in a group of toggles. */
  on?: boolean;
  icon?: IconName;
}

function buttonClass(
  variant: Variant | undefined,
  square: boolean | undefined,
  on: boolean | undefined,
  className: string | undefined,
): string {
  return cx("btn", variant && variantClass[variant], square && "sq", on && "on", className);
}

export type ButtonProps = ButtonLook & ButtonHTMLAttributes<HTMLButtonElement>;

/** A 44 px button (kit.css .btn); type="button" unless told otherwise. */
export function Button({
  variant,
  square,
  on,
  icon,
  className,
  children,
  type,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={buttonClass(variant, square, on, className)}
      {...rest}
    >
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

export type ButtonLinkProps = ButtonLook & AnchorHTMLAttributes<HTMLAnchorElement>;

/** A link that looks like a button. */
export function ButtonLink({
  variant,
  square,
  on,
  icon,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <a className={buttonClass(variant, square, on, className)} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </a>
  );
}

export interface RowProps {
  /** The first row of a list, without the line above it. */
  first?: boolean;
  className?: string;
  children: ReactNode;
}

/** One line of a list (kit.css .row). */
export function Row({ first, className, children }: RowProps) {
  return <div className={cx("row", first && "f", className)}>{children}</div>;
}

export interface ProgressProps {
  value: number;
  max?: number;
  /** What is measured, for assistive technology. */
  label: string;
  /** Read out instead of the number, such as "7 of 12". */
  valueText?: string;
  className?: string;
}

/** A progress bar (kit.css .pb). */
export function Progress({ value, max = 100, label, valueText, className }: ProgressProps) {
  const share = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  return (
    <div
      className={cx("pb", className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
    >
      <span style={{ width: `${(share * 100).toFixed(1)}%` }} />
    </div>
  );
}

/** What Field hands its control: the id its label points at and the texts that describe it. */
export interface FieldControl {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  /** A problem with the value; the control is marked invalid and points at it. */
  error?: ReactNode;
  className?: string;
  children: (control: FieldControl) => ReactNode;
}

/** A labelled form field (kit.css .fld): `{(control) => <Input {...control} />}`. */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint !== undefined && hintId, error !== undefined && errorId]
    .filter(Boolean)
    .join(" ");
  const control: FieldControl = { id };
  if (describedBy !== "") control["aria-describedby"] = describedBy;
  if (error !== undefined) control["aria-invalid"] = true;
  return (
    <div className={cx("fld", className)}>
      <label htmlFor={id}>{label}</label>
      {children(control)}
      {hint !== undefined && (
        <div id={hintId} className="hint">
          {hint}
        </div>
      )}
      {error !== undefined && (
        <div id={errorId} className="err">
          {error}
        </div>
      )}
    </div>
  );
}

/** A text input in the kit's look (kit.css .in). */
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx("in", className)} {...rest} />;
}

/** A select in the kit's look. */
export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx("in", className)} {...rest} />;
}

/** A text area in the kit's look. */
export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx("in", className)} {...rest} />;
}

export interface SegmentedProps<Value extends string> {
  /** Accessible name of the choice. */
  label: string;
  options: readonly { value: Value; label: ReactNode; icon?: IconName }[];
  value: Value;
  onChange: (value: Value) => void;
  className?: string;
}

/**
 * One choice out of a few, as a row of buttons (kit.css .sg). It is a radio group: Tab reaches the
 * chosen button, the arrow keys move the choice.
 */
export function Segmented<Value extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedProps<Value>) {
  const group = useRef<HTMLDivElement>(null);
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0 || options.length === 0) return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + step + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    const buttons = group.current?.querySelectorAll<HTMLButtonElement>("button");
    buttons?.[options.indexOf(next)]?.focus();
  };
  return (
    <div
      ref={group}
      className={cx("sg", className)}
      role="radiogroup"
      aria-label={label}
      onKeyDown={move}
    >
      {options.map((option) => {
        const chosen = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={chosen}
            tabIndex={chosen ? 0 : -1}
            className={cx("btn", chosen && "on")}
            onClick={() => onChange(option.value)}
          >
            {option.icon && <Icon name={option.icon} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export interface CheckLineProps {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** A checkbox with its label on one 44 px line (kit.css .ck). */
export function CheckLine({ label, checked, onChange, disabled, className }: CheckLineProps) {
  return (
    <label className={cx("ck", className)}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

export interface MasterDetailProps {
  list: ReactNode;
  /** The selected item's detail, or what to show while nothing is selected. */
  detail: ReactNode;
  className?: string;
}

/** A list with the detail of its selected item beside it; stacked below 1000 px (kit.css .md). */
export function MasterDetail({ list, detail, className }: MasterDetailProps) {
  return (
    <div className={cx("md", className)}>
      <div style={{ minWidth: 0 }}>{list}</div>
      <div style={{ minWidth: 0 }}>{detail}</div>
    </div>
  );
}

export interface TabItem {
  key: string;
  label: ReactNode;
  icon?: IconName;
  current?: boolean;
  /** A link to the tab's page; without one the tab is a button that calls onSelect. */
  href?: string;
  onSelect?: () => void;
}

export interface TabsProps {
  /** Accessible name of the tab row. */
  label: string;
  items: readonly TabItem[];
  className?: string;
}

/** A row of tabs that lead to pages or switch a view (kit.css .tabs, .tab). */
export function Tabs({ label, items, className }: TabsProps) {
  return (
    <nav className={cx("tabs", className)} aria-label={label}>
      {items.map((item) =>
        item.href !== undefined ? (
          <a
            key={item.key}
            className={cx("tab", item.current && "on")}
            href={item.href}
            aria-current={item.current ? "page" : undefined}
          >
            {item.icon && <Icon name={item.icon} />}
            {item.label}
          </a>
        ) : (
          <button
            key={item.key}
            type="button"
            className={cx("tab", item.current && "on")}
            aria-pressed={item.current ?? false}
            onClick={item.onSelect}
          >
            {item.icon && <Icon name={item.icon} />}
            {item.label}
          </button>
        ),
      )}
    </nav>
  );
}

export interface PlateProps {
  icon: IconName;
  tone?: Tone;
  title: ReactNode;
  detail?: ReactNode;
  /** Shown at the right: a chip, a number. */
  aside?: ReactNode;
  /** Makes the whole plate a link. */
  href?: string;
  className?: string;
}

/** A tile with an icon, a title and a line under it (kit.css .pl). */
export function Plate({ icon, tone, title, detail, aside, href, className }: PlateProps) {
  const content = (
    <>
      <IconBadge icon={icon} {...(tone ? { tone } : {})} />
      <div className="grow">
        <div className="b ell">{title}</div>
        {detail !== undefined && <div className="mu sm ell">{detail}</div>}
      </div>
      {aside}
    </>
  );
  return href !== undefined ? (
    <a className={cx("pl", className)} href={href}>
      {content}
    </a>
  ) : (
    <div className={cx("pl", className)}>{content}</div>
  );
}

export interface GridColumn<Row> {
  key: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  /** Numbers and amounts line up at the right. */
  align?: "end";
}

export interface RowGridProps<Row> {
  /** Accessible name of the table. */
  label: string;
  columns: readonly GridColumn<Row>[];
  /** The CSS grid columns, such as "minmax(0,2fr) repeat(3,minmax(0,1fr))". */
  template: string;
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  /** Shown in place of the rows when there are none. */
  empty: ReactNode;
  className?: string;
}

/**
 * A table drawn as grid rows (kit.css .tr), with a header row. Below 760 px it keeps its columns
 * and scrolls inside its box.
 */
export function RowGrid<Row>({
  label,
  columns,
  template,
  rows,
  rowKey,
  empty,
  className,
}: RowGridProps<Row>) {
  const style = { "--cols": template } as CSSProperties;
  return (
    <div className={cx("scroll", className)} role="table" aria-label={label}>
      <div className="tr f th" role="row" style={style}>
        {columns.map((column) => (
          <span key={column.key} role="columnheader" className={column.align ? "ar" : undefined}>
            {column.header}
          </span>
        ))}
      </div>
      {rows.length === 0 ? (
        <div role="row">
          <div role="cell" className="empty">
            {empty}
          </div>
        </div>
      ) : (
        rows.map((row) => (
          <div key={rowKey(row)} className="tr" role="row" style={style}>
            {columns.map((column) => (
              <div key={column.key} role="cell" className={column.align ? "ar" : undefined}>
                {column.cell(row)}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

export interface DotProps {
  state?: "ok" | "warn" | "off";
}

/** A small state dot (kit.css .dot); put the state in words beside it. */
export function Dot({ state = "ok" }: DotProps) {
  return (
    <span
      className={cx("dot", state === "warn" && "wr", state === "off" && "off")}
      aria-hidden="true"
    />
  );
}

/** What an empty list shows. */
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
