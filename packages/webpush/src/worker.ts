// @rcooler/webpush/worker: what a service worker does with a push. It shows the message the
// server sent with its action buttons, opens the app when the notification is tapped, hands the
// token of a tapped answer button to the app, and tells the server when the browser replaced its
// subscription.
//
// The types below describe only the parts of the service worker API that are used, so this file
// compiles without the WebWorker library and its handlers can be tested with plain objects. A
// real ServiceWorkerGlobalScope and its events fit them.

/** One button of a pushed message. */
export interface PushAction {
  /** "open" opens `url`; "answer" hands `token` to the app, which forwards it to its server. */
  kind: "open" | "answer";
  title: string;
  /** The single-use answer token, for kind "answer"; empty otherwise. */
  token: string;
  /** The page to open, for kind "open"; empty otherwise. */
  url: string;
}

/** The message a server pushes, after validation. */
export interface PushMessage {
  title: string;
  body: string;
  /** A later message with the same tag replaces the earlier one on the device. */
  tag: string;
  /** The page to open on tap; always a path or URL of this app. */
  url: string;
  /** The buttons, in order; at most MAX_ACTIONS. */
  actions: PushAction[];
}

/** The most buttons a message keeps; browsers show two or three. */
export const MAX_ACTIONS = 3;

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
 * Reads the buttons of a payload: `{"kind": "open", "title", "url"}` and
 * `{"kind": "callback", "title", "action": <token>}`. Anything else (a reply, a button without a
 * title, a token or a page) is left out, because a service worker cannot handle it.
 */
function readActions(value: unknown): PushAction[] {
  if (!Array.isArray(value)) return [];
  const actions: PushAction[] = [];
  for (const entry of value as unknown[]) {
    if (typeof entry !== "object" || entry === null) continue;
    const fields: Record<string, unknown> = { ...entry };
    const title = text(fields.title, "");
    if (title === "") continue;
    if (fields.kind === "open" && text(fields.url, "") !== "") {
      actions.push({ kind: "open", title, token: "", url: text(fields.url, "") });
    } else if (fields.kind === "callback" && text(fields.action, "") !== "") {
      actions.push({ kind: "answer", title, token: text(fields.action, ""), url: "" });
    }
    if (actions.length === MAX_ACTIONS) break;
  }
  return actions;
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
    actions: readActions(fields.actions),
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
  /** The id of the tapped button; empty or missing when the notification itself was tapped. */
  readonly action?: string;
}

/** Notification options with buttons, which some DOM typings leave out. */
export type ShowNotificationOptions = NotificationOptions & {
  actions?: { action: string; title: string }[];
};

/** The two forms of `pushsubscriptionchange`: browsers pass the new subscription, the old one, or neither. */
export interface SubscriptionChangeEventLike extends ExtendableEventLike {
  readonly newSubscription?: { toJSON(): PushSubscriptionJSON } | null;
  readonly oldSubscription?: { readonly options: PushSubscriptionOptionsInit } | null;
}

