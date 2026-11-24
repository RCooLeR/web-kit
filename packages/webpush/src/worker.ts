// @rcooler/webpush/worker: what a service worker does with a push. It shows the message the
// server sent, opens the app when the notification is tapped, and tells the server when the
// browser replaced its subscription.
//
// The types below describe only the parts of the service worker API that are used, so this file
// compiles without the WebWorker library and its handlers can be tested with plain objects. A
// real ServiceWorkerGlobalScope and its events fit them.

/** The message a server pushes, after validation. */
export interface PushMessage {
  title: string;
  body: string;
  /** A later message with the same tag replaces the earlier one on the device. */
  tag: string;
  /** The page to open on tap; always a path or URL of this app. */
  url: string;
}

/** What to show when a message leaves a field out, and the app's icons. */
export interface PushDefaults {
  title: string;
  tag: string;
  /** Page opened when a message names none; "/" when omitted. */
  url?: string;
  icon?: string;
  badge?: string;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value !== "" ? value : fallback;
}

/**
 * Reads a pushed payload. The payload is outside data: anything that is not a non-empty string
 * falls back to the default, and a payload that is not an object gives the defaults alone, since
 * the browser demands a notification for every push.
 */
export function readPushMessage(payload: unknown, defaults: PushDefaults): PushMessage {
  const fields: Record<string, unknown> =
    typeof payload === "object" && payload !== null ? { ...payload } : {};
  return {
    title: text(fields.title, defaults.title),
    body: text(fields.body, ""),
    tag: text(fields.tag, defaults.tag),
    url: text(fields.url, defaults.url ?? "/"),
  };
}

/**
 * The address to open for a tapped notification. The address came in a message, so only pages
 * of this app are opened: anything on another origin, or unparsable, becomes the app's start page.
 */
export function clickTarget(url: unknown, origin: string): string {
  try {
    const target = new URL(text(url, "/"), origin);
    return target.origin === origin ? target.href : `${origin}/`;
  } catch {
    return `${origin}/`;
  }
}

/** An open window of the app, as the Clients API gives it. */
export interface WindowClientLike {
  readonly url: string;
  focus(): Promise<WindowClientLike>;
  navigate(url: string): Promise<WindowClientLike | null>;
}

interface ExtendableEventLike {
  waitUntil(work: Promise<unknown>): void;
}

export interface PushEventLike extends ExtendableEventLike {
  readonly data: { json(): unknown } | null;
}

export interface NotificationClickEventLike extends ExtendableEventLike {
  readonly notification: { close(): void; readonly data?: unknown };
}

/** The two forms of `pushsubscriptionchange`: browsers pass the new subscription, the old one, or neither. */
export interface SubscriptionChangeEventLike extends ExtendableEventLike {
  readonly newSubscription?: { toJSON(): PushSubscriptionJSON } | null;
  readonly oldSubscription?: { readonly options: PushSubscriptionOptionsInit } | null;
}

/** The parts of ServiceWorkerGlobalScope the handlers use. */
export interface WorkerScopeLike {
  readonly location: { readonly origin: string };
  readonly registration: {
    showNotification(title: string, options: NotificationOptions): Promise<void>;
    readonly pushManager: {
      subscribe(options: PushSubscriptionOptionsInit): Promise<{ toJSON(): PushSubscriptionJSON }>;
    };
  };
  readonly clients: {
    matchAll(options: {
      type: "window";
      includeUncontrolled: boolean;
    }): Promise<readonly WindowClientLike[]>;
    openWindow(url: string): Promise<unknown>;
  };
  addEventListener(type: "push", listener: (event: PushEventLike) => void): void;
  addEventListener(
    type: "notificationclick",
    listener: (event: NotificationClickEventLike) => void,
  ): void;
  addEventListener(
    type: "pushsubscriptionchange",
    listener: (event: SubscriptionChangeEventLike) => void,
  ): void;
}

/** Shows the pushed message as a notification. */
export function showPushed(
  scope: WorkerScopeLike,
  event: PushEventLike,
  defaults: PushDefaults,
): void {
  let payload: unknown;
  try {
    payload = event.data?.json();
  } catch {
    // Not one of the server's messages; the defaults are shown.
  }
  const message = readPushMessage(payload, defaults);
  const options: NotificationOptions = {
    body: message.body,
    tag: message.tag,
    data: { url: message.url },
  };
  if (defaults.icon !== undefined) options.icon = defaults.icon;
  if (defaults.badge !== undefined) options.badge = defaults.badge;
  event.waitUntil(scope.registration.showNotification(message.title, options));
}

function notificationUrl(data: unknown): unknown {
  return typeof data === "object" && data !== null && "url" in data ? data.url : undefined;
}

/**
 * Opens the page of a tapped notification. An open app window is brought forward and, when it
 * shows another page, taken to the one asked for; without a window a new one is opened.
 */
export function openClicked(scope: WorkerScopeLike, event: NotificationClickEventLike): void {
  event.notification.close();
  const url = clickTarget(notificationUrl(event.notification.data), scope.location.origin);
  event.waitUntil(
    (async () => {
      const windows = await scope.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => client.url === url) ?? windows[0];
      if (!open) {
        await scope.clients.openWindow(url);
        return;
      }
      const focused = await open.focus().catch(() => open);
      if (focused.url !== url) {
        await focused.navigate(url).catch(() => scope.clients.openWindow(url));
      }
    })(),
  );
}

/**
 * Handles a subscription the browser replaced: subscribes again when the browser did not, and
 * hands the new subscription to `report`, which sends it to the app's server. Without this,
 * notifications stop until the app is opened again.
 */
export function resubscribe(
  scope: WorkerScopeLike,
  event: SubscriptionChangeEventLike,
  report: (subscription: PushSubscriptionJSON) => Promise<unknown>,
): void {
  event.waitUntil(
    (async () => {
      const options = event.oldSubscription?.options;
      const subscription =
        event.newSubscription ??
        (options ? await scope.registration.pushManager.subscribe(options) : undefined);
      if (subscription) await report(subscription.toJSON());
    })(),
  );
}

export interface PushHandlerOptions {
  defaults: PushDefaults;
  /** Sends a replaced subscription to the app's server, with the session cookie. */
  onSubscriptionChange: (subscription: PushSubscriptionJSON) => Promise<unknown>;
}

/**
 * Registers the three handlers on the service worker's global scope:
 * `registerPushHandlers(self, { defaults, onSubscriptionChange })`.
 */
export function registerPushHandlers(scope: WorkerScopeLike, options: PushHandlerOptions): void {
  scope.addEventListener("push", (event) => showPushed(scope, event, options.defaults));
  scope.addEventListener("notificationclick", (event) => openClicked(scope, event));
  scope.addEventListener("pushsubscriptionchange", (event) =>
    resubscribe(scope, event, options.onSubscriptionChange),
  );
}
