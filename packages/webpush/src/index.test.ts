import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PushUnavailableError,
  decodeKey,
  disablePush,
  enablePush,
  isMadeWith,
  isPushSupported,
  pushStatus,
  refreshPush,
  type PushBackend,
} from "./index.js";

// A 65-byte uncompressed P-256 point, as a server writes its VAPID public key.
const SERVER_KEY =
  "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";
const ENDPOINT = "https://push.example.test/send/this-browser";

function backend(publicKey = SERVER_KEY) {
  return {
    publicKey: vi.fn(() => Promise.resolve(publicKey)),
    subscribe: vi.fn(() => Promise.resolve()),
    unsubscribe: vi.fn(() => Promise.resolve()),
  } satisfies PushBackend;
}

/** A subscription as the browser holds it, made with `key`. */
function subscription(key: Uint8Array = decodeKey(SERVER_KEY)) {
  return {
    endpoint: ENDPOINT,
    options: { applicationServerKey: key.buffer },
    unsubscribe: vi.fn(() => Promise.resolve(true)),
    toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: "p", auth: "a" } }),
  };
}

type FakeSubscription = ReturnType<typeof subscription>;

/** Installs a browser with the given permission and, optionally, an existing subscription. */
function browser(permission: NotificationPermission, existing: FakeSubscription | null = null) {
  const created = subscription();
  const pushManager = {
    getSubscription: vi.fn(() => Promise.resolve(existing)),
    subscribe: vi.fn(() => Promise.resolve(created)),
  };
  const registration = { pushManager };
  const serviceWorker = {
    register: vi.fn(() => Promise.resolve(registration)),
    ready: Promise.resolve(registration),
    getRegistration: vi.fn(() => Promise.resolve(registration)),
  };
  const notification = { permission, requestPermission: vi.fn(() => Promise.resolve(permission)) };
  vi.stubGlobal("navigator", { serviceWorker });
  vi.stubGlobal("window", { PushManager: {}, Notification: notification });
  vi.stubGlobal("Notification", notification);
  return { pushManager, serviceWorker, notification, created };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("decodeKey", () => {
  it("reads URL-safe base64 without padding, as the server writes its key", () => {
    // "-_" are the two characters that differ from plain base64; three bytes need no padding, two do.
    expect([...decodeKey("-_8A")]).toEqual([251, 255, 0]);
    expect([...decodeKey("-_8")]).toEqual([251, 255]);
    expect([...decodeKey("")]).toEqual([]);
  });

  it("gives the 65 bytes of a public key", () => {
    const bytes = decodeKey(SERVER_KEY);
    expect(bytes).toHaveLength(65);
    expect(bytes[0]).toBe(4);
  });
});

describe("isMadeWith", () => {
  const key = Uint8Array.from([4, 1, 2, 3]);

  it("knows a subscription made with the same key", () => {
    expect(isMadeWith(Uint8Array.from([4, 1, 2, 3]).buffer, key)).toBe(true);
  });

  it("refuses another key, a shorter one, and a subscription without a key", () => {
    expect(isMadeWith(Uint8Array.from([4, 1, 2, 9]).buffer, key)).toBe(false);
    expect(isMadeWith(Uint8Array.from([4, 1, 2]).buffer, key)).toBe(false);
    expect(isMadeWith(null, key)).toBe(false);
  });
});

describe("a browser without push", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("window", {});
  });

  it("is reported as unsupported and left alone", async () => {
    const server = backend();
    expect(isPushSupported()).toBe(false);
    await expect(pushStatus({ backend: server, workerUrl: "/sw.js" })).resolves.toBe("unsupported");
    await expect(enablePush({ backend: server, workerUrl: "/sw.js" })).resolves.toBe("unsupported");
    await expect(disablePush({ backend: server })).resolves.toBeUndefined();
    await expect(refreshPush({ backend: server })).resolves.toBeUndefined();
    expect(server.subscribe).not.toHaveBeenCalled();
    expect(server.unsubscribe).not.toHaveBeenCalled();
  });
});

describe("pushStatus", () => {
  it("is unsupported when the server sends no notifications", async () => {
    browser("granted", subscription());
    await expect(pushStatus({ backend: backend(""), workerUrl: "/sw.js" })).resolves.toBe(
      "unsupported",
    );
  });

  it("tells blocked, off and on apart", async () => {
    const options = { backend: backend(), workerUrl: "/sw.js" };
    browser("denied");
    await expect(pushStatus(options)).resolves.toBe("blocked");
    browser("default");
    await expect(pushStatus(options)).resolves.toBe("off");
    browser("granted");
    await expect(pushStatus(options)).resolves.toBe("off");
    browser("granted", subscription());
    await expect(pushStatus(options)).resolves.toBe("on");
  });

  it("is off while the subscription was made with a key the server no longer has", async () => {
    browser("granted", subscription(Uint8Array.from([4, 9, 9, 9])));
    await expect(pushStatus({ backend: backend(), workerUrl: "/sw.js" })).resolves.toBe("off");
  });
});

