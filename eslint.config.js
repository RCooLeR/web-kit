// ESLint flat config for the web workspace: type-checked rules on package sources and tests.
// typescript-eslint needs TypeScript 6, which is what the `typescript` alias in package.json
// installs; TypeScript 7 (`@typescript/native`) does the type check and the build.
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  // consumer-check/ is a compile fixture that needs the built packages; tsc checks it.
  { ignores: ["**/dist/**", "coverage/**", "consumer-check/**"] },
  {
    files: ["packages/*/src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // The compiler reports undefined names; the core rule does not understand types.
      "no-undef": "off",
      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-deprecated": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // React packages: Rules of Hooks and effect dependencies.
  {
    files: ["packages/react-*/src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  // Build configs in TypeScript: syntax-level rules only, Node globals.
  {
    files: ["*.config.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  // Node scripts.
  {
    files: ["*.config.js", "packages/*/scripts/**/*.mjs"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
);
