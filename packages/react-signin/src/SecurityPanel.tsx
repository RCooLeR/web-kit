// The sign-in security panel of the signed-in account: the authenticator app (turn on with a QR
// code, turn off with a current code) and, where the app offers single sign-on, the link to the
// SSO account. There are no recovery codes: an administrator turns a lost authenticator off.
import { isAbort, type Client } from "@rcooler/http";
import { Button, Chip, Field, Icon, Input, type IconName } from "@rcooler/react-ui";
import {
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useState,
  type SyntheticEvent,
  type ReactNode,
} from "react";
import { encode } from "uqr";
import { Alert } from "./Alert.js";
import {
  createSignInApi,
  errorCode,
  type AuthenticatorSetup,
  type AuthenticatorStatus,
  type LinkStatus,
  type SignInApi,
} from "./api.js";
import { defaultSecurityLabels, fillText, type SecurityLabels } from "./labels.js";
import { clearFederationResult, type LinkResult } from "./result.js";

export interface SecurityPanelProps {
  /** The app's client, its base URL "/api/v1". */
  client: Client;
  /** The app's name, as the texts say it ("Herald keeps it encrypted"). */
  appName: string;
  /** The line under the title, such as the account and where its password is set. */
  intro?: ReactNode;
  labels?: SecurityLabels;
  /** The single sign-on callback's result after linking (`readFederationResult`). */
  linkResult?: LinkResult | null;
  /** The language of dates; the browser's when omitted. */
  locale?: string;
  /**
   * The session is gone: turning the authenticator on ends every session, this one too, and a
   * call can find the session expired. Show the sign-in card.
   */
  onSessionEnded: (reason: "authenticator_on" | "signed_out") => void;
  /** Sends the browser to the issuer; `location.assign` by default. */
  navigate?: (url: string) => void;
}

interface Loaded {
  authenticator: AuthenticatorStatus;
  link: LinkStatus;
}

/** The text of a refused change, or "session" when the session ended. */
type Failure = keyof Pick<
  SecurityLabels,
  "wrongPassword" | "badCode" | "setupExpired" | "locked" | "unavailable" | "ssoOutage"
>;

function failureOf(code: string): Failure | "session" {
  switch (code) {
    case "unauthorized":
      return "session";
    case "invalid_login":
      return "wrongPassword";
    case "invalid_code":
      return "badCode";
    case "setup_expired":
      return "setupExpired";
    case "too_many_attempts":
      return "locked";
    case "federation_unavailable":
      return "ssoOutage";
    default:
      return "unavailable";
  }
}

function assign(url: string): void {
  window.location.assign(url);
}

export function SecurityPanel(props: SecurityPanelProps) {
  const labels = props.labels ?? defaultSecurityLabels;
  const api = useMemo(() => createSignInApi(props.client), [props.client]);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [version, setVersion] = useState(0);
  const { onSessionEnded } = props;
  const sessionGone = useEffectEvent(() => onSessionEnded("signed_out"));

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([api.authenticator(controller.signal), api.link(controller.signal)]).then(
      ([authenticator, link]) => {
        setLoaded({ authenticator, link });
        setLoadFailed(false);
      },
      (error: unknown) => {
        if (isAbort(error)) return;
        if (errorCode(error) === "unauthorized") sessionGone();
        else setLoadFailed(true);
      },
    );
    return () => controller.abort();
  }, [api, version]);

  useEffect(() => {
    if (props.linkResult) clearFederationResult();
  }, [props.linkResult]);

  const reload = () => setVersion((current) => current + 1);

  return (
    <div className="sec">
      <div>
        <h1 className="h1">{labels.title}</h1>
        {props.intro !== undefined && <div className="mu">{props.intro}</div>}
      </div>
      {loadFailed && (
        <Alert tone="bad" icon="warning" title={labels.unavailable}>
          <Button className="sec-retry" onClick={reload}>
            {labels.retry}
          </Button>
        </Alert>
      )}
      {loaded && (
        <>
          <AuthenticatorSection
            api={api}
            status={loaded.authenticator}
            appName={props.appName}
            labels={labels}
            onChanged={reload}
            onSessionEnded={onSessionEnded}
          />
          {loaded.link.enabled && (
            <SsoSection
              api={api}
              status={loaded.link}
              labels={labels}
              locale={props.locale}
              linkResult={props.linkResult ?? null}
              navigate={props.navigate ?? assign}
              onChanged={reload}
              onSessionEnded={onSessionEnded}
            />
          )}
        </>
      )}
    </div>
  );
}

