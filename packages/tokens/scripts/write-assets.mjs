// Writes the non-JavaScript outputs next to the compiled module: dist/tokens.css for the web
// apps and dist/tokens.json for native apps (Android, for example). Runs after tsc, so it reads the same values
// the package exports.
import { writeFile } from "node:fs/promises";

import { renderCss, tokens } from "../dist/index.js";

const dist = new URL("../dist/", import.meta.url);
await writeFile(new URL("tokens.css", dist), renderCss());
await writeFile(new URL("tokens.json", dist), `${JSON.stringify(tokens, null, 2)}\n`);
