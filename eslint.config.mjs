import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "**/node_modules/**",
      "**/.wrangler/**",
      "**/dist/**",
      "**/.output/**",
      "**/.svelte-kit/**",
      "**/public/**",
      "**/worker-configuration.d.ts"
    ]
  },
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { "prefer": "type-imports", "fixStyle": "separate-type-imports" }
      ]
    }
  }
);
