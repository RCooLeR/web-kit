# @rcooler/react-i18n

`createI18n(dictionaries)`: a provider and a hook that give React components the translator of
[`@rcooler/i18n-core`](https://www.npmjs.com/package/@rcooler/i18n-core) and a language switch.
React 19.3 is a peer dependency.

```sh
npm install @rcooler/react-i18n
```

```tsx
import { createI18n } from "@rcooler/react-i18n";

const en = { "nav.home": "Home", "error.unknown": "Something went wrong." };
const uk = { "nav.home": "Головна", "error.unknown": "Щось пішло не так." };

export const { I18nProvider, useI18n } = createI18n({ en, uk }, { storageKey: "app.locale" });
```

ESM with type declarations. Part of [web-kit](https://github.com/RCooLeR/web-kit): the
[README](https://github.com/RCooLeR/web-kit#readme) there describes every package, and the
[changelog](https://github.com/RCooLeR/web-kit/blob/main/CHANGELOG.md) lists the changes.

## Licence

[MIT](LICENSE)
