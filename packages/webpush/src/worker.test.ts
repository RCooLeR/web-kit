import { describe, expect, it, vi } from "vitest";

import {
  MAX_ACTIONS,
  clickTarget,
  openClicked,
  readPushMessage,
  registerPushHandlers,
  resubscribe,
  showPushed,
  type ShowNotificationOptions,
  type WindowClientLike,
  ANSWER_TIMEOUT_MS,
} from "./worker.js";

const ORIGIN = "https://app.example.test";
const defaults = {
  title: "Example",
  tag: "example",
  icon: "/icon-192.png",
  badge: "/badge-96.png",
};

/** Collects what handlers pass to waitUntil, so a test can wait for all of it. */
function extendable() {
  const work: Promise<unknown>[] = [];
  return { waitUntil: (promise: Promise<unknown>) => void work.push(promise), work };
}

/** An open window whose focus and navigate calls are recorded and succeed. */
function windowClient(url: string) {
  const focus = vi.fn<() => Promise<WindowClientLike>>();
  const navigate = vi.fn<(target: string) => Promise<WindowClientLike | null>>();
  const client = { url, focus, navigate } satisfies WindowClientLike;
  focus.mockResolvedValue(client);
  navigate.mockResolvedValue(client);
  return client;
}

function workerScope(windows: WindowClientLike[] = []) {
  const subscribed = { toJSON: () => ({ endpoint: "https://push.example.test/new" }) };
  const listeners = new Map<string, (event: never) => void>();
  return {
    listeners,
    subscribed,
    scope: {
      location: { origin: ORIGIN },
      registration: {
        showNotification: vi.fn((_title: string, _options: ShowNotificationOptions) =>
          Promise.resolve(),
        ),
        pushManager: { subscribe: vi.fn(() => Promise.resolve(subscribed)) },
      },
      clients: {
        matchAll: vi.fn(() => Promise.resolve(windows)),
        openWindow: vi.fn(() => Promise.resolve(null)),
      },
      addEventListener: (type: string, listener: (event: never) => void) =>
        void listeners.set(type, listener),
    },
  };
}

describe("readPushMessage", () => {
  it("takes the server's fields", () => {
    expect(
      readPushMessage(
        { title: "Build finished", body: "Server", tag: "build", url: "/log/7" },
        defaults,
      ),
    ).toEqual({
      title: "Build finished",
      body: "Server",
      tag: "build",
      url: "/log/7",
      actions: [],
    });
  });

  it("falls back field by field for anything that is not a non-empty string", () => {
    expect(readPushMessage({ title: "", body: 7, tag: null, url: {} }, defaults)).toEqual({
      title: "Example",
      body: "",
      tag: "example",
      url: "/",
      actions: [],
    });
  });

  it("gives the defaults for a payload that is not an object", () => {
    const fallback = { title: "Example", body: "", tag: "example", url: "/inbox", actions: [] };
    for (const payload of [undefined, null, "text", 42]) {
      expect(readPushMessage(payload, { ...defaults, url: "/inbox" })).toEqual(fallback);
    }
  });
});

describe("clickTarget", () => {
  it("resolves a path against the app's origin", () => {
    expect(clickTarget("/log/7?tab=all", ORIGIN)).toBe(`${ORIGIN}/log/7?tab=all`);
    expect(clickTarget(`${ORIGIN}/log/7`, ORIGIN)).toBe(`${ORIGIN}/log/7`);
  });

  it("opens the start page instead of another site", () => {
    expect(clickTarget("https://evil.example/login", ORIGIN)).toBe(`${ORIGIN}/`);
    expect(clickTarget("//evil.example/login", ORIGIN)).toBe(`${ORIGIN}/`);
    expect(clickTarget("javascript:alert(1)", ORIGIN)).toBe(`${ORIGIN}/`);
  });

  it("opens the start page for a missing or unusable address", () => {
    expect(clickTarget(undefined, ORIGIN)).toBe(`${ORIGIN}/`);
    expect(clickTarget(42, ORIGIN)).toBe(`${ORIGIN}/`);
    expect(clickTarget("http://[bad", ORIGIN)).toBe(`${ORIGIN}/`);
  });
});

