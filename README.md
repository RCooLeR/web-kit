# web-kit

Small TypeScript packages for web apps written in Ukrainian and English: a Bootstrap 5 theme,
formatting, translations, an HTTP client, Web Push, and a few React components. They are built as
ESM with type declarations and published on npm under the `@rcooler` scope.

The packages are extracted from working apps when a second app needs the same code, not designed
up front. The first consumer is Herald, a notification service. The Go counterpart is
[kit](https://github.com/RCooLeR/kit).

**Status: before 1.0.** Interfaces may still change between versions, and there is no compatibility
promise yet. Changes are listed in [CHANGELOG.md](CHANGELOG.md).

## Packages

| Package | What it does | Runtime dependencies |
|---|---|---|
| `@rcooler/tokens` | Colour roles for light and dark as `--rc-*` custom properties bound to Bootstrap 5.3 variables (`tokens.css`), the same values as `tokens.json`, and `followSystemColorScheme()` | none |
| `@rcooler/format` | Durations, calendar dates, instants in an explicit time zone (default `Europe/Kyiv`), elapsed time, numbers, UAH, USD and EUR amounts | none |
| `@rcooler/i18n-core` | Typed `uk` and `en` dictionaries, placeholders, plural forms, error text by code | none |
| `@rcooler/http` | `fetch` with a timeout, `ApiError` with stable codes, answers checked by a schema (any `safeParse`, for example zod) | none |
| `@rcooler/webpush` | Subscribe, resubscribe after a server key change, and the service worker handlers (`@rcooler/webpush/worker`): show the message with its buttons, open the page, hand an answer button's token to the app | none |
| `@rcooler/react-ui` | The shared look: `kit.css` (tokens, dark by default), `AppShell` (sidebar, grouped navigation with counters, language and theme switches, optional cockpit link and sign-out; a top bar with a menu panel at phone width), the parts (`Card`, `Stat`, `Chip`, `Button`, `Row`, `Progress`, `Field`, `Segmented`, `CheckLine`, `MasterDetail`, `Tabs`, `Plate`, `RowGrid`), the icon set, `Modal` with a focus trap, toasts, a sortable `DataTable`, `ErrorBoundary` | React 19.3 (peer) |
| `@rcooler/react-admin` | Admin screens in the familiar publishing-dashboard layout: `AdminLayout` (top bar, menu, phone panel), `AdminMenu` (sections with submenus, flyouts, folded), `ScreenHeader` with a page action, `Notice`, `ListTable` with `ListViews`, `ListSearch`, `BulkActions`, `Pagination` and `useListSelection`, `PostBox` and `PostBoxes` with `usePostBoxLayout`, `FormTable`, `ScreenOptions`, `NavTabs`; `admin.css` | React 19.3 (peer), `@rcooler/react-ui` |
| `@rcooler/react-signin` | The shared sign-in on one backend API: `SignInCard` (password, authenticator code, single sign-on with a passive check), `SecurityPanel` (authenticator app with a QR code, the single sign-on link), `createSignInApi`, the callback's result, English and Ukrainian texts; `signin.css` | React 19.3 (peer), `@rcooler/react-ui`, `@rcooler/http`, `uqr` |
| `@rcooler/react-i18n` | `createI18n(dictionaries)`: a provider and a hook that give components the translator and a language switch | React 19.3 (peer), `@rcooler/i18n-core` |

Nothing reads the machine's time zone or language implicitly: the zone, the locale and "now" are
arguments, so output is the same on every machine.

```ts
import "bootstrap/dist/css/bootstrap.min.css";
import "@rcooler/tokens/tokens.css"; // after Bootstrap
import { followSystemColorScheme } from "@rcooler/tokens";

followSystemColorScheme(); // keeps data-bs-theme in step with the system setting
```

```tsx
import { createI18n } from "@rcooler/react-i18n";

const en = { "nav.home": "Home", "error.unknown": "Something went wrong." };
const uk = { "nav.home": "Головна", "error.unknown": "Щось пішло не так." };

export const { I18nProvider, useI18n } = createI18n({ en, uk }, { storageKey: "app.locale" });
```

The theme values live in `packages/tokens/src/theme.ts` only; the CSS and the JSON are generated
from that file at build time. A test checks that every Bootstrap variable the theme sets exists in
the pinned Bootstrap release.

## The shared look

`@rcooler/react-ui/kit.css` is the stylesheet of every app: load it once, instead of Bootstrap (its
`.btn`, `.card` and `.row` are its own, so the two do not mix). Its tokens live on the `.app`
element that `AppShell` renders: dark by default, `.light` when the user switches, and the choice is
remembered in the browser (`useTheme`).

```tsx
import "@rcooler/react-ui/kit.css";
import { AppShell, Card, Chip, Stat } from "@rcooler/react-ui";

<AppShell
  name="Herald" subtitle="Служба сповіщень" icon="send"
  navLabel={t("nav.label")} themeLabel={t("theme.light")}
  nav={[{ items: [{ href: "#/", label: t("nav.overview"), icon: "overview", current: true }] }]}
  cockpit={cockpitUrl ? { href: cockpitUrl, label: "Cockpit" } : undefined}
  footer={commit}
  languages={{ label: t("language"), current: locale, options: [{ code: "uk", label: "UK" }, { code: "en", label: "EN" }], onChange: setLocale }}
  signOut={{ label: t("signOut"), onSignOut: signOut }}
>
  <ToastProvider closeLabel={t("close")}>{page}</ToastProvider>
</AppShell>
```

At 760 px and below the sidebar becomes a menu: a top bar shows the brand mark, the current page's
name and a menu button (named `menuLabel`, `navLabel` when omitted, and marked while an entry has a
count), and the sidebar opens from it as a panel with the counters, the switches and the sign-out.
Choosing an entry, Escape, a tap outside and the panel's close button close it; focus moves into it
and back. Above 760 px the sidebar stays in view while the page scrolls, scrolls on its own when
its entries are taller than the window, and keeps the sign-out and the switches at its bottom. Apps
need nothing more than the props above.

Optional parts: `scope` puts a control under the brand, such as a property selector (a `.btn` there
is a full-width scope button); `account` shows the signed-in person at the foot of the sidebar, as a
button (`onClick`) or a link (`href`), with `name`, `detail` (role, language) and `initials`;
`countTone: "brand"` draws a count in the brand's main colour (`--pri`), for counts that are tasks
rather than problems; and `phoneTabs` adds a tab bar at the bottom of the phone screen, with an
optional last tab (`more`) that opens the navigation panel. The top bar and the panel stay as they
are.

Put `ToastProvider` and every `Modal` inside the shell: the tokens are defined on `.app`. The class
names are those of the approved previews; a page may use them directly next to the components.
Beyond the previews' shared stylesheet, `kit.css` has: `.ev` and `.mono` (code text), `.tr` (a grid
row; its columns come from the `--cols` custom property), `.ar` (right-aligned cell), `.tabs` and
`.tab`, `.pl` (plate), `.stn` (step number; `.stn.ol` outlined), `.dr` (a selectable row of a master
list), `.btn.on` and `.btn.bd`, `.sr` (visually hidden), `.empty`, `.fld .hint` and `.fld .err`, and
the classes of `Modal` (`.dlg-bg`, `.dlg`), the toasts (`.toasts`, `.toast`) and `DataTable` (`.tbl`,
`.sort`). Fonts are not bundled: Inter and Manrope are used when installed, the system font
otherwise.

