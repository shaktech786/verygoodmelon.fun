import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "scripts/**",
      "public/**",
    ],
  },
  {
    rules: {
      "react-hooks/exhaustive-deps": "warn",
      // React Compiler readiness rules (new in eslint-plugin-react-hooks 6+).
      // The compiler is not enabled here and the flagged game code predates
      // these rules, so surface them without blocking commits.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
  {
    // Seedpress replaces stock kits and icon sets (docs/design-system/PLAN.md §10.2). Warnings until
    // the last lucide and next/font/google imports are gone, then errors.
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.mjs"],
    rules: {
      "no-restricted-imports": ["warn", {
        paths: [
          { name: "lucide-react", message: "Use the seed stamps in components/seedpress/icons." },
          { name: "next/font/google", message: "Fonts are self-hosted from app/fonts with next/font/local." },
          { name: "class-variance-authority", message: "Use the components in components/seedpress." },
          { name: "daisyui", message: "Use the components in components/seedpress." },
          { name: "framer-motion", message: "Motion is CSS with the Seedpress motion tokens." },
          { name: "motion", message: "Motion is CSS with the Seedpress motion tokens." },
        ],
        patterns: [
          { group: ["@radix-ui/*", "@headlessui/*", "@mui/*", "@chakra-ui/*", "shadcn*", "motion/*"], message: "Use the components in components/seedpress." },
        ],
      }],
    },
  },
];

export default eslintConfig;
