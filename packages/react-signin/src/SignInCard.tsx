// The sign-in card: password first, then the authenticator code when the account has one, and the
// single sign-on button when the app offers it. The same card serves every app; HomeLedger shows
// it without single sign-on, because its GET /federation answers 404.
import type { Client } from "@rcooler/http";
import { isAbort } from "@rcooler/http";
import { Button, Field, Input } from "@rcooler/react-ui";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
  type ReactNode,
} from "react";
import { Alert } from "./Alert.js";
import { NO_FEDERATION, createSignInApi, errorCode, type FederationStatus } from "./api.js";
import { defaultSignInLabels, type SignInLabels } from "./labels.js";
import {
  clearFederationResult,
  passiveCheckDone,
  readFederationResult,
  skipPassiveCheck,
  type SignInResult,
} from "./result.js";

export interface SignInCardProps {
  /** The app's client, its base URL "/api/v1". */
  client: Client;
  /** The top of the card: the app's mark, name and the line under it (kit.css .brand). */
  brand: ReactNode;
  labels?: SignInLabels;
  /** Ask for the account's login too (apps with several accounts, such as Herald). */
  account?: boolean;
  /** Controls in the card's foot beside the note, such as the language and theme switches. */
  controls?: ReactNode;
  /** The single sign-on callback's result; read from the address when omitted. */
  result?: SignInResult | null;
  /** News to show first: the authenticator was turned on and every session ended. */
  notice?: "authenticator_on";
  /** Ask the issuer for its session without showing anything, once per tab; on by default. */
  passiveCheck?: boolean;
  onSignedIn: () => void;
  /** Sends the browser to the issuer; `location.assign` by default. */
  navigate?: (url: string) => void;
}

type Problem = "wrong" | "locked" | "unavailable" | "notConfigured";

function problemOf(code: string): Problem {
  switch (code) {
    case "invalid_login":
    case "bad_request":
      return "wrong";
    case "too_many_attempts":
      return "locked";
    case "login_not_configured":
      return "notConfigured";
    default:
      return "unavailable";
  }
}

function addressResult(): SignInResult | null {
  if (typeof window === "undefined") return null;
  const result = readFederationResult(window.location.search);
  return result !== null && "signin" in result ? result.signin : null;
}

function assign(url: string): void {
  window.location.assign(url);
}

/** A text with `{account}` shown in bold. */
function withAccount(template: string, account: string): ReactNode {
  const [before, ...rest] = template.split("{account}");
  if (rest.length === 0) return template;
  return (
    <>
      {before}
      <b>{account}</b>
      {rest.join(account)}
    </>
  );
}

