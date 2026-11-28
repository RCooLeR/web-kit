// The single sign-on callback lands on the app's public address with one query value saying how
// it ended. These read it, and take it out of the address once shown, so a reload does not repeat
// the message.

/** How a sign-in through the issuer ended, when it did not simply start a session. */
export type SignInResult = "failed" | "local" | "authenticator";

/** How linking the signed-in account ended. */
export type LinkResult = "done" | "failed" | "conflict";

export type FederationResult = { signin: SignInResult } | { link: LinkResult };

const SIGN_IN_RESULTS: readonly string[] = ["failed", "local", "authenticator"];
const LINK_RESULTS: readonly string[] = ["done", "failed", "conflict"];

/**
 * The callback's result in a query string such as `location.search`, or null. An app reads it
 * first to choose the screen: a `link` result belongs on the sign-in security screen.
 */
export function readFederationResult(search: string): FederationResult | null {
  const query = new URLSearchParams(search);
  const signin = query.get("signin");
  if (signin !== null && SIGN_IN_RESULTS.includes(signin)) {
    return { signin: signin as SignInResult };
  }
  const link = query.get("link");
  if (link !== null && LINK_RESULTS.includes(link)) return { link: link as LinkResult };
  return null;
}

/** Takes `signin` and `link` out of the address bar, keeping the rest and the history entry. */
export function clearFederationResult(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("signin") && !url.searchParams.has("link")) return;
  url.searchParams.delete("signin");
  url.searchParams.delete("link");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

const PASSIVE_KEY = "rcooler.signin.passive";

/** Whether this tab already asked the issuer passively; storage errors count as asked. */
export function passiveCheckDone(): boolean {
  try {
    return window.sessionStorage.getItem(PASSIVE_KEY) !== null;
  } catch {
    return true;
  }
}

/**
 * Keeps the sign-in card from asking the issuer passively in this tab. Call it when the person
 * signs out, or the passive check would sign them straight back in through the issuer.
 */
export function skipPassiveCheck(): void {
  try {
    window.sessionStorage.setItem(PASSIVE_KEY, "1");
  } catch {
    // Without storage the check counts as done anyway (passiveCheckDone).
  }
}
