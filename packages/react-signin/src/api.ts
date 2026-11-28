// The sign-in API every app answers the same way, so one card and one panel fit all of them. The
// paths are relative to the client's base URL, "/api/v1". Answers are checked here; a refusal is
// an ApiError whose code the components turn into a text.
import { ApiError, type Client, type Schema } from "@rcooler/http";

/** GET /session. `sso` says single sign-on is configured, not how this session started. */
export interface SessionState {
  authenticated: boolean;
  loginConfigured: boolean;
  sso: boolean;
}

/** GET /federation. An app without single sign-on answers 404, read as `NO_FEDERATION`. */
export interface FederationStatus {
  enabled: boolean;
  /** The issuer can be asked for its session without showing anything (prompt=none). */
  passive: boolean;
  socialProviders: readonly string[];
}

/** GET /session/authenticator. */
export interface AuthenticatorStatus {
  enabled: boolean;
  /** Whether it can be turned on: the server has its key file and the account a password. */
  available: boolean;
}

/** POST /session/authenticator/setup: the seed, shown once, and the token that confirms it. */
export interface AuthenticatorSetup {
  secret: string;
  uri: string;
  setupToken: string;
}

/** GET /session/federation: the account's link to the single sign-on identity. */
export interface LinkStatus {
  enabled: boolean;
  linked: boolean;
  issuer?: string;
  linkedAt?: Date;
  /** "owner" when the account linked itself, "operator" when a server command did. */
  by?: string;
}

/** What POST /federation/start opens: a sign-in ({}), a passive check, or a link of this account. */
export type FederationStart = { passive: true } | { provider?: string; link?: true };

/** The answer of an app that does not offer single sign-on. */
export const NO_FEDERATION: FederationStatus = {
  enabled: false,
  passive: false,
  socialProviders: [],
};

type Fields = Readonly<Record<string, unknown>>;

/** A schema from a reader that returns undefined for an answer of another shape. */
function shape<T>(read: (fields: Fields) => T | undefined): Schema<T> {
  return {
    safeParse(value) {
      const fields =
        typeof value === "object" && value !== null && !Array.isArray(value)
          ? (value as Fields)
          : undefined;
      const data = fields && read(fields);
      return data === undefined
        ? { success: false, error: "the answer has another shape" }
        : { success: true, data };
    },
  };
}

const isBool = (value: unknown): value is boolean => typeof value === "boolean";
const isText = (value: unknown): value is string => typeof value === "string";
const optionalText = (value: unknown): boolean => value === undefined || isText(value);

const sessionSchema = shape<SessionState>(({ authenticated, login_configured, sso }) =>
  isBool(authenticated) && isBool(login_configured) && isBool(sso)
    ? { authenticated, loginConfigured: login_configured, sso }
    : undefined,
);

const federationSchema = shape<FederationStatus>(({ enabled, passive, social_providers }) =>
  isBool(enabled) &&
  isBool(passive) &&
  Array.isArray(social_providers) &&
  social_providers.every(isText)
    ? { enabled, passive, socialProviders: social_providers }
    : undefined,
);

const startSchema = shape<string>(({ authorization_url }) =>
  isText(authorization_url) && /^https?:\/\//.test(authorization_url)
    ? authorization_url
    : undefined,
);

const authenticatorSchema = shape<AuthenticatorStatus>(({ enabled, available }) =>
  isBool(enabled) && isBool(available) ? { enabled, available } : undefined,
);

const setupSchema = shape<AuthenticatorSetup>(({ secret, uri, setup_token }) =>
  isText(secret) && isText(uri) && uri.startsWith("otpauth://") && isText(setup_token)
    ? { secret, uri, setupToken: setup_token }
    : undefined,
);

const linkSchema = shape<LinkStatus>(({ enabled, linked, issuer, linked_at, by }) => {
  if (!isBool(enabled) || !isBool(linked) || !optionalText(issuer) || !optionalText(by)) {
    return undefined;
  }
  if (!optionalText(linked_at)) return undefined;
  const status: LinkStatus = { enabled, linked };
  if (isText(issuer)) status.issuer = issuer;
  if (isText(by)) status.by = by;
  if (isText(linked_at)) {
    const date = new Date(linked_at);
    if (Number.isNaN(date.getTime())) return undefined;
    status.linkedAt = date;
  }
  return status;
});

const unlinkSchema = shape<boolean>(({ unlinked }) => (isBool(unlinked) ? unlinked : undefined));

/** A 404: the app does not serve this route, which for single sign-on means "not offered". */
function notServed(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** The calls of the sign-in API, on the app's own client. */
export interface SignInApi {
  session(signal?: AbortSignal): Promise<SessionState>;
  /** Resolves once a session started; `login` only in apps with several accounts. */
  signIn(input: { login?: string; password: string; code?: string }): Promise<void>;
  signOut(): Promise<void>;
  federation(signal?: AbortSignal): Promise<FederationStatus>;
  /** Returns the issuer address to send the browser to. */
  startFederation(input: FederationStart): Promise<string>;
  authenticator(signal?: AbortSignal): Promise<AuthenticatorStatus>;
  beginAuthenticator(): Promise<AuthenticatorSetup>;
  /** Turns it on; every session ends, this one too. */
  enableAuthenticator(input: { password: string; setupToken: string; code: string }): Promise<void>;
  disableAuthenticator(input: { password: string; code: string }): Promise<void>;
  link(signal?: AbortSignal): Promise<LinkStatus>;
  /** Removes the link; false when there was none. */
  unlink(): Promise<boolean>;
}

/** The sign-in API on a client whose base URL is the app's "/api/v1". */
export function createSignInApi(client: Client): SignInApi {
  return {
    session: (signal) => client.request(sessionSchema, "GET", "/session", { signal }),
    async signIn({ login, password, code }) {
      const body: Record<string, string> = { password };
      if (login !== undefined) body.login = login;
      if (code !== undefined && code !== "") body.code = code;
      await client.send("POST", "/session", { body });
    },
    signOut: () => client.send("DELETE", "/session"),
    async federation(signal) {
      try {
        return await client.request(federationSchema, "GET", "/federation", { signal });
      } catch (error) {
        if (notServed(error)) return NO_FEDERATION;
        throw error;
      }
    },
    startFederation: (input) =>
      client.request(startSchema, "POST", "/federation/start", { body: input }),
    authenticator: (signal) =>
      client.request(authenticatorSchema, "GET", "/session/authenticator", { signal }),
    beginAuthenticator: () =>
      client.request(setupSchema, "POST", "/session/authenticator/setup", { body: {} }),
    enableAuthenticator: ({ password, setupToken, code }) =>
      client.send("POST", "/session/authenticator", {
        body: { password, setup_token: setupToken, code },
      }),
    disableAuthenticator: ({ password, code }) =>
      client.send("DELETE", "/session/authenticator", { body: { password, code } }),
    async link(signal) {
      try {
        return await client.request(linkSchema, "GET", "/session/federation", { signal });
      } catch (error) {
        if (notServed(error)) return { enabled: false, linked: false };
        throw error;
      }
    },
    unlink: () => client.request(unlinkSchema, "DELETE", "/session/federation", { body: {} }),
  };
}

/** The code of a failed call: the server's, or "network", "timeout", "bad_response". */
export function errorCode(error: unknown): string {
  return error instanceof ApiError ? error.code : "unknown";
}