describe("showPushed", () => {
  it("shows the pushed message with the app's icons", async () => {
    const { scope } = workerScope();
    const event = {
      ...extendable(),
      data: {
        json: () => ({ title: "Build finished", body: "Server", tag: "build", url: "/log/7" }),
      },
    };
    showPushed(scope, event, defaults);
    await Promise.all(event.work);

    expect(scope.registration.showNotification).toHaveBeenCalledWith("Build finished", {
      body: "Server",
      tag: "build",
      data: { url: "/log/7", actions: [] },
      icon: "/icon-192.png",
      badge: "/badge-96.png",
    });
  });

  it("still shows a notification for a push without data or with data that is not JSON", async () => {
    const { scope } = workerScope();
    const empty = { ...extendable(), data: null };
    const broken = {
      ...extendable(),
      data: {
        json: () => {
          throw new SyntaxError("not JSON");
        },
      },
    };
    showPushed(scope, empty, { title: "Example", tag: "example" });
    showPushed(scope, broken, { title: "Example", tag: "example" });
    await Promise.all([...empty.work, ...broken.work]);

    expect(scope.registration.showNotification).toHaveBeenCalledTimes(2);
    expect(scope.registration.showNotification).toHaveBeenLastCalledWith("Example", {
      body: "",
      tag: "example",
      data: { url: "/", actions: [] },
    });
  });
});

describe("openClicked", () => {
  function click(url: unknown) {
    const close = vi.fn();
    return { ...extendable(), notification: { close, data: { url } } };
  }

  it("opens a new window when the app is not open", async () => {
    const { scope } = workerScope();
    const event = click("/log/7");
    openClicked(scope, event);
    await Promise.all(event.work);

    expect(event.notification.close).toHaveBeenCalledOnce();
    expect(scope.clients.openWindow).toHaveBeenCalledWith(`${ORIGIN}/log/7`);
  });

  it("brings forward the window that already shows the page", async () => {
    const other = windowClient(`${ORIGIN}/`);
    const showing = windowClient(`${ORIGIN}/log/7`);
    const { scope } = workerScope([other, showing]);
    const event = click("/log/7");
    openClicked(scope, event);
    await Promise.all(event.work);

    expect(showing.focus).toHaveBeenCalledOnce();
    expect(showing.navigate).not.toHaveBeenCalled();
    expect(other.focus).not.toHaveBeenCalled();
    expect(scope.clients.openWindow).not.toHaveBeenCalled();
  });

  it("takes an open window on another page to the one asked for", async () => {
    const open = windowClient(`${ORIGIN}/settings`);
    const { scope } = workerScope([open]);
    const event = click("/log/7");
    openClicked(scope, event);
    await Promise.all(event.work);

    expect(open.focus).toHaveBeenCalledOnce();
    expect(open.navigate).toHaveBeenCalledWith(`${ORIGIN}/log/7`);
  });

  it("never opens another site, whatever the message said", async () => {
    const { scope } = workerScope();
    const event = click("https://evil.example/login");
    openClicked(scope, event);
    await Promise.all(event.work);

    expect(scope.clients.openWindow).toHaveBeenCalledWith(`${ORIGIN}/`);
  });
});

