# @rcooler/react-signin

The shared sign-in: `SignInCard` (password, then the authenticator code when the account has one,
and the single sign-on button when the app offers it) and `SecurityPanel` (turn an authenticator
app on with a QR code or off with a current code, and link or unlink the single sign-on account).
Both talk to the one sign-in API every app serves, through `@rcooler/http`, and are styled by
`@rcooler/react-ui/kit.css` and `signin.css`. Texts ship in English and Ukrainian. React 19.3 is a
peer dependency.

```sh
npm install @rcooler/react-signin
```

```tsx
import "@rcooler/react-ui/kit.css";
import "@rcooler/react-signin/signin.css";
import { SecurityPanel, SignInCard, ukSignInLabels } from "@rcooler/react-signin";
```

ESM with type declarations. Part of [web-kit](https://github.com/RCooLeR/web-kit): the
[README](https://github.com/RCooLeR/web-kit#readme) there describes every package and the API, and
the [changelog](https://github.com/RCooLeR/web-kit/blob/main/CHANGELOG.md) lists the changes.

## Licence

[MIT](LICENSE)
