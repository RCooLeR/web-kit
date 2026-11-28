# @rcooler/webpush

Web Push for the page and the service worker: subscribe (`enablePush`), read the state
(`pushStatus`), resubscribe after a server key change (`refreshPush`), unsubscribe (`disablePush`),
and the worker handlers in `@rcooler/webpush/worker`, which show the message with its buttons, open
the page and hand an answer button's token to the app. No runtime dependencies.

Bundle `@rcooler/webpush/worker` into one classic worker file with a fixed name, such as `/sw.js`,
and serve it with `Cache-Control: no-cache`.

```sh
npm install @rcooler/webpush
```

ESM with type declarations. Part of [web-kit](https://github.com/RCooLeR/web-kit): the
[README](https://github.com/RCooLeR/web-kit#readme) there describes every package, and the
[changelog](https://github.com/RCooLeR/web-kit/blob/main/CHANGELOG.md) lists the changes.

## Licence

[MIT](LICENSE)
