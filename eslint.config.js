// ESLint flat config (ESM). Type-aware rules apply to TypeScript files only;
// plain JS config files are outside tsconfig and get the non-type-aware set.
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const FEATURE_DEEP_IMPORT_MESSAGE =
  "Import from the feature's index.ts, not its internals (T11). Example: @/features/<name>";
const ATLASKIT_MESSAGE =
  'Import UI only from src/design-system/ (S8). Never import @atlaskit/* directly.';
const ATLASKIT_ICON_LOGO_MESSAGE =
  '@atlaskit/icon and @atlaskit/logo are banned (S6, S8). Use Lucide or custom SVG.';

const featureDeepImportPattern = {
  group: ['@/features/*/*'],
  message: FEATURE_DEEP_IMPORT_MESSAGE,
};

const atlaskitPattern = {
  group: ['@atlaskit', '@atlaskit/**'],
  message: ATLASKIT_MESSAGE,
};

const atlaskitIconLogoPattern = {
  group: ['@atlaskit/icon', '@atlaskit/icon/**', '@atlaskit/logo', '@atlaskit/logo/**'],
  message: ATLASKIT_ICON_LOGO_MESSAGE,
};

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'mockups', 'docs', 'guidelines'],
  },

  js.configs.recommended,

  // Plain JS (this config file, etc.): no type information available.
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // Type-aware rules for TypeScript.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-shadow': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-console': 'error',
    },
  },

  // Browser globals for the web app.
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // Node globals for build config, server and scripts.
  {
    files: ['vite.config.ts', 'server/**/*.{ts,tsx,js}', 'scripts/**/*.{ts,tsx,js}'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // React hooks rules for the web app.
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
  },

  // Import bans. Everything except the design system may not import @atlaskit/*.
  {
    files: ['**/*.{js,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [atlaskitPattern, featureDeepImportPattern],
        },
      ],
    },
  },

  // The design system may import @atlaskit/*, but never the icon or logo packages.
  {
    files: ['src/design-system/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [atlaskitIconLogoPattern, featureDeepImportPattern],
        },
      ],
    },
  },
);
