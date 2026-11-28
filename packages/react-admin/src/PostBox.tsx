// Postboxes (metaboxes): titled boxes on edit screens that collapse, move up and down and can be
// hidden through screen options. PostBox draws one box; PostBoxes draws a column of them in the
// reader's order; usePostBoxLayout keeps that order, the collapsed and the hidden boxes, and can
// remember them in the browser under a key the app chooses.
import { useCallback, useId, useState, type ReactNode } from "react";

import { cx } from "@rcooler/react-ui";

export interface PostBoxLabels {
  /** Accessible name of the collapse button: "Toggle panel: SEO". */
  toggle: (title: string) => string;
  moveUp: (title: string) => string;
  moveDown: (title: string) => string;
}

export const defaultPostBoxLabels: PostBoxLabels = {
  toggle: (title) => `Toggle panel: ${title}`,
  moveUp: (title) => `Move ${title} box up`,
  moveDown: (title) => `Move ${title} box down`,
};

export interface PostBoxProps {
  title: string;
  children: ReactNode;
  collapsed?: boolean | undefined;
  /** Shows the collapse button. */
  onToggle?: (() => void) | undefined;
  /** Shows the move buttons; undefined at the first or last place disables that direction. */
  onMoveUp?: (() => void) | undefined;
  onMoveDown?: (() => void) | undefined;
  /** Shows move buttons even when neither direction is possible (a single box keeps its look). */
  movable?: boolean | undefined;
  /** More controls in the header, before the handle buttons. */
  actions?: ReactNode;
  labels?: Partial<PostBoxLabels> | undefined;
  id?: string | undefined;
  className?: string | undefined;
}

function Chevron({ up }: { up: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
    </svg>
  );
}

export function PostBox({
  title,
  children,
  collapsed = false,
  onToggle,
  onMoveUp,
  onMoveDown,
  movable,
  actions,
  labels: given,
  id,
  className,
}: PostBoxProps) {
  const labels = { ...defaultPostBoxLabels, ...given };
  const generated = useId();
  const bodyId = `${id ?? generated}-body`;
  const showMove = movable === true || onMoveUp !== undefined || onMoveDown !== undefined;
  return (
    <section
      id={id}
      className={cx("rc-postbox", collapsed && "is-collapsed", className)}
      aria-label={title}
    >
      <div className="rc-postbox-header">
        <h2 className="rc-postbox-title">{title}</h2>
        {actions}
        {showMove && (
          <>
            <button
              type="button"
              className="rc-postbox-handle"
              aria-label={labels.moveUp(title)}
              disabled={!onMoveUp}
              onClick={onMoveUp}
            >
              <Chevron up />
            </button>
            <button
              type="button"
              className="rc-postbox-handle"
              aria-label={labels.moveDown(title)}
              disabled={!onMoveDown}
              onClick={onMoveDown}
            >
              <Chevron up={false} />
            </button>
          </>
        )}
        {onToggle && (
          <button
            type="button"
            className="rc-postbox-handle rc-postbox-toggle"
            aria-label={labels.toggle(title)}
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            onClick={onToggle}
          >
            <Chevron up={!collapsed} />
          </button>
        )}
      </div>
      <div className="rc-postbox-body" id={bodyId} hidden={collapsed}>
        {children}
      </div>
    </section>
  );
}

export interface PostBoxLayout {
  order: readonly string[];
  collapsed: readonly string[];
  hidden: readonly string[];
}

export interface PostBoxLayoutState {
  layout: PostBoxLayout;
  /** The given boxes in the reader's order; boxes the stored order does not know come last. */
  ordered: (ids: readonly string[]) => string[];
  toggle: (id: string) => void;
  /** Moves a box by delta places among the given boxes. */
  move: (id: string, delta: number, ids: readonly string[]) => void;
  setHidden: (id: string, hidden: boolean) => void;
  isCollapsed: (id: string) => boolean;
  isHidden: (id: string) => boolean;
}

const emptyLayout: PostBoxLayout = { order: [], collapsed: [], hidden: [] };

