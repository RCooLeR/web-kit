import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ApiError, createClient, isAbort, type Schema } from "./index.js";

const statusSchema = z.object({ version: z.string(), ready: z.boolean() });

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** A fetch that answers with `respond` and records what it was asked. */
function fakeFetch(respond: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = input instanceof Request ? input.url : input.toString();
    calls.push({ url, init });
    return Promise.resolve(respond(url, init));
  };
  return { fetch, calls };
}

/** A fetch that never answers and rejects when its signal aborts, as the real one does. */
function hangingFetch(_input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return new Promise((_resolve, reject) => {
    const signal = init.signal;
    if (!signal) return;
    const fail = () => reject(signal.reason as Error);
    if (signal.aborted) fail();
    else signal.addEventListener("abort", fail);
  });
}

async function failure(call: Promise<unknown>): Promise<unknown> {
  try {
    await call;
  } catch (error) {
    return error;
  }
  throw new Error("the call did not fail");
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("request", () => {
  it("returns the answer the schema accepted", async () => {
    const { fetch, calls } = fakeFetch(() => json({ version: "1.4.0", ready: true, extra: 1 }));
    const client = createClient({ baseUrl: "/api/v1", fetch });

    await expect(client.request(statusSchema, "GET", "/status")).resolves.toEqual({
      version: "1.4.0",
      ready: true,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("/api/v1/status");
    expect(calls[0]?.init.method).toBe("GET");
    expect(calls[0]?.init.credentials).toBe("same-origin");
    expect(calls[0]?.init.body).toBeUndefined();
  });

  it("sends a body as JSON", async () => {
    const { fetch, calls } = fakeFetch(() => json({ version: "1", ready: false }));
    const client = createClient({ baseUrl: "/api/v1", fetch, credentials: "include" });

    await client.request(statusSchema, "POST", "/things", { body: { name: "кухня" } });
    expect(calls[0]?.init.body).toBe('{"name":"кухня"}');
    expect(calls[0]?.init.headers).toEqual({ "Content-Type": "application/json" });
    expect(calls[0]?.init.credentials).toBe("include");
  });

  it("works with any schema that has safeParse, not only zod", async () => {
    const numberSchema: Schema<number> = {
      safeParse: (value) =>
        typeof value === "number"
          ? { success: true, data: value }
          : { success: false, error: "not a number" },
    };
    const { fetch } = fakeFetch(() => json(42));
    await expect(
      createClient({ baseUrl: "", fetch }).request(numberSchema, "GET", "/n"),
    ).resolves.toBe(42);
  });

  it("fails with the server's error code and keeps its message out", async () => {
    const { fetch } = fakeFetch(() =>
      json({ error: { code: "not_found", message: "row 42 of table users is gone" } }, 404),
    );
    const error = await failure(
      createClient({ baseUrl: "/api/v1", fetch }).request(statusSchema, "GET", "/x"),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: "not_found", name: "ApiError" });
    expect((error as ApiError).message).toBe("not_found");
  });

  it("reports a failure without the error envelope as a bad response", async () => {
    const bodies: Response[] = [
      new Response("<html>502 Bad Gateway</html>", { status: 502 }),
      json({ error: "plain string" }, 500),
      json({ error: { code: 7 } }, 500),
      json(null, 500),
    ];
    for (const body of bodies) {
      const { fetch } = fakeFetch(() => body);
      const error = await failure(
        createClient({ baseUrl: "", fetch }).request(statusSchema, "GET", "/x"),
      );
      expect(error).toMatchObject({ status: body.status, code: "bad_response" });
    }
  });

  it("reports an answer the schema refuses as a bad response and logs why", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { fetch } = fakeFetch(() => json({ version: 14 }));

    const error = await failure(
      createClient({ baseUrl: "/api/v1", fetch }).request(statusSchema, "GET", "/status"),
    );
    expect(error).toMatchObject({ status: 200, code: "bad_response" });
    expect(logged).toHaveBeenCalledOnce();
    expect(logged.mock.calls[0]?.[0]).toBe("unexpected answer from GET /status");
  });

  it("reports a 200 answer that is not JSON as a bad response", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { fetch } = fakeFetch(() => new Response("<html>login</html>"));
    const error = await failure(
      createClient({ baseUrl: "", fetch }).request(statusSchema, "GET", "/status"),
    );
    expect(error).toMatchObject({ status: 200, code: "bad_response" });
  });

  it("reports an unreachable server as a network failure", async () => {
    const fetch = () => Promise.reject(new TypeError("Failed to fetch"));
    const error = await failure(
      createClient({ baseUrl: "", fetch }).request(statusSchema, "GET", "/status"),
    );
    expect(error).toMatchObject({ status: 0, code: "network" });
  });

  it("gives up after the timeout", async () => {
    vi.useFakeTimers();
    const client = createClient({ baseUrl: "", fetch: hangingFetch, timeoutMs: 2_000 });
    const pending = failure(client.request(statusSchema, "GET", "/slow"));

    await vi.advanceTimersByTimeAsync(2_000);
    expect(await pending).toMatchObject({ status: 0, code: "timeout" });
  });

  it("passes the caller's own abort on untouched", async () => {
    const controller = new AbortController();
    const client = createClient({ baseUrl: "", fetch: hangingFetch });
    const pending = failure(
      client.request(statusSchema, "GET", "/slow", { signal: controller.signal }),
    );
    controller.abort();

    const error = await pending;
    expect(error).not.toBeInstanceOf(ApiError);
    expect(isAbort(error)).toBe(true);
  });

  it("uses the global fetch when none is given", async () => {
    const { fetch, calls } = fakeFetch(() => json({ version: "1", ready: true }));
    vi.stubGlobal("fetch", fetch);
    try {
      await createClient({ baseUrl: "/api/v1" }).request(statusSchema, "GET", "/status");
    } finally {
      vi.unstubAllGlobals();
    }
    expect(calls[0]?.url).toBe("/api/v1/status");
  });
});

describe("send", () => {
  it("succeeds without reading the answer", async () => {
    const { fetch, calls } = fakeFetch(() => new Response(null, { status: 204 }));
    await expect(
      createClient({ baseUrl: "/api/v1", fetch }).send("DELETE", "/things/7"),
    ).resolves.toBeUndefined();
    expect(calls[0]?.init.method).toBe("DELETE");
  });

  it("fails like request does", async () => {
    const { fetch } = fakeFetch(() => json({ error: { code: "forbidden", message: "no" } }, 403));
    const error = await failure(createClient({ baseUrl: "", fetch }).send("POST", "/things"));
    expect(error).toMatchObject({ status: 403, code: "forbidden" });
  });
});

describe("isAbort", () => {
  it("knows an abort from other failures", () => {
    expect(isAbort(new DOMException("stopped", "AbortError"))).toBe(true);
    expect(isAbort(new DOMException("slow", "TimeoutError"))).toBe(false);
    expect(isAbort(new ApiError(0, "network"))).toBe(false);
    expect(isAbort(undefined)).toBe(false);
  });
});
