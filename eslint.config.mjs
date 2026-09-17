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
        { type: "features", pattern: "src/features/**" },
        { type: "components", pattern: "src/components/**" },
        { type: "lib", pattern: "src/lib/**" },
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
                    types: {
                      anyOf: ["app", "features", "components", "lib"],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: "features" } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ["features", "components", "lib"] },
                  },
                },
              },
            },
            {
              from: { element: { type: "components" } },
              allow: {
                to: { element: { types: { anyOf: ["components"] } } },
              },
            },
            {
              from: { element: { type: "lib" } },
              allow: { to: { element: { types: { anyOf: ["lib"] } } } },
            },
            {
              from: { element: { type: "test" } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ["app", "features", "components", "lib", "test"],
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
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/env/server",
              message: "Reusable UI components cannot import server secrets.",
            },
          ],
          patterns: [
            {
              group: ["@/lib/db/**", "@/lib/integrations/**"],
              message:
                "Reusable UI components must receive server data through props or feature boundaries.",
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