describe("resubscribe", () => {
  it("reports the subscription the browser already made", async () => {
    const { scope } = workerScope();
    const report = vi.fn(() => Promise.resolve());
    const event = {
      ...extendable(),
      newSubscription: { toJSON: () => ({ endpoint: "https://push.example.test/replaced" }) },
    };
    resubscribe(scope, event, report);
    await Promise.all(event.work);

    expect(scope.registration.pushManager.subscribe).not.toHaveBeenCalled();
    expect(report).toHaveBeenCalledWith({ endpoint: "https://push.example.test/replaced" });
  });

  it("subscribes again with the old options when the browser did not", async () => {
    const { scope } = workerScope();
    const report = vi.fn(() => Promise.resolve());
    const options = { userVisibleOnly: true, applicationServerKey: "key" };
    const event = { ...extendable(), newSubscription: null, oldSubscription: { options } };
    resubscribe(scope, event, report);
    await Promise.all(event.work);

    expect(scope.registration.pushManager.subscribe).toHaveBeenCalledWith(options);
    expect(report).toHaveBeenCalledWith({ endpoint: "https://push.example.test/new" });
  });

  it("does nothing when the browser gives neither subscription", async () => {
    const { scope } = workerScope();
    const report = vi.fn(() => Promise.resolve());
    const event = extendable();
    resubscribe(scope, event, report);
    await Promise.all(event.work);

    expect(report).not.toHaveBeenCalled();
  });
});

describe("registerPushHandlers", () => {
  it("listens for the three events", () => {
    const { scope, listeners } = workerScope();
    registerPushHandlers(scope, { defaults, onSubscriptionChange: () => Promise.resolve() });
    expect([...listeners.keys()].sort()).toEqual([
      "notificationclick",
      "push",
      "pushsubscriptionchange",
    ]);
  });
});

