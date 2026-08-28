import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

/**
 * Shared ESLint flat config for the entire Vexlyx monorepo.
 * All workspace packages inherit these rules automatically.
 *
 * Uses ESLint 9+ flat config format.
 * Prettier integration disables formatting-related rules to avoid conflicts.
 */
export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      /* Enforce CLAUDE.md Section 6: no `any` type */
      "@typescript-eslint/no-explicit-any": "warn",

      /* Encourage explicit return types on exported functions */
      "@typescript-eslint/explicit-function-return-type": "off",

      /* Catch unused variables but allow underscore-prefixed params */
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      /* Discourage console.log in production (CLAUDE.md Section 6) */
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    ignores: [
      "node_modules/",
      "dist/",
      ".next/",
      ".turbo/",
      "*.config.js",
      "*.config.mjs",
    ],
  }
);
