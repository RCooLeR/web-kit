// @vitest-environment jsdom
import { ApiError, createClient } from "@rcooler/http";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSignInApi } from "./api.js";
import { defaultSecurityLabels as sec, defaultSignInLabels as si } from "./labels.js";
import { readFederationResult } from "./result.js";
import { SecurityPanel } from "./SecurityPanel.js";
import { SignInCard } from "./SignInCard.js";

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
});

type Handler = (body: unknown, call: number) => Response;

function json(status: number, body?: unknown): Response {
  return body === undefined
    ? new Response(null, { status })
    : new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
}

const refuse = (status: number, code: string) => json(status, { error: { code, message: "no" } });

const pathOf = (input: RequestInfo | URL): string =>
  typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

/** A fake backend: "METHOD /path" handlers, every call recorded; anything else answers 404. */
function backend(routes: Record<string, Handler>) {
  const calls: { route: string; body: unknown }[] = [];
  const counts = new Map<string, number>();
  const fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const route = `${init?.method ?? "GET"} ${pathOf(input).replace(/^\/api\/v1/, "")}`;
    const body: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({ route, body });
    const call = counts.get(route) ?? 0;
    counts.set(route, call + 1);
    const handler = routes[route];
    return Promise.resolve(handler ? handler(body, call) : refuse(404, "not_found"));
  };
  return { client: createClient({ baseUrl: "/api/v1", fetch }), calls };
}

const bodiesOf = (calls: { route: string; body: unknown }[], route: string) =>
  calls.filter((call) => call.route === route).map((call) => call.body);

const brand = <div className="brand">Herald</div>;
const noSso = { "GET /federation": () => refuse(404, "not_found") };
const sso = (passive = false) => ({
  "GET /federation": () => json(200, { enabled: true, passive, social_providers: [] }),
});