export function SignInCard(props: SignInCardProps) {
  const labels = props.labels ?? defaultSignInLabels;
  const api = useMemo(() => createSignInApi(props.client), [props.client]);
  const [result] = useState(() => (props.result !== undefined ? props.result : addressResult()));
  const [federation, setFederation] = useState<FederationStatus>(NO_FEDERATION);
  const [step, setStep] = useState<"password" | "code">("password");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [passwordShown, setPasswordShown] = useState(false);
  const [code, setCode] = useState("");
  const [badCode, setBadCode] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [ssoDown, setSsoDown] = useState(false);
  const [busy, setBusy] = useState(false);
  const passiveStarted = useRef(false);

  useEffect(() => clearFederationResult(), []);

  useEffect(() => {
    const controller = new AbortController();
    api.federation(controller.signal).then(setFederation, (error: unknown) => {
      if (!isAbort(error)) setFederation(NO_FEDERATION);
    });
    return () => controller.abort();
  }, [api]);

  const goToIssuer = useEffectEvent((url: string) => (props.navigate ?? assign)(url));
  const passiveWanted = (props.passiveCheck ?? true) && result === null;

  useEffect(() => {
    if (!passiveWanted || !federation.enabled || !federation.passive) return;
    if (passiveStarted.current || passiveCheckDone()) return;
    passiveStarted.current = true;
    skipPassiveCheck();
    // Not cancelled on unmount: the browser leaves for the issuer either way.
    api.startFederation({ passive: true }).then(goToIssuer, (error: unknown) => {
      if (errorCode(error) === "federation_unavailable") setSsoDown(true);
    });
  }, [api, federation, passiveWanted]);

  const credentials = props.account ? { login, password } : { password };

  async function submitPassword(event: SyntheticEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem(null);
    try {
      await api.signIn(credentials);
      props.onSignedIn();
    } catch (error) {
      const failure = errorCode(error);
      if (failure === "authenticator_required") {
        setCode("");
        setBadCode(false);
        setStep("code");
      } else {
        setProblem(problemOf(failure));
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(event: SyntheticEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem(null);
    setBadCode(false);
    try {
      await api.signIn({ ...credentials, code });
      props.onSignedIn();
    } catch (error) {
      const failure = errorCode(error);
      if (failure === "invalid_code" || failure === "authenticator_required") {
        setBadCode(true);
      } else if (failure === "invalid_login") {
        setStep("password");
        setProblem("wrong");
      } else {
        setProblem(problemOf(failure));
      }
    } finally {
      setBusy(false);
    }
  }

  async function startSso() {
    setBusy(true);
    setProblem(null);
    try {
      (props.navigate ?? assign)(await api.startFederation({}));
    } catch (error) {
      const failure = errorCode(error);
      if (failure === "federation_unavailable") setSsoDown(true);
      else if (failure === "federation_disabled") setFederation(NO_FEDERATION);
      else setProblem(problemOf(failure));
      setBusy(false);
    }
  }

  function backToPassword() {
    setStep("password");
    setPassword("");
    setCode("");
    setBadCode(false);
    setProblem(null);
  }

  const problemAlert = problem && (
    <ProblemAlert problem={problem} labels={labels} withAccount={props.account === true} />
  );

  return (
    <div className="card si">
      {props.brand}
      {step === "password" ? (
        <form className="form si-form" onSubmit={(event) => void submitPassword(event)}>
          <h1 className="h1">{labels.title}</h1>
          {problemAlert ??
            (props.notice === "authenticator_on" ? (
              <Alert tone="ok" icon="check" title={labels.authenticatorOnTitle} role="status">
                {labels.authenticatorOnText}
              </Alert>
            ) : (
              <ResultAlert result={result} labels={labels} />
            ))}
          {ssoDown && (
            <Alert tone="warn" icon="cloud-off" title={labels.outageTitle} role="status">
              {labels.outageText}
            </Alert>
          )}
          {props.account && (
            <Field label={labels.login}>
              {(control) => (
                <Input
                  {...control}
                  value={login}
                  onChange={(event) => setLogin(event.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  aria-invalid={problem === "wrong" || undefined}
                />
              )}
            </Field>
          )}
          <Field label={labels.password}>
            {(control) => (
              <div className="si-pw">
                <Input
                  {...control}
                  type={passwordShown ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  aria-invalid={problem === "wrong" || undefined}
                />
                <Button
                  variant="ghost"
                  square
                  icon={passwordShown ? "eye-off" : "eye"}
                  aria-label={passwordShown ? labels.hidePassword : labels.showPassword}
                  aria-pressed={passwordShown}
                  onClick={() => setPasswordShown((shown) => !shown)}
                />
              </div>
            )}
          </Field>
          <Button type="submit" variant="primary" disabled={busy}>
            {labels.submit}
          </Button>
          {federation.enabled && (
            <>
              <div className="si-or">{labels.or}</div>
              <Button
                className="si-sso"
                icon="shield-check"
                disabled={busy || ssoDown}
                onClick={() => void startSso()}
              >
                {ssoDown ? labels.ssoUnavailable : labels.sso}
              </Button>
            </>
          )}
        </form>
      ) : (
        <form className="form si-form" onSubmit={(event) => void submitCode(event)}>
          <Button variant="ghost" className="si-back" icon="chevron-left" onClick={backToPassword}>
            {props.account ? labels.otherAccount : labels.back}
          </Button>
          <h1 className="h1">{labels.codeTitle}</h1>
          <div className="mu">
            {props.account ? withAccount(labels.codeIntroFor, login) : labels.codeIntro}
          </div>
          {problemAlert}
          <Field label={labels.code} error={badCode ? labels.badCode : undefined}>
            {(control) => (
              <Input
                {...control}
                className="si-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
              />
            )}
          </Field>
          <Button type="submit" variant="primary" disabled={busy}>
            {labels.confirm}
          </Button>
          <div className="mu sm">
            {labels.noApp} {labels.resetHint}
          </div>
        </form>
      )}
      <div className="si-foot">
        <span className="grow">{labels.footNote}</span>
        {props.controls}
      </div>
    </div>
  );
}

function ProblemAlert({
  problem,
  labels,
  withAccount: hasAccount,
}: {
  problem: Problem;
  labels: SignInLabels;
  withAccount: boolean;
}) {
  switch (problem) {
    case "wrong":
      return (
        <Alert
          tone="bad"
          icon="warning"
          title={hasAccount ? labels.wrongLoginTitle : labels.wrongPasswordTitle}
        >
          {labels.wrongText}
        </Alert>
      );
    case "locked":
      return (
        <Alert tone="warn" icon="lock" title={labels.lockedTitle}>
          {labels.lockedText}
        </Alert>
      );
    case "notConfigured":
      return (
        <Alert tone="warn" icon="key" title={labels.notConfiguredTitle}>
          {labels.notConfiguredText}
        </Alert>
      );
    case "unavailable":
      return (
        <Alert tone="bad" icon="warning" title={labels.unavailableTitle}>
          {labels.unavailableText}
        </Alert>
      );
  }
}

function ResultAlert({ result, labels }: { result: SignInResult | null; labels: SignInLabels }) {
  switch (result) {
    case "failed":
      return (
        <Alert tone="warn" icon="link" title={labels.ssoFailedTitle}>
          {labels.ssoFailedText}
        </Alert>
      );
    case "authenticator":
      return (
        <Alert tone="warn" icon="lock" title={labels.ssoAuthenticatorTitle}>
          {labels.ssoAuthenticatorText}
        </Alert>
      );
    default:
      // "local": the passive check found no issuer session; the card simply asks for a password.
      return null;
  }
}