interface SectionProps {
  api: SignInApi;
  labels: SecurityLabels;
  onChanged: () => void;
  onSessionEnded: (reason: "authenticator_on" | "signed_out") => void;
}

/** A card of the panel: an icon, the title and a line under it, and a state chip. */
function Section({
  icon,
  accent,
  title,
  intro,
  chip,
  children,
}: {
  icon: IconName;
  accent?: boolean;
  title: ReactNode;
  intro: ReactNode;
  chip: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="card form" aria-labelledby={id}>
      <div className="hd">
        <span className={accent ? "ic ac" : "ic"}>
          <Icon name={icon} />
        </span>
        <div className="grow">
          <h2 className="h2" id={id}>
            {title}
          </h2>
          <div className="mu sm">{intro}</div>
        </div>
        {chip}
      </div>
      {children}
    </section>
  );
}

function AuthenticatorSection({
  api,
  status,
  appName,
  labels,
  onChanged,
  onSessionEnded,
}: SectionProps & { status: AuthenticatorStatus; appName: string }) {
  const [setup, setSetup] = useState<AuthenticatorSetup | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setSetup(null);
    setPassword("");
    setCode("");
    setFailure(null);
  }

  /** Runs a change; answers a refusal with its text, or the end of the session. */
  async function change(action: () => Promise<void>) {
    setBusy(true);
    setFailure(null);
    try {
      await action();
    } catch (error) {
      const code = errorCode(error);
      const found = failureOf(code);
      if (found === "session") {
        onSessionEnded("signed_out");
      } else if (code === "authenticator_on" || code === "bad_request") {
        // Changed elsewhere (another tab, an operator command): show the state as it is now.
        reset();
        onChanged();
      } else {
        if (found === "setupExpired") setSetup(null);
        setFailure(found);
      }
    } finally {
      setBusy(false);
    }
  }

  const begin = () =>
    void change(async () => {
      setSetup(await api.beginAuthenticator());
    });

  function enable(event: SyntheticEvent) {
    event.preventDefault();
    if (!setup) return;
    void change(async () => {
      await api.enableAuthenticator({ password, setupToken: setup.setupToken, code });
      onSessionEnded("authenticator_on");
    });
  }

  function disable(event: SyntheticEvent) {
    event.preventDefault();
    void change(async () => {
      await api.disableAuthenticator({ password, code });
      reset();
      onChanged();
    });
  }

  const state = status.enabled ? "on" : setup ? "setup" : "off";
  const chip =
    state === "on" ? (
      <Chip tone="ok" icon="check">
        {labels.stateOn}
      </Chip>
    ) : state === "setup" ? (
      <Chip tone="warn">{labels.stateSetup}</Chip>
    ) : (
      <Chip>{labels.stateOff}</Chip>
    );
  const passwordError = failure === "wrongPassword" ? labels.wrongPassword : undefined;
  const codeError = failure === "badCode" ? labels.badCode : undefined;
  const otherFailure =
    failure !== null && failure !== "wrongPassword" && failure !== "badCode" ? failure : null;

  return (
    <Section
      icon="phone"
      accent
      title={labels.authenticatorTitle}
      intro={labels.authenticatorIntro}
      chip={chip}
    >
      {otherFailure && (
        <Alert
          tone={otherFailure === "setupExpired" ? "warn" : "bad"}
          icon="warning"
          title={labels[otherFailure]}
        />
      )}
      {state === "off" &&
        (status.available ? (
          <>
            <div className="sm">{labels.anyApp}</div>
            <Button variant="primary" className="sec-start" disabled={busy} onClick={begin}>
              {labels.turnOn}
            </Button>
          </>
        ) : (
          <div className="sm mu">{labels.notAvailable}</div>
        ))}
      {state === "setup" && setup && (
        <form onSubmit={enable}>
          <ol className="sec-steps">
            <li>
              <div className="b">{labels.scanStep}</div>
              <SetupKey setup={setup} labels={labels} />
            </li>
            <li>
              <div className="b">{labels.codeStep}</div>
              <CodeFields
                labels={labels}
                password={password}
                code={code}
                passwordError={passwordError}
                codeError={codeError}
                onPassword={setPassword}
                onCode={setCode}
              />
              <div className="sec-actions">
                <Button type="submit" variant="primary" disabled={busy}>
                  {labels.turnOn}
                </Button>
                <Button variant="ghost" onClick={reset}>
                  {labels.cancel}
                </Button>
              </div>
              <div className="mu sm">{fillText(labels.keyOnce, { app: appName })}</div>
            </li>
          </ol>
        </form>
      )}
      {state === "on" && (
        <form className="form" onSubmit={disable}>
          <div className="b sm">{labels.turnOffIntro}</div>
          <CodeFields
            labels={labels}
            password={password}
            code={code}
            passwordError={passwordError}
            codeError={codeError}
            onPassword={setPassword}
            onCode={setCode}
          />
          <Button type="submit" variant="danger" className="sec-start" disabled={busy}>
            {labels.turnOff}
          </Button>
        </form>
      )}
    </Section>
  );
}