function typeIn(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("SignInCard", () => {
  it("signs in with the login and password, then the code when the account has one", async () => {
    const { client, calls } = backend({
      ...noSso,
      "POST /session": (_body, call) =>
        call === 0 ? refuse(401, "authenticator_required") : json(200, { authenticated: true }),
    });
    const onSignedIn = vi.fn();
    render(<SignInCard client={client} brand={brand} account onSignedIn={onSignedIn} />);
    typeIn(si.login, "owner");
    typeIn(si.password, "a password");
    fireEvent.click(screen.getByRole("button", { name: si.submit }));
    await screen.findByRole("heading", { name: si.codeTitle });
    expect(screen.getByText("owner", { selector: "b" })).toBeTruthy();
    expect(screen.getByRole("button", { name: si.otherAccount })).toBeTruthy();
    typeIn(si.code, "12 34 56x");
    fireEvent.click(screen.getByRole("button", { name: si.confirm }));
    await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1));
    expect(bodiesOf(calls, "POST /session")).toEqual([
      { login: "owner", password: "a password" },
      { login: "owner", password: "a password", code: "123456" },
    ]);
  });

  it("answers a wrong password, too many attempts and a code that does not fit", async () => {
    const answers = [
      refuse(401, "invalid_login"),
      refuse(429, "too_many_attempts"),
      refuse(401, "authenticator_required"),
      refuse(401, "invalid_code"),
    ];
    const { client, calls } = backend({ ...noSso, "POST /session": (_b, call) => answers[call]! });
    render(<SignInCard client={client} brand={brand} onSignedIn={() => {}} />);
    expect(screen.queryByLabelText(si.login)).toBeNull();
    typeIn(si.password, "wrong");
    fireEvent.click(screen.getByRole("button", { name: si.submit }));
    expect((await screen.findByRole("alert")).textContent).toContain(si.wrongPasswordTitle);
    expect(screen.getByLabelText(si.password).getAttribute("aria-invalid")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: si.submit }));
    await screen.findByText(si.lockedTitle);
    fireEvent.click(screen.getByRole("button", { name: si.submit }));
    await screen.findByRole("heading", { name: si.codeTitle });
    expect(screen.getByRole("button", { name: si.back })).toBeTruthy();
    typeIn(si.code, "000000");
    fireEvent.click(screen.getByRole("button", { name: si.confirm }));
    await screen.findByText(si.badCode);
    expect(screen.getByLabelText(si.code).getAttribute("aria-invalid")).toBe("true");
    expect(bodiesOf(calls, "POST /session").at(-1)).toEqual({ password: "wrong", code: "000000" });
  });

  it("offers single sign-on only when the app has it, and sends the browser to the issuer", async () => {
    const plain = backend(noSso);
    render(<SignInCard client={plain.client} brand={brand} onSignedIn={() => {}} />);
    await waitFor(() => expect(plain.calls.map((call) => call.route)).toContain("GET /federation"));
    expect(screen.queryByRole("button", { name: si.sso })).toBeNull();
    cleanup();

    const navigate = vi.fn();
    const { client, calls } = backend({
      ...sso(),
      "POST /federation/start": () =>
        json(200, { authorization_url: "https://sso.example.test/authorize?state=s" }),
    });
    render(<SignInCard client={client} brand={brand} onSignedIn={() => {}} navigate={navigate} />);
    fireEvent.click(await screen.findByRole("button", { name: si.sso }));
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("https://sso.example.test/authorize?state=s"),
    );
    expect(bodiesOf(calls, "POST /federation/start")).toEqual([{}]);
  });

  it("offers only single sign-on when no password is set and the app has it", async () => {
    const { client } = backend({
      ...sso(),
      "GET /session": () => json(200, { authenticated: false, login_configured: false, sso: true }),
    });
    render(<SignInCard client={client} brand={brand} onSignedIn={() => {}} />);
    await screen.findByRole("button", { name: si.sso });
    await waitFor(() => expect(screen.queryByLabelText(si.password)).toBeNull());
    expect(screen.queryByRole("button", { name: si.submit })).toBeNull();
    expect(screen.queryByText(si.or)).toBeNull();
    cleanup();

    // Without single sign-on the password form stays: it is the only way in it can say anything about.
    const plain = backend({
      ...noSso,
      "GET /session": () =>
        json(200, { authenticated: false, login_configured: false, sso: false }),
    });
    render(<SignInCard client={plain.client} brand={brand} onSignedIn={() => {}} />);
    await waitFor(() => expect(plain.calls.map((call) => call.route)).toContain("GET /session"));
    expect(screen.getByLabelText(si.password)).toBeTruthy();
  });

  it("keeps the password working when the issuer does not answer", async () => {
    const { client } = backend({
      ...sso(),
      "POST /federation/start": () => refuse(503, "federation_unavailable"),
    });
    render(<SignInCard client={client} brand={brand} onSignedIn={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: si.sso }));
    const down = await screen.findByRole<HTMLButtonElement>("button", { name: si.ssoUnavailable });
    expect(down.disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toContain(si.outageTitle);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: si.submit }).disabled).toBe(false);
  });

  it("asks the issuer passively once per tab, and not after a callback", async () => {
    const navigate = vi.fn();
    const routes = {
      ...sso(true),
      "POST /federation/start": () =>
        json(200, { authorization_url: "https://sso.example.test/authorize?prompt=none" }),
    };
    const first = backend(routes);
    render(
      <SignInCard client={first.client} brand={brand} onSignedIn={() => {}} navigate={navigate} />,
    );
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    expect(bodiesOf(first.calls, "POST /federation/start")).toEqual([{ passive: true }]);
    cleanup();

    const second = backend(routes);
    render(
      <SignInCard client={second.client} brand={brand} onSignedIn={() => {}} navigate={navigate} />,
    );
    await screen.findByRole("button", { name: si.sso });
    expect(bodiesOf(second.calls, "POST /federation/start")).toEqual([]);
    cleanup();

    window.sessionStorage.clear();
    const third = backend(routes);
    render(
      <SignInCard
        client={third.client}
        brand={brand}
        result="failed"
        onSignedIn={() => {}}
        navigate={navigate}
      />,
    );
    await screen.findByRole("button", { name: si.sso });
    expect(screen.getByRole("alert").textContent).toContain(si.ssoFailedTitle);
    expect(bodiesOf(third.calls, "POST /federation/start")).toEqual([]);
  });

  it("reads the callback's result from the address and takes it out", async () => {
    window.history.replaceState(null, "", "/?signin=authenticator&tab=2");
    const { client } = backend(noSso);
    render(<SignInCard client={client} brand={brand} onSignedIn={() => {}} />);
    expect(screen.getByRole("alert").textContent).toContain(si.ssoAuthenticatorTitle);
    await waitFor(() => expect(window.location.search).toBe("?tab=2"));
  });

  it("says the authenticator is on after the panel ended the session", () => {
    const { client } = backend(noSso);
    render(
      <SignInCard client={client} brand={brand} notice="authenticator_on" onSignedIn={() => {}} />,
    );
    expect(screen.getByRole("status").textContent).toContain(si.authenticatorOnTitle);
  });
});

