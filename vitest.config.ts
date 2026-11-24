// One test run for all packages. The process time zone is set to one that is neither UTC nor Kyiv,
// so a formatter that leaks the machine's zone into its output fails here instead of on a laptop.
import { defineConfig } from "vitest/config";

// Tests read a sibling package from its source, as the type check does (see tsconfig.base.json), so
// they need no build first. A custom list replaces Vite's defaults, hence they are repeated here.
const source = "@rcooler/source";

export default defineConfig({
  resolve: { conditions: [source, "module", "browser", "development|production"] },
  ssr: { resolve: { conditions: [source, "module", "node", "development|production"] } },
  test: {
    include: ["packages/*/src/**/*.test.{ts,tsx}"],
    environment: "node",
    env: { TZ: "America/New_York" },
    // The tokens tests read Bootstrap's stylesheet as text; by default vitest empties CSS imports.
    css: true,
  },
});