function CodeFields(props: {
  labels: SecurityLabels;
  password: string;
  code: string;
  passwordError: string | undefined;
  codeError: string | undefined;
  onPassword: (value: string) => void;
  onCode: (value: string) => void;
}) {
  return (
    <div className="sec-fields">
      <Field label={props.labels.password} error={props.passwordError}>
        {(control) => (
          <Input
            {...control}
            type="password"
            value={props.password}
            onChange={(event) => props.onPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        )}
      </Field>
      <Field label={props.labels.code} error={props.codeError}>
        {(control) => (
          <Input
            {...control}
            className="si-code"
            value={props.code}
            placeholder="000000"
            onChange={(event) => props.onCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
          />
        )}
      </Field>
    </div>
  );
}

/** "Herald (owner)" from the provisioning URI's label "Herald:owner". */
function entryName(uri: string): string {
  try {
    const label = decodeURIComponent(new URL(uri).pathname.replace(/^\/+/, ""));
    const colon = label.indexOf(":");
    return colon < 0 ? label : `${label.slice(0, colon)} (${label.slice(colon + 1)})`;
  } catch {
    return "";
  }
}

function SetupKey({ setup, labels }: { setup: AuthenticatorSetup; labels: SecurityLabels }) {
  const [copied, setCopied] = useState(false);
  // The clipboard needs a secure context; an app on plain http in the local network has none.
  const canCopy = typeof navigator !== "undefined" && navigator.clipboard !== undefined;
  const grouped = setup.secret.match(/.{1,4}/g)?.join(" ") ?? setup.secret;
  const name = entryName(setup.uri);
  return (
    <div className="sec-qrrow">
      <QrCode text={setup.uri} label={labels.qrLabel} />
      <div className="sec-manual">
        <div className="mu sm">{labels.manualKey}</div>
        <div className="sec-key">{grouped}</div>
        {canCopy && (
          <Button
            variant="ghost"
            icon={copied ? "check" : "copy"}
            onClick={() => {
              navigator.clipboard.writeText(setup.secret).then(
                () => setCopied(true),
                () => setCopied(false),
              );
            }}
          >
            {copied ? labels.copied : labels.copyKey}
          </Button>
        )}
        {name !== "" && <div className="mu sm">{fillText(labels.nameInApp, { name })}</div>}
      </div>
    </div>
  );
}

/** The provisioning URI as a QR code, dark modules on white whatever the theme. */
function QrCode({ text, label }: { text: string; label: string }) {
  const { path, size } = useMemo(() => {
    const qr = encode(text, { ecc: "M", border: 2 });
    let modules = "";
    qr.data.forEach((row, y) =>
      row.forEach((dark, x) => {
        if (dark) modules += `M${x} ${y}h1v1h-1z`;
      }),
    );
    return { path: modules, size: qr.data.length };
  }, [text]);
  return (
    <div className="sec-qr">
      <svg
        width="176"
        height="176"
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={label}
        shapeRendering="crispEdges"
      >
        <path fill="#111111" d={path} />
      </svg>
    </div>
  );
}

function SsoSection({
  api,
  status,
  labels,
  locale,
  linkResult,
  navigate,
  onChanged,
  onSessionEnded,
}: SectionProps & {
  status: LinkStatus;
  locale: string | undefined;
  linkResult: LinkResult | null;
  navigate: (url: string) => void;
}) {
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(action: () => Promise<void>) {
    setBusy(true);
    setFailure(null);
    try {
      await action();
    } catch (error) {
      const found = failureOf(errorCode(error));
      if (found === "session") onSessionEnded("signed_out");
      else setFailure(found);
      setBusy(false);
    }
  }

  const link = () =>
    void act(async () => {
      navigate(await api.startFederation({ link: true }));
    });

  const unlink = () =>
    void act(async () => {
      await api.unlink();
      setBusy(false);
      onChanged();
    });

  const chip = status.linked ? (
    <Chip tone="ok" icon="check">
      {labels.linked}
    </Chip>
  ) : (
    <Chip>{labels.notLinked}</Chip>
  );

  return (
    <Section icon="shield-check" title={labels.ssoTitle} intro={labels.ssoIntro} chip={chip}>
      <LinkResultAlert result={linkResult} labels={labels} />
      {failure && <Alert tone="bad" icon="warning" title={labels[failure]} />}
      {status.linked ? (
        <>
          <div className="kvr sec-first">
            <span className="grow">{labels.ssoAccount}</span>
            <span className="mu sm">{linkLine(status, labels, locale)}</span>
          </div>
          <div className="mu sm">{labels.ssoDownNote}</div>
          <Button
            variant="danger"
            icon="unlink"
            className="sec-start"
            disabled={busy}
            onClick={unlink}
          >
            {labels.unlink}
          </Button>
        </>
      ) : (
        <>
          <div className="sm">{labels.linkIntro}</div>
          <Button icon="link" className="sec-start" disabled={busy} onClick={link}>
            {labels.link}
          </Button>
        </>
      )}
    </Section>
  );
}

/** "sso.example.com · linked on 28 November 2026 · by the administrator". */
function linkLine(status: LinkStatus, labels: SecurityLabels, locale: string | undefined): string {
  const parts: string[] = [];
  if (status.issuer !== undefined) {
    try {
      parts.push(new URL(status.issuer).host);
    } catch {
      parts.push(status.issuer);
    }
  }
  if (status.linkedAt !== undefined) {
    const date = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(status.linkedAt);
    parts.push(fillText(labels.linkedOn, { date }));
  }
  if (status.by === "operator") parts.push(labels.byOperator);
  return parts.join(" · ");
}

function LinkResultAlert({
  result,
  labels,
}: {
  result: LinkResult | null;
  labels: SecurityLabels;
}) {
  switch (result) {
    case "done":
      return <Alert tone="ok" icon="check" title={labels.linkDone} role="status" />;
    case "failed":
      return <Alert tone="bad" icon="warning" title={labels.linkFailed} />;
    case "conflict":
      return <Alert tone="warn" icon="link" title={labels.linkConflict} />;
    default:
      return null;
  }
}