const setupAnswer = {
  secret: "JBSWY3DPEHPK3PXP",
  uri: "otpauth://totp/Herald:owner?secret=JBSWY3DPEHPK3PXP&issuer=Herald",
  setup_token: "setup-token",
};

describe("SecurityPanel", () => {
  it("turns the authenticator on with the QR code, the password and a first code", async () => {
    const { client, calls } = backend({
      "GET /session/authenticator": () => json(200, { enabled: false, available: true }),
      "POST /session/authenticator/setup": () => json(200, setupAnswer),
      "POST /session/authenticator": () => json(204),
    });
    const onSessionEnded = vi.fn();
    render(<SecurityPanel client={client} appName="Herald" onSessionEnded={onSessionEnded} />);
    fireEvent.click(await screen.findByRole("button", { name: sec.turnOn }));
    expect(await screen.findByText("JBSW Y3DP EHPK 3PXP")).toBeTruthy();
    expect(screen.getByText("Name in the app: Herald (owner)")).toBeTruthy();
    expect(screen.getByText("The key shows only now. Herald keeps it encrypted.")).toBeTruthy();
    const qr = screen.getByRole("img", { name: sec.qrLabel });
    expect(qr.querySelector("path")?.getAttribute("d")).toMatch(/^M\d+ \d+h1v1h-1z/);
    expect(screen.queryByRole("region", { name: sec.ssoTitle })).toBeNull();
    typeIn(sec.password, "a password");
    typeIn(sec.code, "123456");
    fireEvent.click(screen.getByRole("button", { name: sec.turnOn }));
    await waitFor(() => expect(onSessionEnded).toHaveBeenCalledWith("authenticator_on"));
    expect(bodiesOf(calls, "POST /session/authenticator")).toEqual([
      { password: "a password", setup_token: "setup-token", code: "123456" },
    ]);
    expect(bodiesOf(calls, "POST /session/authenticator/setup")).toEqual([{}]);
  });

  it("stays signed in after turning the authenticator on where the app keeps the session", async () => {
    const { client, calls } = backend({
      "GET /session/authenticator": (_b, call) => json(200, { enabled: call > 0, available: true }),
      "POST /session/authenticator/setup": () => json(200, setupAnswer),
      "POST /session/authenticator": () => json(204),
      "GET /session": () => json(200, { authenticated: true, login_configured: true, sso: false }),
    });
    const onSessionEnded = vi.fn();
    render(<SecurityPanel client={client} appName="Herald" onSessionEnded={onSessionEnded} />);
    fireEvent.click(await screen.findByRole("button", { name: sec.turnOn }));
    await screen.findByText("JBSW Y3DP EHPK 3PXP");
    typeIn(sec.password, "a password");
    typeIn(sec.code, "123456");
    fireEvent.click(screen.getByRole("button", { name: sec.turnOn }));
    await screen.findByText(sec.stateOn);
    expect(screen.queryByText("JBSW Y3DP EHPK 3PXP")).toBeNull();
    expect(onSessionEnded).not.toHaveBeenCalled();
    expect(calls.map((call) => call.route)).toContain("GET /session");
  });

  it("shows the state as it is when the authenticator was already off", async () => {
    const { client, calls } = backend({
      "GET /session/authenticator": (_b, call) =>
        json(200, { enabled: call === 0, available: true }),
      "DELETE /session/authenticator": () => refuse(409, "authenticator_off"),
    });
    render(<SecurityPanel client={client} appName="Herald" onSessionEnded={() => {}} />);
    await screen.findByText(sec.stateOn);
    typeIn(sec.password, "a password");
    typeIn(sec.code, "654321");
    fireEvent.click(screen.getByRole("button", { name: sec.turnOff }));
    await screen.findByRole("button", { name: sec.turnOn });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(calls.filter((call) => call.route === "GET /session/authenticator")).toHaveLength(2);
  });

  it("answers a wrong password, a code that does not fit and an expired setup", async () => {
    const answers = [
      refuse(401, "invalid_login"),
      refuse(401, "invalid_code"),
      refuse(409, "setup_expired"),
    ];
    const { client } = backend({
      "GET /session/authenticator": () => json(200, { enabled: false, available: true }),
      "POST /session/authenticator/setup": () => json(200, setupAnswer),
      "POST /session/authenticator": (_b, call) => answers[call]!,
    });
    render(<SecurityPanel client={client} appName="Herald" onSessionEnded={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: sec.turnOn }));
    await screen.findByText("JBSW Y3DP EHPK 3PXP");
    typeIn(sec.password, "wrong");
    typeIn(sec.code, "123456");
    fireEvent.click(screen.getByRole("button", { name: sec.turnOn }));
    await screen.findByText(sec.wrongPassword);
    fireEvent.click(screen.getByRole("button", { name: sec.turnOn }));
    await screen.findByText(sec.badCode);
    fireEvent.click(screen.getByRole("button", { name: sec.turnOn }));
    expect((await screen.findByRole("alert")).textContent).toContain(sec.setupExpired);
    expect(screen.queryByText("JBSW Y3DP EHPK 3PXP")).toBeNull();
    expect(screen.getByText(sec.stateOff)).toBeTruthy();
  });

  it("turns the authenticator off with the password and a current code", async () => {
    const { client, calls } = backend({
      "GET /session/authenticator": (_b, call) =>
        json(200, { enabled: call === 0, available: true }),
      "DELETE /session/authenticator": () => json(204),
    });
    render(<SecurityPanel client={client} appName="Herald" onSessionEnded={() => {}} />);
    await screen.findByText(sec.stateOn);
    typeIn(sec.password, "a password");
    typeIn(sec.code, "654321");
    fireEvent.click(screen.getByRole("button", { name: sec.turnOff }));
    await screen.findByRole("button", { name: sec.turnOn });
    expect(bodiesOf(calls, "DELETE /session/authenticator")).toEqual([
      { password: "a password", code: "654321" },
    ]);
  });

  it("says why the authenticator cannot be turned on", async () => {
    const { client } = backend({
      "GET /session/authenticator": () => json(200, { enabled: false, available: false }),
    });
    render(<SecurityPanel client={client} appName="Herald" onSessionEnded={() => {}} />);
    await screen.findByText(sec.notAvailable);
    expect(screen.queryByRole("button", { name: sec.turnOn })).toBeNull();
  });

  it("links the SSO account through the issuer and unlinks it", async () => {
    const navigate = vi.fn();
    const linked = {
      enabled: true,
      linked: true,
      issuer: "https://sso.example.test/realms/team",
      linked_at: "2026-11-28T10:00:00Z",
      by: "operator",
    };
    const { client, calls } = backend({
      "GET /session/authenticator": () => json(200, { enabled: false, available: true }),
      "GET /session/federation": (_b, call) =>
        json(200, call === 1 ? linked : { enabled: true, linked: false }),
      "POST /federation/start": () =>
        json(200, { authorization_url: "https://sso.example.test/authorize?state=l" }),
      "DELETE /session/federation": () => json(200, { unlinked: true }),
    });
    const { unmount } = render(
      <SecurityPanel
        client={client}
        appName="Herald"
        locale="en"
        navigate={navigate}
        onSessionEnded={() => {}}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: sec.link }));
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("https://sso.example.test/authorize?state=l"),
    );
    expect(bodiesOf(calls, "POST /federation/start")).toEqual([{ link: true }]);
    unmount();

    render(
      <SecurityPanel
        client={client}
        appName="Herald"
        locale="en"
        linkResult="done"
        onSessionEnded={() => {}}
      />,
    );
    expect((await screen.findByRole("status")).textContent).toContain(sec.linkDone);
    const line = await screen.findByText(/sso\.example\.test · linked on November 28, 2026/);
    expect(line.textContent).toContain(sec.byOperator);
    fireEvent.click(screen.getByRole("button", { name: sec.unlink }));
    await screen.findByRole("button", { name: sec.link });
    expect(calls.map((call) => call.route)).toContain("DELETE /session/federation");
  });

  it("keeps the link of an account that has no other sign-in", async () => {
    const { client } = backend({
      "GET /session/authenticator": () => json(200, { enabled: false, available: false }),
      "GET /session/federation": () =>
        json(200, { enabled: true, linked: true, issuer: "https://sso.example.test/realms/team" }),
      "DELETE /session/federation": () => refuse(409, "only_sign_in"),
    });
    render(<SecurityPanel client={client} appName="Herald" onSessionEnded={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: sec.unlink }));
    expect((await screen.findByRole("alert")).textContent).toContain(sec.onlySignIn);
    expect(screen.getByText(sec.linked)).toBeTruthy();
  });

  it("shows a link that went to another account, and hands back an ended session", async () => {
    const linkedElsewhere = backend({
      "GET /session/authenticator": () => json(200, { enabled: false, available: true }),
      "GET /session/federation": () => json(200, { enabled: true, linked: false }),
    });
    render(
      <SecurityPanel
        client={linkedElsewhere.client}
        appName="Herald"
        linkResult="conflict"
        onSessionEnded={() => {}}
      />,
    );
    expect((await screen.findByRole("alert")).textContent).toContain(sec.linkConflict);
    cleanup();

    const onSessionEnded = vi.fn();
    const expired = backend({ "GET /session/authenticator": () => refuse(401, "unauthorized") });
    render(
      <SecurityPanel client={expired.client} appName="Herald" onSessionEnded={onSessionEnded} />,
    );
    await waitFor(() => expect(onSessionEnded).toHaveBeenCalledWith("signed_out"));
  });
});

describe("the sign-in API", () => {
  it("reads an app without single sign-on as disabled and refuses answers of another shape", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const api = createSignInApi(
      backend({
        "GET /session": () =>
          json(200, { authenticated: true, login_configured: true, sso: false }),
        "POST /federation/start": () => json(200, { authorization_url: "javascript:alert(1)" }),
      }).client,
    );
    expect(await api.federation()).toEqual({ enabled: false, passive: false, socialProviders: [] });
    expect(await api.link()).toEqual({ enabled: false, linked: false });
    expect(await api.session()).toEqual({ authenticated: true, loginConfigured: true, sso: false });
    await expect(api.startFederation({})).rejects.toEqual(new ApiError(200, "bad_response"));
  });

  it("reads the callback's result and nothing else", () => {
    expect(readFederationResult("?signin=local")).toEqual({ signin: "local" });
    expect(readFederationResult("?link=conflict&tab=2")).toEqual({ link: "conflict" });
    expect(readFederationResult("?signin=welcome")).toBeNull();
    expect(readFederationResult("")).toBeNull();
  });
});
