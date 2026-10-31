import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier/flat";

// eslint-config-next already registers the jsx-a11y plugin, so only the
// strict rule set is layered on top (re-registering the plugin would throw).
const a11yStrictRules = Object.fromEntries(
  Object.entries(jsxA11y.flatConfigs.strict.rules).map(([rule, level]) => [
    rule,
    level === "off" ? "off" : "error",
  ]),
);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      ...a11yStrictRules,
      // Form controls are labelled with <label htmlFor> in shared components, which this
      // static rule cannot follow. Their labels are verified by axe (e2e) and by
      // getByRole(..., { name }) queries in component tests instead.
      "jsx-a11y/control-has-associated-label": [
        "error",
        { ignoreElements: ["input", "select", "textarea"], depth: 4 },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "react/no-danger": "error",
      // console.warn/error are operational signals on the server; console.log is debris.
      "no-console": ["error", { allow: ["warn", "error"] }],

      // Correctness beyond the recommended sets.
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-implicit-coercion": "error",
      "no-param-reassign": "error",
      "no-else-return": "error",
      "no-lonely-if": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
      "default-case-last": "error",

      // Maintainability ceilings, set at what the code measures after its last
      // refactor so any change that makes a function harder to follow fails lint.
      // Complexity counts every `?.`, `??` and `&&` in JSX, hence 12 rather than 10.
      complexity: ["error", 12],
      "max-lines-per-function": [
        "error",
        { max: 100, skipBlankLines: true, skipComments: true },
      ],
      "max-depth": ["error", 4],
      "max-params": ["error", 5],
      "max-nested-callbacks": ["error", 4],
      "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Type-aware rules: they read the TypeScript program, so they catch what
    // syntax alone cannot (a promise nobody awaits, a switch that misses a case).
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { considerDefaultExhaustiveForUnions: true },
      ],
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-deprecated": "error",
      "@typescript-eslint/only-throw-error": "error",
      "@typescript-eslint/prefer-promise-reject-errors": "error",
      "@typescript-eslint/no-base-to-string": "error",
      "@typescript-eslint/restrict-plus-operands": "error",
    },
  },
  {
    // Catalogues of occasions and planning profiles are data, not logic; tests
    // enumerate scenarios, so their length is their nature.
    files: ["lib/events/occasions.ts", "lib/events/profiles.ts", "tests/**"],
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
      "max-nested-callbacks": "off",
    },
  },
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
