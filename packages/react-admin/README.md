# @rcooler/react-admin

Admin screens in the familiar publishing-dashboard layout: `AdminLayout` (top bar, menu, phone
panel), `AdminMenu`, `ScreenHeader`, `Notice`, `ListTable` with views, search, bulk actions and
pagination, `PostBox`, `FormTable`, `ScreenOptions` and `NavTabs`. `admin.css` styles them through
`--rc-admin-*` custom properties, beside Bootstrap or on its own. React 19.3 is a peer dependency.

```sh
npm install @rcooler/react-admin
```

```tsx
import "@rcooler/react-admin/admin.css";
import { AdminLayout, ListTable, ScreenHeader, useListSelection } from "@rcooler/react-admin";
```

ESM with type declarations. Part of [web-kit](https://github.com/RCooLeR/web-kit): the
[README](https://github.com/RCooLeR/web-kit#readme) there describes every package, and the
[changelog](https://github.com/RCooLeR/web-kit/blob/main/CHANGELOG.md) lists the changes.

## Licence

[MIT](LICENSE)
