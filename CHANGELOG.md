# Changelog

The packages follow semantic versioning and share one version. Before 1.0 a minor version may
change interfaces; such changes are listed here.

## Unreleased

The packages were first developed inside [kit](https://github.com/RCooLeR/kit) and moved here before
either repository was published. Their code is unchanged.

- Licensed under MIT; package manifests point at this repository.
- `webpush/worker`: action buttons. A pushed `actions` list (`open` with a page, `callback` with an
  answer token) becomes notification buttons; a tapped answer button hands its token to the new
  `onAnswer` option, which the app sends to its server. Without `onAnswer` only open buttons show.
  An answer that does not get through (`onAnswer` rejects or resolves with a response that is not
  ok) opens the message's page instead of vanishing.
- `webpush`: a subscription made with a key the server no longer has counts as off in
  `pushStatus`, and `refreshPush` replaces it without a tap and tells the server to forget the old
  address.
- `webpush`: the worker is registered with `updateViaCache: "none"` unless the new `registration`
  option says otherwise; `refreshPush` takes an optional `workerUrl` and then moves a browser to a
  renamed worker or asks for an update. `webpush/worker`: a tap waits `ANSWER_TIMEOUT_MS` (4 s) for
  `onAnswer` before it opens the message's page.
- `http`: a call cancelled or timed out while its body is read ends as an abort or as `timeout`,
  not as `bad_response`.
- `format`: an amount that rounds to zero shows no minus sign.
- `react-ui`: `sortRows` treats `null` and `NaN` as missing values, last in both directions.
- `react-ui`: with modals open on top of each other, only the one opened last answers keys, so one
  Escape closes one dialog.
- `react-ui`: the shared look of the redesign. `kit.css` (exported as `@rcooler/react-ui/kit.css`):
  the tokens, dark by default with a remembered light switch, and the classes of the approved
  previews, plus the parts more than one preview draws. `AppShell`, `useTheme`, the parts (`Card`,
  `Stat`, `Chip`, `Button`, `ButtonLink`, `Row`, `Progress`, `Field`, `Input`, `Select`,
  `TextArea`, `Segmented`, `CheckLine`, `MasterDetail`, `Tabs`, `Plate`, `RowGrid`, `Dot`, `Empty`),
  `Icon`, `IconBadge` and the 71 icons of the previews.
- `react-ui`, changed markup: `Modal`, the toasts and `DataTable` render `kit.css` classes instead of
  Bootstrap's; their props are unchanged. An app moves by loading `@rcooler/react-ui/kit.css` instead
  of Bootstrap and `@rcooler/tokens/tokens.css`, and by putting `ToastProvider` and its modals inside
  `AppShell`. `@rcooler/tokens` is unchanged and no longer needed by such an app.
- `react-ui`: `AppShell` at phone width (760 px and below): a top bar with the brand mark, the current
  page's name and a menu button, and the sidebar as a panel opened from it (closes on choosing an
  entry, Escape, a tap outside or its close button; focus moves in and back; the page behind is
  inert). The menu button is marked while an entry has a count. New optional props: `menuLabel`
  (the menu button's name, `navLabel` by default) and `signOut` (`{ label, onSignOut }`, a button at
  the foot of the sidebar and so in the menu). New `kit.css` classes: `.topbar`, `.scrim`, `.mdot`,
  `.shut`, `.out` and `button.nav`.
- `react-ui`: above 760 px the `AppShell` sidebar stays in view while the page scrolls: as tall as
  the window, with its own scroll when its entries are taller, and the sign-out and footer row
  (new wrapper class `.sfoot`) pinned at its bottom. Sidebar rows no longer shrink when the sidebar
  has a set height, so a label on several lines no longer overlaps the next entry in the phone
  panel either.
- Each package exports its source under the `@rcooler/source` condition. Lint, type check and tests
  in this workspace read siblings through it, so they no longer need a build first.

### 0.1.0 (not published)

- `tokens`, `format`, `i18n-core`, `http`, `webpush`.
- `react-ui` (`Modal`, toasts, `DataTable`, `ErrorBoundary`) and `react-i18n` (provider and hook).
- `i18n-core`: `Translator` and `http`'s `Client` declare their members as function properties, so
  they can be destructured; `createTranslator` requires `error.unknown` in its types.
