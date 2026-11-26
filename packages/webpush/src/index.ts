// @rcooler/webpush: notifications in this browser. Three things have to agree: the browser's
// permission for the site, its subscription at the browser maker's push service, and the server
// knowing that subscription's address. This module keeps them in step.
//
// It does no HTTP itself. The app passes a `PushBackend` that talks to its own server, so the
// endpoints and their authentication stay with the app. The service worker side is in
// `@rcooler/webpush/worker`.

/**
 * Where this browser stands:
 * - `unsupported`: it has no notifications for websites, or the server sends none;
 * - `blocked`: the user refused them for this site, and only the browser's settings undo that;
 * - `off` and `on`: can be switched here.
 */
export type PushStatus = "unsupported" | "blocked" | "off" | "on";

/** The app's own server, as far as notifications need it. */
export interface PushBackend {
  /** The server's VAPID public key in URL-safe base64, or "" when the server sends no notifications. */
  publicKey(): Promise<string>;
  /** Stores this browser's subscription under the signed-in user; storing it again is harmless. */
  subscribe(subscription: PushSubscriptionJSON): Promise<void>;
  /** Forgets the subscription with this endpoint address. */
  unsubscribe(endpoint: string): Promise<void>;
}

export interface PushOptions {
  backend: PushBackend;
  /** Address of the app's service worker script, such as "/sw.js". */
  workerUrl: string;
  /**
   * How the worker is registered. The default fetches the worker and what it imports past the
   * HTTP cache (`updateViaCache: "none"`), so a long browser cache cannot hold back an update; an
   * app that registers a module worker passes `{ type: "module" }` here too.
   */
  registration?: RegistrationOptions;
}

/** What refreshPush needs; with workerUrl it also moves the browser to a renamed worker. */
export type RefreshOptions = Pick<PushOptions, "backend"> &
  Partial<Pick<PushOptions, "workerUrl" | "registration">>;

function registrationOptions(
  options: Partial<Pick<PushOptions, "registration">>,
): RegistrationOptions {
  return { updateViaCache: "none", ...options.registration };
}

/**
 * The browser cannot subscribe: it could not reach its push service, or has none (some private
 * modes and embedded browsers). `code` maps to a text through the app's dictionary.
 */
export class PushUnavailableError extends Error {
  readonly code = "push_unavailable";

  constructor() {
    super("push_unavailable");
    this.name = "PushUnavailableError";
  }
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Turns the server's key (URL-safe base64, which the browser API does not take) into bytes. */
export function decodeKey(key: string): Uint8Array<ArrayBuffer> {
  const base64 = key.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/** Whether a subscription was made with this key: one made with another cannot be sent to. */
export function isMadeWith(subscriptionKey: ArrayBuffer | null, key: Uint8Array): boolean {
  if (!subscriptionKey) return false;
  const made = new Uint8Array(subscriptionKey);
  return made.length === key.length && made.every((byte, index) => byte === key[index]);
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/** The server's key, or undefined when the server sends no notifications. */
async function serverKey(backend: PushBackend): Promise<Uint8Array<ArrayBuffer> | undefined> {
  const publicKey = await backend.publicKey();
  return publicKey === "" ? undefined : decodeKey(publicKey);
}

/**
 * Tells whether notifications reach this browser. A subscription made with a key the server no
 * longer has counts as off: nothing sent with the new key arrives.
 */
export async function pushStatus(options: PushOptions): Promise<PushStatus> {
  if (!isPushSupported()) return "unsupported";
  const key = await serverKey(options.backend);
  if (key === undefined) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "off";
  const subscription = await currentSubscription();
  return subscription && isMadeWith(subscription.options.applicationServerKey, key) ? "on" : "off";
}

/**
 * Turns notifications on in this browser: asks for the permission, subscribes and tells the
 * server. Call it from a tap or click, which browsers require for the permission question. A
 * subscription made with another server key is replaced, since it cannot be sent to any more.
 * @throws PushUnavailableError when the browser cannot subscribe.
 */
export async function enablePush(options: PushOptions): Promise<PushStatus> {
  if (!isPushSupported()) return "unsupported";
  // Before anything that waits: some browsers show the question only while the tap is still fresh.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
  const key = await serverKey(options.backend);
  if (!key) return "unsupported";

  let subscription: PushSubscription;
  try {
    const registration = await navigator.serviceWorker.register(
      options.workerUrl,
      registrationOptions(options),
    );
    await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const isCurrent = existing !== null && isMadeWith(existing.options.applicationServerKey, key);
    if (existing && !isCurrent) await existing.unsubscribe();
    subscription = isCurrent
      ? existing
      : await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });
  } catch {
    throw new PushUnavailableError();
  }
  await options.backend.subscribe(subscription.toJSON());
  return "on";
}

/** Turns notifications off in this browser and tells the server to forget its address. */
export async function disablePush(options: Pick<PushOptions, "backend">): Promise<void> {
  if (!isPushSupported()) return;
  const subscription = await currentSubscription();
  if (!subscription) return;
  const { endpoint } = subscription;
  // The browser first, because it decides: once it has dropped the subscription nothing arrives
  // here, whatever the server still believes.
  await subscription.unsubscribe();
  // Telling the server only saves it a wasted attempt, so a failure here (offline, a session that
  // just ran out) is not the user's problem: the push service reports the address as gone at the
  // next notification, and the server forgets it then.
  await options.backend.unsubscribe(endpoint).catch(() => undefined);
}

/**
 * Makes sure the server has this browser's subscription under the user who is signed in now: the
 * browser may have replaced it, or somebody else signed in here. Call it after sign-in and at
 * app start. A subscription made with a key the server no longer has is replaced, and the server
 * told to forget the old address; the permission is still granted, so that needs no tap. When the
 * browser cannot subscribe again, pushStatus reports "off" and enablePush starts over. Does
 * nothing while notifications are off.
 *
 * With workerUrl, a browser that runs a worker under another address (the app renamed its worker
 * file) is moved to the new one, and otherwise asked to look for an update of the worker now.
 */
export async function refreshPush(options: RefreshOptions): Promise<void> {
  if (!isPushSupported() || Notification.permission !== "granted") return;
  let registration = await navigator.serviceWorker.getRegistration();
  if (registration && options.workerUrl) {
    registration = await currentWorker(registration, options.workerUrl, options);
  }
  let subscription = (await registration?.pushManager.getSubscription()) ?? null;
  if (!registration || !subscription) return;
  const key = await serverKey(options.backend);
  if (!key) return;
  if (!isMadeWith(subscription.options.applicationServerKey, key)) {
    const replaced = subscription.endpoint;
    try {
      await subscription.unsubscribe();
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      });
    } catch {
      return;
    }
    if (subscription.endpoint !== replaced) {
      // As in disablePush: a failure only costs the server one wasted attempt.
      await options.backend.unsubscribe(replaced).catch(() => undefined);
    }
  }
  await options.backend.subscribe(subscription.toJSON());
}

/**
 * Registers workerUrl when the browser runs a worker under another address, and otherwise asks
 * for an update check. A failure keeps the registration the browser has.
 */
async function currentWorker(
  registration: ServiceWorkerRegistration,
  workerUrl: string,
  options: Partial<Pick<PushOptions, "registration">>,
): Promise<ServiceWorkerRegistration> {
  const running = registration.active?.scriptURL;
  try {
    if (running && new URL(workerUrl, running).href !== running) {
      return await navigator.serviceWorker.register(workerUrl, registrationOptions(options));
    }
    await registration.update();
  } catch {
    // Offline or refused: the worker the browser has still receives notifications.
  }
  return registration;
}
