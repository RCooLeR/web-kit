// @rcooler/http: the one place an app talks HTTP to its own backend. Every call has a timeout,
// can be aborted, fails with a stable code instead of a server message, and returns an answer
// that a schema has checked.
//
// The schema is anything with a zod-style `safeParse`; zod itself is not a dependency. The error
// envelope `{"error":{"code":"..."}}` is the one kit/jsonhttp writes on the Go side.

/** Codes this module adds to the server's own. The app's dictionary needs a text for each. */
export const CLIENT_ERROR_CODES = ["network", "timeout", "bad_response"] as const;

/** The default wait for an answer. */
export const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * A failed call. `code` is stable and maps to a text for the user (i18n-core `errorText`); the
 * server's message is never kept. `status` is 0 when no answer arrived.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** What a schema must offer; a zod schema fits as it is. */
export interface Schema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false; error: unknown };
}

export interface ClientOptions {
  /** Prefix of every path, such as "/api/v1". */
  baseUrl: string;
  /** How long to wait for an answer; DEFAULT_TIMEOUT_MS when omitted. */
  timeoutMs?: number;
  /** Whether cookies travel with the call; "same-origin" when omitted. */
  credentials?: RequestCredentials;
  /** The fetch to use; the global one when omitted. Tests pass their own. */
  fetch?: typeof fetch;
}

export interface CallOptions {
  /** Sent as JSON. */
  body?: unknown;
  /** Aborts the call, for example when the page that started it is left. */
  signal?: AbortSignal | undefined;
}

/** The calls of one backend. The members are plain functions and can be taken apart. */
export interface Client {
  /**
   * Calls the API and returns the answer once `schema` accepts it.
   * @throws ApiError with the server's code, or "network", "timeout" or "bad_response".
   * @throws the abort reason when `options.signal` aborted the call; test it with `isAbort`.
   */
  readonly request: <T>(
    schema: Schema<T>,
    method: string,
    path: string,
    options?: CallOptions,
  ) => Promise<T>;
  /** Calls the API when the answer carries nothing the app needs. Fails as `request` does. */
  readonly send: (method: string, path: string, options?: CallOptions) => Promise<void>;
}

/** The code inside the server's error envelope, or undefined when the body is something else. */
function serverErrorCode(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("error" in body)) return undefined;
  const detail = body.error;
  if (typeof detail !== "object" || detail === null || !("code" in detail)) return undefined;
  return typeof detail.code === "string" ? detail.code : undefined;
}

/**
 * Reads a JSON body. A body that is not JSON gives undefined, which the caller reports as a bad
 * response; a call the caller cancelled, or that timed out, while the body was still arriving
 * ends the same way as one cancelled or timed out before the headers.
 */
async function readJson(response: Response, signals?: CallSignals): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch (error) {
    if (signals?.caller?.aborted) throw error;
    if (signals?.timeout.aborted) throw new ApiError(0, "timeout");
    return undefined;
  }
}

/** The signals of one call: the caller's own, and the client's timeout. */
interface CallSignals {
  caller: AbortSignal | undefined;
  timeout: AbortSignal;
}

/** Returns a client for one backend. */
export function createClient(options: ClientOptions): Client {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const credentials = options.credentials ?? "same-origin";

  async function call(
    method: string,
    path: string,
    callOptions: CallOptions,
  ): Promise<{ response: Response; signals: CallSignals }> {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signals: CallSignals = { caller: callOptions.signal, timeout };
    const signal = callOptions.signal ? AbortSignal.any([callOptions.signal, timeout]) : timeout;
    const init: RequestInit = { method, signal, credentials };
    if (callOptions.body !== undefined) {
      init.body = JSON.stringify(callOptions.body);
      init.headers = { "Content-Type": "application/json" };
    }

    let response: Response;
    try {
      // Looked up per call, so a test or a polyfill that replaces the global fetch later is used.
      response = await (options.fetch ?? fetch)(`${options.baseUrl}${path}`, init);
    } catch (error) {
      // The caller cancelled: pass the abort on so the caller can ignore it.
      if (callOptions.signal?.aborted) throw error;
      throw new ApiError(0, timeout.aborted ? "timeout" : "network");
    }
    if (response.ok) return { response, signals };
    throw new ApiError(
      response.status,
      serverErrorCode(await readJson(response, signals)) ?? "bad_response",
    );
  }

  return {
    async request(schema, method, path, callOptions = {}) {
      const { response, signals } = await call(method, path, callOptions);
      const parsed = schema.safeParse(await readJson(response, signals));
      if (!parsed.success) {
        console.error(`unexpected answer from ${method} ${path}`, parsed.error);
        throw new ApiError(response.status, "bad_response");
      }
      return parsed.data;
    },
    async send(method, path, callOptions = {}) {
      await call(method, path, callOptions);
    },
  };
}

/** Whether an error is the abort of a call the caller cancelled itself. */
export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
