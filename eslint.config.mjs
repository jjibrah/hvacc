import { defineConfig, globalIgnores } from "eslint/config";
import boundaries from "eslint-plugin-boundaries";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**" },
        { type: "modules", pattern: "src/modules/**" },
        { type: "shared", pattern: "src/shared/**" },
        { type: "test", pattern: "src/test/**" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            {
              from: { element: { type: "app" } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ["app", "modules", "shared"] },
                  },
                },
              },
            },
            {
              from: { element: { type: "modules" } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ["modules", "shared"] },
                  },
                },
              },
            },
            {
              from: { element: { type: "shared" } },
              allow: {
                to: { element: { types: { anyOf: ["shared"] } } },
              },
            },
            {
              from: { element: { type: "test" } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ["app", "modules", "shared", "test"],
                    },
                  },
                },
              },
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/shared/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/shared/config/env/server",
              message: "Reusable UI components cannot import server secrets.",
            },
          ],
          patterns: [
            {
              group: ["@/modules/database/**", "@/modules/integrations/**"],
              message:
                "Reusable UI components must receive server data through props or module boundaries.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
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
