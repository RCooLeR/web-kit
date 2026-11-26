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
- Each package exports its source under the `@rcooler/source` condition. Lint, type check and tests
  in this workspace read siblings through it, so they no longer need a build first.

### 0.1.0 (not published)

- `tokens`, `format`, `i18n-core`, `http`, `webpush`.
- `react-ui` (`Modal`, toasts, `DataTable`, `ErrorBoundary`) and `react-i18n` (provider and hook).
- `i18n-core`: `Translator` and `http`'s `Client` declare their members as function properties, so
  they can be destructured; `createTranslator` requires `error.unknown` in its types.
