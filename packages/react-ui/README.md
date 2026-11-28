# @rcooler/react-ui

The shared look of the rcooler web apps: `kit.css` (tokens, dark by default), `AppShell` (sidebar,
grouped navigation, language and theme switches, a menu panel at phone width), the parts (`Card`,
`Stat`, `Chip`, `Button`, `Field`, `Tabs` and others), an icon set, `Modal` with a focus trap, toasts,
a sortable `DataTable` and `ErrorBoundary`. React 19.3 is a peer dependency.

```sh
npm install @rcooler/react-ui
```

```tsx
import "@rcooler/react-ui/kit.css";
import { AppShell, Card, Chip, Stat } from "@rcooler/react-ui";
```

ESM with type declarations. Part of [web-kit](https://github.com/RCooLeR/web-kit): the
[README](https://github.com/RCooLeR/web-kit#readme) there describes every package, and the
[changelog](https://github.com/RCooLeR/web-kit/blob/main/CHANGELOG.md) lists the changes.

## Licence

[MIT](LICENSE)