### Brands

An application with its own brand keeps the same components and markup and sets tokens. kit.css
reads every brand-specific value from a custom property on `.app` whose default is the rcooler
look: `--font` and `--font-display`, the corners `--r-card` and `--r-ctl`, the main button `--pri`
and `--pri-ink`, the mark `--mark` and `--mark-ink`, and the sidebar and the phone top bar
(`--side`, `--side-ink`, `--side-mu`, `--side-dim`, `--side-ln`, `--side-hover`, `--side-on`,
`--side-on-ink`). A brand stylesheet sets them, and the theme tokens, on `.app[data-brand="…"]`
and `.app.light[data-brand="…"]`; `AppShell`'s `brand` prop sets the attribute and `mark` draws the
brand's own logo instead of an icon. web-kit ships `@rcooler/react-ui/brands/homeledger.css`:

```tsx
import "@rcooler/react-ui/kit.css";
import "@rcooler/react-ui/brands/homeledger.css";

<AppShell brand="homeledger" mark={<HomeLedgerMark />} name={<Wordmark />} ...>
```

The application loads the brand's fonts (HomeLedger: Onest, and Unbounded for its wordmark).

## Admin screens

`@rcooler/react-admin` draws admin screens in the layout people know from publishing dashboards: a
top bar, a menu of sections with submenus on the left, and screens built from a screen header,
notices, list tables, postboxes and form tables. Load `@rcooler/react-admin/admin.css` once. It
works beside Bootstrap or on its own: every class starts with `rc-`, and every colour and size is a
custom property the app maps onto its own theme, light and dark, usually on `<body>`. Unset
properties fall back to Bootstrap's variables where one fits, then to neutral defaults.