describe("enablePush", () => {
  it("asks for permission, subscribes with the server's key and tells the server", async () => {
    const { pushManager, serviceWorker, notification, created } = browser("granted");
    const server = backend();

    await expect(enablePush({ backend: server, workerUrl: "/sw.js" })).resolves.toBe("on");

    expect(notification.requestPermission).toHaveBeenCalledOnce();
    expect(serviceWorker.register).toHaveBeenCalledWith("/sw.js");
    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: decodeKey(SERVER_KEY),
    });
    expect(server.subscribe).toHaveBeenCalledWith(created.toJSON());
  });

  it("stops when the user refuses or dismisses the question", async () => {
    const server = backend();
    const refused = browser("denied");
    await expect(enablePush({ backend: server, workerUrl: "/sw.js" })).resolves.toBe("blocked");
    const dismissed = browser("default");
    await expect(enablePush({ backend: server, workerUrl: "/sw.js" })).resolves.toBe("off");

    expect(refused.serviceWorker.register).not.toHaveBeenCalled();
    expect(dismissed.serviceWorker.register).not.toHaveBeenCalled();
    expect(server.subscribe).not.toHaveBeenCalled();
  });

  it("keeps a subscription made with the current key", async () => {
    const existing = subscription();
    const { pushManager } = browser("granted", existing);
    const server = backend();

    await expect(enablePush({ backend: server, workerUrl: "/sw.js" })).resolves.toBe("on");

    expect(existing.unsubscribe).not.toHaveBeenCalled();
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(server.subscribe).toHaveBeenCalledOnce();
  });

  it("replaces a subscription made with another key", async () => {
    const stale = subscription(Uint8Array.from([4, 9, 9, 9]));
    const { pushManager } = browser("granted", stale);

    await expect(enablePush({ backend: backend(), workerUrl: "/sw.js" })).resolves.toBe("on");

    expect(stale.unsubscribe).toHaveBeenCalledOnce();
    expect(pushManager.subscribe).toHaveBeenCalledOnce();
  });

  it("fails with a coded error when the browser cannot subscribe", async () => {
    const { pushManager } = browser("granted");
    pushManager.subscribe.mockRejectedValueOnce(new DOMException("no push service", "AbortError"));
    const server = backend();

    const attempt = enablePush({ backend: server, workerUrl: "/sw.js" });
    await expect(attempt).rejects.toBeInstanceOf(PushUnavailableError);
    await expect(attempt).rejects.toMatchObject({ code: "push_unavailable" });
    expect(server.subscribe).not.toHaveBeenCalled();
  });
});

describe("disablePush", () => {
  it("drops the browser's subscription and tells the server its address", async () => {
    const existing = subscription();
    browser("granted", existing);
    const server = backend();

    await disablePush({ backend: server });

    expect(existing.unsubscribe).toHaveBeenCalledOnce();
    expect(server.unsubscribe).toHaveBeenCalledWith(ENDPOINT);
  });

  it("drops the browser's subscription even when the server cannot be told", async () => {
    const existing = subscription();
    browser("granted", existing);
    const server = backend();
    server.unsubscribe.mockRejectedValueOnce(new Error("offline"));

    await expect(disablePush({ backend: server })).resolves.toBeUndefined();
    expect(existing.unsubscribe).toHaveBeenCalledOnce();
  });

  it("does nothing without a subscription", async () => {
    browser("granted");
    const server = backend();
    await disablePush({ backend: server });
    expect(server.unsubscribe).not.toHaveBeenCalled();
  });
});

describe("refreshPush", () => {
  it("sends the current subscription to the server again", async () => {
    const existing = subscription();
    browser("granted", existing);
    const server = backend();

    await refreshPush({ backend: server });
    expect(server.subscribe).toHaveBeenCalledWith(existing.toJSON());
  });

  it("stays silent while notifications are off", async () => {
    const server = backend();
    browser("default", subscription());
    await refreshPush({ backend: server });
    browser("granted");
    await refreshPush({ backend: server });

    expect(server.subscribe).not.toHaveBeenCalled();
  });

  it("replaces a subscription made with a key the server no longer has", async () => {
    const stale = subscription(Uint8Array.from([4, 9, 9, 9]));
    const { pushManager, created } = browser("granted", stale);
    const server = backend();

    await refreshPush({ backend: server });
    expect(stale.unsubscribe).toHaveBeenCalled();
    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: decodeKey(SERVER_KEY),
    });
    expect(server.subscribe).toHaveBeenCalledWith(created.toJSON());
  });

  it("leaves the status off when the browser cannot subscribe again", async () => {
    const stale = subscription(Uint8Array.from([4, 9, 9, 9]));
    const { pushManager } = browser("granted", stale);
    pushManager.subscribe.mockRejectedValue(new DOMException("no", "AbortError"));
    pushManager.getSubscription.mockResolvedValueOnce(stale).mockResolvedValue(null);
    const server = backend();

    await expect(refreshPush({ backend: server })).resolves.toBeUndefined();
    expect(server.subscribe).not.toHaveBeenCalled();
    await expect(pushStatus({ backend: server, workerUrl: "/sw.js" })).resolves.toBe("off");
  });
});
