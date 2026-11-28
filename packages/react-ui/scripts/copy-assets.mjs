// Copies the stylesheets next to the built modules, where the package's "./kit.css" and
// "./brands/*" exports point.
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(root, "dist", "brands"), { recursive: true });
copyFileSync(join(root, "src", "kit.css"), join(root, "dist", "kit.css"));
for (const file of readdirSync(join(root, "src", "brands"))) {
  if (file.endsWith(".css")) {
    copyFileSync(join(root, "src", "brands", file), join(root, "dist", "brands", file));
  }
}