| Custom property | What it colours or sizes |
|---|---|
| `--rc-admin-ink`, `--rc-admin-muted` | Text and secondary text |
| `--rc-admin-surface`, `--rc-admin-wash`, `--rc-admin-rail` | Boxes and tables, the page behind them, table headers and row hover |
| `--rc-admin-border`, `--rc-admin-control` | Box borders, control borders |
| `--rc-admin-accent`, `--rc-admin-on-accent`, `--rc-admin-accent-soft` | Links, primary buttons and their text, selected rows |
| `--rc-admin-danger`, `--rc-admin-focus`, `--rc-admin-radius` | Destructive actions, the focus ring, box corners |
| `--rc-admin-success`, `-warning`, `-error`, `-info`, each with `-bg`, `-border`, `-ink` | Notices |
| `--rc-admin-menu-bg`, `-ink`, `-muted`, `-sub`, `-current`, `-current-ink`, `-hover`, `-focus` | The menu, its submenus and current entry |
| `--rc-admin-badge-bg`, `--rc-admin-badge-ink`, `--rc-admin-bar-bg`, `--rc-admin-bar-ink` | Menu counts, the top bar |
| `--rc-admin-menu-width`, `--rc-admin-menu-folded-width`, `--rc-admin-bar-height`, `--rc-admin-content-padding` | Sizes (220 px, 56 px, 44 px, `0 24px 40px`) |

```tsx
import "@rcooler/react-admin/admin.css";
import { AdminLayout, ListTable, ScreenHeader, useListSelection } from "@rcooler/react-admin";

<AdminLayout
  bar={<a className="rc-admin-bar-item" href="/">Site</a>}
  menuButtonLabel={t("menu")}
  menu={{ label: t("workspace"), sections, folded, onFoldedChange: setFolded, onNavigate }}
>
  <main>
    <ScreenHeader title={t("articles")} action={{ label: t("addNew"), href: "/admin/articles/new" }} />
    <ListTable label={t("articles")} rows={rows} rowKey={(row) => row.id} columns={columns}
      selection={selection} sort={sort} onSort={setSort} pagination={{ page, pageCount, onPage }} />
  </main>
</AdminLayout>
```

Menu entries, views, sortable headers and pagination render real links when they have an address,
so a router can intercept their clicks (`onNavigate`, or one click handler on the document) and
readers can open them in a new tab. The current section shows its submenu in place, the others open
theirs on hover or keyboard focus; folded (by choice, or between 761 and 960 px) the menu shows
icons, and at 760 px and below it opens from the top bar as a panel with every submenu open. A list
table at phone width keeps its primary column and a button per row that shows the other columns.
Texts come from the app; the English defaults (`defaultListTableLabels`, `defaultPaginationLabels`,
`defaultPostBoxLabels` and the `label` props) are there for tests and prototypes.

## Sign-in

`@rcooler/react-signin` is the sign-in of every app: one card, one security panel, one API. Load
`@rcooler/react-signin/signin.css` after kit.css; a brand stylesheet restyles it like the rest.

```tsx
import "@rcooler/react-signin/signin.css";
import {
  SecurityPanel, SignInCard, readFederationResult, skipPassiveCheck,
  ukSecurityLabels, ukSignInLabels,
} from "@rcooler/react-signin";

const result = readFederationResult(location.search); // where the SSO callback landed

<div className="app si-page" data-brand="homeledger">
  <SignInCard client={client} brand={<Brand />} account labels={ukSignInLabels}
    controls={<LanguageAndTheme />} notice={notice} onSignedIn={refreshSession} />
</div>

<SecurityPanel client={client} appName="Herald" intro={t("security.intro")}
  labels={ukSecurityLabels} linkResult={result && "link" in result ? result.link : null}
  onSessionEnded={(reason) => showSignIn(reason === "authenticator_on" ? "authenticator_on" : undefined)} />
```

`client` is the app's `@rcooler/http` client with the base URL `/api/v1`. Every app answers these
routes the same way; errors are kit `jsonhttp` envelopes, and the components read only their code:

| Route | Request | Answer |
|---|---|---|
| `GET /session` | | `{authenticated, login_configured, sso}`; `sso` means single sign-on is configured |
| `POST /session` | `{password, code?}`, plus `login` in apps with several accounts | 200; 401 `authenticator_required` (send the code too), `invalid_code` or `invalid_login`; 429 `too_many_attempts` |
| `GET /federation` | | `{enabled, passive, social_providers}`; 404 counts as not offered |
| `POST /federation/start` | `{}`, `{passive: true}` or `{link: true}` (`provider` names a social sign-in) | `{authorization_url}`; 503 `federation_unavailable`, 404 `federation_disabled` |
| `GET /federation/callback` | the issuer's return | 303 to the public address, plain on success or with `?signin=failed`, `local`, `authenticator`, `?link=done`, `failed`, `conflict` |
| `GET /session/authenticator` | | `{enabled, available}` |
| `POST /session/authenticator/setup` | `{}` | `{secret, uri, setup_token}`; 409 `authenticator_on`, 503 `authenticator_unavailable` |
| `POST /session/authenticator` | `{password, setup_token, code}` | 204; the app may end every session, this one too, so the panel asks `GET /session` after it; 409 `setup_expired` |
| `DELETE /session/authenticator` | `{password, code}` | 204 |
| `GET /session/federation` | | `{enabled, linked, issuer?, linked_at?, by?}`; 404 counts as not offered |
| `DELETE /session/federation` | | `{unlinked}` |

