import pluginImport from "eslint-plugin-import";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default [
  {
    plugins: {
      import: pluginImport,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          pathGroups: [
            { pattern: "@/**", group: "internal", position: "before" },
            {
              pattern: "@/components/**",
              group: "internal",
              position: "before",
            },
            { pattern: "@/lib/**", group: "internal", position: "before" },
            { pattern: "@/hooks/**", group: "internal", position: "before" },
            { pattern: "@/types/**", group: "internal", position: "before" },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
          alphabetize: { order: "asc", caseInsensitive: true },
          "newlines-between": "always",
        },
      ],
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
];
