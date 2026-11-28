# @rcooler/tokens

Colour roles for light and dark as `--rc-*` custom properties bound to Bootstrap 5.3 variables
(`tokens.css`), the same values as `tokens.json`, and `followSystemColorScheme()`. No runtime
dependencies.

```sh
npm install @rcooler/tokens
```

```ts
import "bootstrap/dist/css/bootstrap.min.css";
import "@rcooler/tokens/tokens.css"; // after Bootstrap
import { followSystemColorScheme } from "@rcooler/tokens";

followSystemColorScheme(); // keeps data-bs-theme in step with the system setting
```

ESM with type declarations. Part of [web-kit](https://github.com/RCooLeR/web-kit): the
[README](https://github.com/RCooLeR/web-kit#readme) there describes every package, and the
[changelog](https://github.com/RCooLeR/web-kit/blob/main/CHANGELOG.md) lists the changes.

## Licence

[MIT](LICENSE)