describe("action buttons", () => {
  const actions = [
    { kind: "callback", title: "Approve", action: "AAAAAAAAAAAAAAAAAAAAAA.0.BBBBBBBBBBBBBBBB" },
    { kind: "open", title: "Open", url: "/requests/7" },
    { kind: "reply", title: "Answer", action: "token-of-a-reply" },
    { kind: "callback", title: "", action: "untitled" },
    { kind: "open", title: "No page" },
    "not an object",
    { kind: "callback", title: "Deny", action: "CCCCCCCCCCCCCCCCCCCCCC.1.DDDDDDDDDDDDDDDD" },
    { kind: "callback", title: "Later", action: "EEEEEEEEEEEEEEEEEEEEEE.2.FFFFFFFFFFFFFFFF" },
  ];

  it("keeps the buttons a service worker can handle, in order, at most MAX_ACTIONS", () => {
    const message = readPushMessage({ title: "15 more minutes?", actions }, defaults);
    expect(message.actions).toEqual([
      {
        kind: "answer",
        title: "Approve",
        token: "AAAAAAAAAAAAAAAAAAAAAA.0.BBBBBBBBBBBBBBBB",
        url: "",
      },
      { kind: "open", title: "Open", token: "", url: "/requests/7" },
      {
        kind: "answer",
        title: "Deny",
        token: "CCCCCCCCCCCCCCCCCCCCCC.1.DDDDDDDDDDDDDDDD",
        url: "",
      },
    ]);
    expect(message.actions).toHaveLength(MAX_ACTIONS);
    expect(readPushMessage({ actions: "nope" }, defaults).actions).toEqual([]);
  });

  it("shows answer buttons only when the app hands their tokens on", async () => {
    const { scope } = workerScope();
    const push = () => ({ ...extendable(), data: { json: () => ({ title: "Asked", actions }) } });
    const withoutAnswers = push();
    showPushed(scope, withoutAnswers, defaults);
    const withAnswers = push();
    showPushed(scope, withAnswers, defaults, true);
    await Promise.all([...withoutAnswers.work, ...withAnswers.work]);

    const calls = scope.registration.showNotification.mock.calls;
    expect(calls[0]?.[1].actions).toEqual([{ action: "0", title: "Open" }]);
    expect(calls[1]?.[1].actions).toEqual([
      { action: "0", title: "Approve" },
      { action: "1", title: "Open" },
      { action: "2", title: "Deny" },
    ]);
  });

  function tapped(action: string | undefined) {
    const message = readPushMessage({ url: "/inbox", actions }, defaults);
    const close = vi.fn();
    return {
      ...extendable(),
      ...(action === undefined ? {} : { action }),
      notification: { close, data: { url: message.url, actions: message.actions } },
      close,
    };
  }

  it("hands the token of an answer button to the app and opens nothing", async () => {
    const { scope } = workerScope();
    const onAnswer = vi.fn<(token: string) => Promise<unknown>>().mockResolvedValue(undefined);
    const event = tapped("2");
    openClicked(scope, event, onAnswer);
    await Promise.all(event.work);

    expect(event.close).toHaveBeenCalled();
    expect(onAnswer).toHaveBeenCalledWith("CCCCCCCCCCCCCCCCCCCCCC.1.DDDDDDDDDDDDDDDD");
    expect(scope.clients.openWindow).not.toHaveBeenCalled();
  });

  it("opens the message's page when the answer does not reach the app's server", async () => {
    for (const onAnswer of [
      vi.fn<(token: string) => Promise<unknown>>().mockRejectedValue(new TypeError("offline")),
      vi.fn<(token: string) => Promise<unknown>>().mockResolvedValue({ ok: false, status: 401 }),
      undefined,
    ]) {
      const { scope } = workerScope();
      const event = tapped("2");
      openClicked(scope, event, onAnswer);
      await Promise.all(event.work);
      expect(scope.clients.openWindow).toHaveBeenCalledWith(`${ORIGIN}/inbox`);
    }
  });

  it("opens nothing once the app's server took the answer", async () => {
    const { scope } = workerScope();
    const onAnswer = vi
      .fn<(token: string) => Promise<unknown>>()
      .mockResolvedValue({ ok: true, status: 202 });
    const event = tapped("2");
    openClicked(scope, event, onAnswer);
    await Promise.all(event.work);
    expect(scope.clients.openWindow).not.toHaveBeenCalled();
  });

  it("opens the page of an open button, and the message's page for anything else", async () => {
    const { scope } = workerScope();
    for (const [action, page] of [
      ["1", "/requests/7"],
      ["", "/inbox"],
      [undefined, "/inbox"],
      ["7", "/inbox"],
      ["x", "/inbox"],
    ] as const) {
      const event = tapped(action);
      openClicked(scope, event);
      await Promise.all(event.work);
      expect(scope.clients.openWindow).toHaveBeenLastCalledWith(`${ORIGIN}${page}`);
    }
  });

  it("registers the answer handler with the others", async () => {
    const { scope, listeners } = workerScope();
    const onAnswer = vi.fn<(token: string) => Promise<unknown>>().mockResolvedValue(undefined);
    registerPushHandlers(scope, { defaults, onSubscriptionChange: vi.fn(), onAnswer });
    const event = tapped("0");
    listeners.get("notificationclick")?.(event as never);
    await Promise.all(event.work);
    expect(onAnswer).toHaveBeenCalledWith("AAAAAAAAAAAAAAAAAAAAAA.0.BBBBBBBBBBBBBBBB");
  });
});

describe("an answer that takes too long", () => {
  it("opens the message's page once the answer timeout has passed", async () => {
    vi.useFakeTimers();
    try {
      const { scope } = workerScope();
      const message = readPushMessage(
        { url: "/inbox", actions: [{ kind: "callback", title: "Approve", token: "T" }] },
        { title: "App", tag: "app" },
      );
      const event = {
        ...extendable(),
        action: "0",
        notification: { close: vi.fn(), data: { url: message.url, actions: message.actions } },
      };
      openClicked(scope, event, () => new Promise(() => undefined));
      await vi.advanceTimersByTimeAsync(ANSWER_TIMEOUT_MS);
      await Promise.all(event.work);
      expect(scope.clients.openWindow).toHaveBeenCalledWith(`${ORIGIN}/inbox`);
    } finally {
      vi.useRealTimers();
    }
  });
});
