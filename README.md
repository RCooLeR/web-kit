# web-kit

Small TypeScript packages for web apps written in Ukrainian and English: a Bootstrap 5 theme,
formatting, translations, an HTTP client, Web Push, and a few React components. They are built as
ESM with type declarations, to be published under the `@rcooler` scope.

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
| `@rcooler/react-ui` | `Modal` with a focus trap, a toast queue, a sortable `DataTable`, `ErrorBoundary`, all Bootstrap 5 markup | React 19.3 (peer) |
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

## Using the packages

The packages are not on a registry yet. Until they are, an app links them from a checkout of this
repository next to its own and builds them first:

```sh
git clone https://github.com/RCooLeR/web-kit.git
(cd web-kit && npm ci && npm run build)
```

```json
"@rcooler/format": "file:../web-kit/packages/format"
```

An app that links the React packages this way must make its bundler use one copy of React and of
the shared packages, because the links resolve into this workspace's own `node_modules`. With Vite:

```ts
resolve: { dedupe: ["react", "react-dom", "@rcooler/i18n-core"] },
```

## Development

| Tool | Version | Notes |
|---|---|---|
| Node.js | 24 LTS, exact version in `.nvmrc` | `engines` and `engine-strict` refuse other lines |
| npm | 11, the one Node 24 ships | |
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
