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
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "react/no-danger": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
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
