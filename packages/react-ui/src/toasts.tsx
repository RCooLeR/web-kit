// Short messages in the corner: a queue of at most four, each closing itself after a while. The
// queue logic is a pure function so it can be tested without a DOM.
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Icon, type Tone } from "./Icon.js";
import type { IconName } from "./icons.js";

export type ToastLevel = "success" | "info" | "warning" | "danger";

export interface Toast {
  id: string;
  level: ToastLevel;
  title: string;
  body?: string;
}

export interface ToastInput {
  level: ToastLevel;
  title: string;
  body?: string;
  /** Replaces a toast with the same id instead of adding one. */
  id?: string;
  /** How long it stays; DEFAULT_TOAST_MS when omitted. */
  ttlMs?: number;
}

export const DEFAULT_TOAST_MS = 4000;
export const MAX_TOASTS = 4;

/** The queue after adding one toast: same id replaced, oldest dropped beyond MAX_TOASTS. */
export function enqueue(queue: readonly Toast[], toast: Toast): Toast[] {
  return queue
    .filter((queued) => queued.id !== toast.id)
    .concat(toast)
    .slice(-MAX_TOASTS);
}

interface ToastApi {
  /** Shows a toast and returns its id. */
  push: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** How each level looks: a colour and an icon, so the level never shows by colour alone. */
const levelLook: Record<ToastLevel, { className: string; tone: Tone; icon: IconName }> = {
  success: { className: "ok", tone: "ok", icon: "check" },
  info: { className: "ac", tone: "accent", icon: "info" },
  warning: { className: "wr", tone: "warn", icon: "warning" },
  danger: { className: "bd", tone: "bad", icon: "warning" },
};

export interface ToastProviderProps {
  children: ReactNode;
  /** Label of each toast's close button, in the app's language. */
  closeLabel: string;
}

export function ToastProvider({ children, closeLabel }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = input.id ?? `toast-${++nextId.current}`;
      const toast: Toast = { id, level: input.level, title: input.title };
      if (input.body !== undefined) toast.body = input.body;
      setToasts((current) => enqueue(current, toast));
      const previous = timers.current.get(id);
      if (previous !== undefined) window.clearTimeout(previous);
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), input.ttlMs ?? DEFAULT_TOAST_MS),
      );
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) window.clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const api = useMemo(() => ({ push, dismiss }), [push, dismiss]);
  return (
    <ToastContext value={api}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => {
          const look = levelLook[toast.level];
          return (
            <div
              key={toast.id}
              className={`toast ${look.className}`}
              role={toast.level === "danger" ? "alert" : "status"}
            >
              <span style={{ color: `var(--${look.className})`, display: "flex" }}>
                <Icon name={look.icon} />
              </span>
              <div className="grow">
                <div className="b">{toast.title}</div>
                {toast.body !== undefined && <div className="mu sm">{toast.body}</div>}
              </div>
              <button
                type="button"
                className="btn gh sq"
                aria-label={closeLabel}
                onClick={() => dismiss(toast.id)}
              >
                <Icon name="close" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext>
  );
}

/** The toast queue of the nearest ToastProvider. */
export function useToasts(): ToastApi {
  const api = use(ToastContext);
  if (!api) throw new Error("useToasts needs a ToastProvider above it");
  return api;
}