function readLayout(storageKey: string | undefined, initial: PostBoxLayout): PostBoxLayout {
  if (!storageKey) return initial;
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
    if (typeof stored !== "object" || stored === null) return initial;
    const list = (value: unknown, fallback: readonly string[]) =>
      Array.isArray(value) && value.every((item) => typeof item === "string") ? value : fallback;
    const record = stored as Record<string, unknown>;
    return {
      order: list(record.order, initial.order),
      collapsed: list(record.collapsed, initial.collapsed),
      hidden: list(record.hidden, initial.hidden),
    };
  } catch {
    return initial;
  }
}

export function usePostBoxLayout(options?: {
  /** Remembers the layout in localStorage under this key. */
  storageKey?: string | undefined;
  initial?: Partial<PostBoxLayout> | undefined;
}): PostBoxLayoutState {
  const storageKey = options?.storageKey;
  const [layout, setLayout] = useState<PostBoxLayout>(() =>
    readLayout(storageKey, { ...emptyLayout, ...options?.initial }),
  );
  const update = useCallback(
    (change: (previous: PostBoxLayout) => PostBoxLayout) =>
      setLayout((previous) => {
        const next = change(previous);
        if (storageKey) {
          try {
            window.localStorage.setItem(storageKey, JSON.stringify(next));
          } catch {
            // The layout still applies to this page when the browser refuses storage.
          }
        }
        return next;
      }),
    [storageKey],
  );
  const ordered = (ids: readonly string[]) => {
    const known = layout.order.filter((id) => ids.includes(id));
    return [...known, ...ids.filter((id) => !known.includes(id))];
  };
  const flip = (list: readonly string[], id: string, on: boolean) =>
    on ? (list.includes(id) ? list : [...list, id]) : list.filter((item) => item !== id);
  return {
    layout,
    ordered,
    toggle: (id) =>
      update((previous) => ({
        ...previous,
        collapsed: flip(previous.collapsed, id, !previous.collapsed.includes(id)),
      })),
    move: (id, delta, ids) =>
      update((previous) => {
        const known = previous.order.filter((item) => ids.includes(item));
        const order = [...known, ...ids.filter((item) => !known.includes(item))];
        const from = order.indexOf(id);
        const to = from + delta;
        if (from < 0 || to < 0 || to >= order.length) return previous;
        order.splice(from, 1);
        order.splice(to, 0, id);
        const others = previous.order.filter((item) => !ids.includes(item));
        return { ...previous, order: [...order, ...others] };
      }),
    setHidden: (id, hidden) =>
      update((previous) => ({ ...previous, hidden: flip(previous.hidden, id, hidden) })),
    isCollapsed: (id) => layout.collapsed.includes(id),
    isHidden: (id) => layout.hidden.includes(id),
  };
}

export interface PostBoxDefinition {
  id: string;
  title: string;
  render: () => ReactNode;
}

export interface PostBoxesProps {
  boxes: readonly PostBoxDefinition[];
  state: PostBoxLayoutState;
  labels?: Partial<PostBoxLabels> | undefined;
  /** Accessible name of the column, such as "Article settings". */
  label?: string | undefined;
  className?: string | undefined;
}

/** A column of postboxes in the reader's order, without the hidden ones. */
export function PostBoxes({ boxes, state, labels, label, className }: PostBoxesProps) {
  const ids = boxes.map((box) => box.id);
  const visible = state.ordered(ids).filter((id) => !state.isHidden(id));
  return (
    <div
      className={cx("rc-postboxes", className)}
      role={label ? "region" : undefined}
      aria-label={label}
    >
      {visible.map((id, index) => {
        const box = boxes.find((candidate) => candidate.id === id);
        if (!box) return null;
        return (
          <PostBox
            key={id}
            title={box.title}
            collapsed={state.isCollapsed(id)}
            onToggle={() => state.toggle(id)}
            onMoveUp={index > 0 ? () => state.move(id, -1, visible) : undefined}
            onMoveDown={index < visible.length - 1 ? () => state.move(id, 1, visible) : undefined}
            movable
            labels={labels}
          >
            {box.render()}
          </PostBox>
        );
      })}
    </div>
  );
}
