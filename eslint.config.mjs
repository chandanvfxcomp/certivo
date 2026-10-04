// Flat ESLint config (ESLint 9 / Next.js 15).
//
// Enforces two Hard Rules from CLAUDE.md directly, in addition to the
// standard Next.js + TypeScript rule sets:
//   - Hard Rule #8: never use dangerouslySetInnerHTML.
//   - "Zero `any`, zero `@ts-ignore`" from the Non-negotiable technical
//     patterns section.
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: { "@typescript-eslint": tseslint },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": true, "ts-expect-error": true, "ts-nocheck": true },
      ],
      // Unused args/vars prefixed "_" are intentional (e.g. guard.ts's
      // P1/P3 stubs, which take the real parameter shape now so callers
      // don't change later, but don't use it yet).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "react/no-danger": "error",
      "react/no-danger-with-children": "error",
      // Route all logging through src/lib/logger.ts (structured, one
      // place to ever add redaction later) instead of raw console.*
      // scattered through the app. logger.ts itself is the one place
      // console.* is actually called — its `eslint-disable-next-line
      // no-console` comments are what this rule makes meaningful.
      "no-console": "error",
    },
  },
  {
    // One-off CLI scripts run via `tsx` (e.g. db:seed), never bundled into
    // the app — console output here IS the intended UX (progress/result
    // lines an operator reads in their terminal), not app logging, so
    // logger.ts's "route everything through here" rule doesn't apply.
    files: ["scripts/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "coverage/**",
      "prisma/migrations/**",
    ],
  },
];

export default config;