The card shows the single sign-on button only when `GET /federation` says `enabled`, so an app
without it (404) gets the same card with password and code alone. When the issuer allows it, the
card asks the issuer's session passively once per tab; call `skipPassiveCheck()` on sign-out, or the
person is signed straight back in. `account` adds the login field. The callback lands on the
public address: `readFederationResult` tells the app which screen to show (a `link` result belongs
on the security screen), and the components take the value out of the address once shown. There
are no recovery codes: an administrator turns a lost authenticator off, which `resetHint` says in
each app's words. Texts: `defaultSignInLabels` and `defaultSecurityLabels` (English),
`ukSignInLabels` and `ukSecurityLabels`; change one by spreading.

## Using the packages

The packages are on npm under the `@rcooler` scope, with one shared version:

```sh
npm install @rcooler/format @rcooler/react-ui
```

They pin each other exactly (`@rcooler/react-admin` on `@rcooler/react-ui`, `@rcooler/react-i18n`
on `@rcooler/i18n-core`), so an app keeps all of them on the same version.

To try a change that is not released yet, link a package from a checkout of this repository next
to the app and build it first:

```sh
git clone https://github.com/RCooLeR/web-kit.git
(cd web-kit && npm ci && npm run build)
```

```json
"@rcooler/format": "file:../web-kit/packages/format"
```

The path is relative to the app's `package.json`. An app that links the React packages this way
must make its bundler use one copy of React and of the shared packages, because the links resolve
into this workspace's own `node_modules`; an app that dedupes `@rcooler/i18n-core` links it as its
own dependency too. With Vite, which also has to be allowed to serve the checkout in development:

```ts
resolve: { dedupe: ["react", "react-dom", "@rcooler/i18n-core"] },
server: { fs: { allow: [".", "../../web-kit"] } },
```

### The push worker

Bundle `@rcooler/webpush/worker` into one classic worker file with a fixed name, such as `/sw.js`,
so the browser finds the same worker at every visit, and serve it with `Cache-Control: no-cache`.
Keep it out of a CDN's cache and of any browser cache override: a cached worker keeps old code
running. `enablePush` registers it past the HTTP cache (`updateViaCache: "none"`; a module worker
passes `registration: { type: "module" }`). Pass `workerUrl` to `refreshPush` at app start too: it
then moves a browser to a renamed worker and asks for an update of the current one.

`onAnswer` should finish within a few seconds. A tap waits `ANSWER_TIMEOUT_MS` for it and then
opens the message's page, because browsers allow a worker to open a window only shortly after the
tap.

## Development

| Tool | Version | Notes |
|---|---|---|
| Node.js | 26 LTS, exact version in `.nvmrc` | `engines` and `engine-strict` refuse other lines |
| npm | 11, the one Node 26 ships | |
| TypeScript | 7 (`@typescript/native`) builds and type-checks; 6 is installed as `typescript` | typescript-eslint needs TypeScript 6, and `check:consumers` compiles a consumer with TypeScript 6 against the built declarations |
| Tests | vitest, jsdom for the React packages | the test process runs in `America/New_York`, so a formatter that leaks the machine's zone fails |

```sh
npm ci
npm run verify   # format:check, lint, typecheck, test, build, check:consumers
```

Inside the workspace a package that imports a sibling reads the sibling's source through the
`@rcooler/source` export condition (`tsconfig.base.json`, `vitest.config.ts`), so lint, type check
and tests need no build and always see current code. The build switches the condition off and reads
the sibling's `dist/`, as an installed copy would; `workspaces` in `package.json` lists the packages
in build order for that reason.

### Adding a package

1. A second app needs the code, and one existing implementation is clearly the best.
2. Copy it, keep its behaviour, and turn every app-specific name (storage keys, URLs, texts) into a
   parameter.
3. Give it a header comment that says what it owns and what stays with the app, and tests.
4. Add it to `workspaces` after the packages it imports, to the table above and to
   `consumer-check/consumer.ts`.

## Licence

[MIT](LICENSE)