/** The parts of ServiceWorkerGlobalScope the handlers use. */
export interface WorkerScopeLike {
  readonly location: { readonly origin: string };
  readonly registration: {
    showNotification(title: string, options: ShowNotificationOptions): Promise<void>;
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

/**
 * Shows the pushed message as a notification. Answer buttons are shown only when `canAnswer` is
 * true, that is when the app hands their tokens on (`onAnswer`); a button's id is its position.
 */
export function showPushed(
  scope: WorkerScopeLike,
  event: PushEventLike,
  defaults: PushDefaults,
  canAnswer = false,
): void {
  let payload: unknown;
  try {
    payload = event.data?.json();
  } catch {
    // Not one of the server's messages; the defaults are shown.
  }
  const message = readPushMessage(payload, defaults);
  const actions = message.actions.filter((action) => action.kind === "open" || canAnswer);
  const options: ShowNotificationOptions = {
    body: message.body,
    tag: message.tag,
    data: { url: message.url, actions },
  };
  if (actions.length > 0) {
    options.actions = actions.map((action, index) => ({
      action: String(index),
      title: action.title,
    }));
  }
  if (defaults.icon !== undefined) options.icon = defaults.icon;
  if (defaults.badge !== undefined) options.badge = defaults.badge;
  event.waitUntil(scope.registration.showNotification(message.title, options));
}

function notificationUrl(data: unknown): unknown {
  return typeof data === "object" && data !== null && "url" in data ? data.url : undefined;
}

/** The button a click names, from the notification's data; undefined for the notification itself. */
function tappedAction(data: unknown, id: string | undefined): PushAction | undefined {
  if (
    id === undefined ||
    id === "" ||
    typeof data !== "object" ||
    data === null ||
    !("actions" in data)
  ) {
    return undefined;
  }
  const actions: unknown = data.actions;
  const index = Number(id);
  if (!Array.isArray(actions) || !Number.isInteger(index) || index < 0 || index >= actions.length) {
    return undefined;
  }
  return actions[index] as PushAction;
}

/**
 * Handles a tap. An answer button hands its token to `onAnswer` and opens nothing, unless the
 * answer did not get through: `onAnswer` rejected (offline) or resolved with a fetch response that
 * is not ok (a session that ran out, a late tap), or the app hands no tokens on. The message's
 * page then opens, so the user sees where things stand and can answer there. An open button opens
 * its page, the notification itself the message's page: an open app window is brought forward
 * and, when it shows another page, taken to the one asked for; without a window a new one is
 * opened.
 */
export function openClicked(
  scope: WorkerScopeLike,
  event: NotificationClickEventLike,
  onAnswer?: (token: string) => Promise<unknown>,
): void {
  event.notification.close();
  const action = tappedAction(event.notification.data, event.action);
  const page = action?.kind === "open" ? action.url : notificationUrl(event.notification.data);
  const url = clickTarget(page, scope.location.origin);
  if (action?.kind === "answer") {
    event.waitUntil(
      (async () => {
        if (onAnswer && (await answered(onAnswer, action.token))) return;
        await openPage(scope, url);
      })(),
    );
    return;
  }
  event.waitUntil(openPage(scope, url));
}

/**
 * How long a tap waits for onAnswer before it opens the message's page instead. Browsers let a
 * worker open a window only for a few seconds after the tap, so an answer that hangs on a bad
 * connection must not use them up.
 */
export const ANSWER_TIMEOUT_MS = 4000;

/** Whether onAnswer said the server took the answer within ANSWER_TIMEOUT_MS. */
async function answered(
  onAnswer: (token: string) => Promise<unknown>,
  token: string,
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), ANSWER_TIMEOUT_MS);
  });
  try {
    return await Promise.race([onAnswer(token).then(wasTaken, () => false), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Whether what onAnswer resolved with says the server took the answer: anything but a failed fetch. */
function wasTaken(result: unknown): boolean {
  return !(typeof result === "object" && result !== null && "ok" in result && result.ok === false);
}

async function openPage(scope: WorkerScopeLike, url: string): Promise<void> {
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
  /**
   * Sends the token of a tapped answer button to the app's server, which forwards it to the
   * notification service. It rejects, or resolves with a fetch response that is not ok, when the
   * answer did not get through; the message's page then opens instead. Without it, answer buttons
   * are not shown.
   */
  onAnswer?: (token: string) => Promise<unknown>;
}

/**
 * Registers the three handlers on the service worker's global scope:
 * `registerPushHandlers(self, { defaults, onSubscriptionChange })`.
 */
export function registerPushHandlers(scope: WorkerScopeLike, options: PushHandlerOptions): void {
  const canAnswer = options.onAnswer !== undefined;
  scope.addEventListener("push", (event) => showPushed(scope, event, options.defaults, canAnswer));
  scope.addEventListener("notificationclick", (event) =>
    openClicked(scope, event, options.onAnswer),
  );
  scope.addEventListener("pushsubscriptionchange", (event) =>
    resubscribe(scope, event, options.onSubscriptionChange),
  );
}
