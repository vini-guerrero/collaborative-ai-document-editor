// ESLint flat config (ESM). Type-aware rules apply to TypeScript files only;
// plain JS config files are outside tsconfig and get the non-type-aware set.
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const FEATURE_DEEP_IMPORT_MESSAGE =
  "Import from the feature's index.ts, not its internals (T11). Example: @/features/<name>";
const ATLASKIT_MESSAGE =
  'No @atlaskit/* packages: use the vendored ADS tokens and custom components in src/design-system/ (S1, S8).';
const LUCIDE_MESSAGE = 'Use Icon from src/design-system (S6, S8).';
const TIPTAP_MESSAGE =
  '@tiptap/* is confined to src/features/editor (T1). Reach the editor through the feature index.ts.';

const featureDeepImportPattern = {
  group: ['@/features/*/*'],
  message: FEATURE_DEEP_IMPORT_MESSAGE,
};

const atlaskitPattern = {
  group: ['@atlaskit', '@atlaskit/**'],
  message: ATLASKIT_MESSAGE,
};

const lucidePattern = {
  group: ['lucide-react', 'lucide-react/**'],
  message: LUCIDE_MESSAGE,
};

const tiptapPattern = {
  group: ['@tiptap/*'],
  message: TIPTAP_MESSAGE,
};

// shared/ and server/ run without the web app: they may not reach into src/, by alias or
// by relative path (T11). Shared contracts flow the other way, through @shared/.
const SRC_BOUNDARY_MESSAGE =
  'shared/ and server/ must not import src/ (T11). Move the code into shared/ or import via @shared/.';

const srcBoundaryPattern = {
  group: ['@/**', '**/src', '**/src/**'],
  message: SRC_BOUNDARY_MESSAGE,
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

  // Import bans everywhere: no @atlaskit/* (S1, S8) and no deep feature imports (T11).
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

  // Each file matches exactly one block below, since a later block replaces the rule for the
  // files it matches. Outside the design system, Lucide is reached only through Icon (S6, S8),
  // and outside the editor, TipTap is reached only through the editor (T1).
  {
    files: ['**/*.{js,ts,tsx}'],
    ignores: ['src/design-system/**', 'src/features/editor/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [atlaskitPattern, featureDeepImportPattern, lucidePattern, tiptapPattern],
        },
      ],
    },
  },

  // The editor owns TipTap; it still reaches Lucide only through Icon.
  {
    files: ['src/features/editor/**/*.{js,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [atlaskitPattern, featureDeepImportPattern, lucidePattern],
        },
      ],
    },
  },

  // The design system owns Icon (so Lucide is allowed here) and must not import TipTap.
  {
    files: ['src/design-system/**/*.{js,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [atlaskitPattern, featureDeepImportPattern, tiptapPattern],
        },
      ],
    },
  },

  // Last block wins for these files: shared/ and server/ may not import src/ (T11). It
  // repeats the other bans, since this block replaces the rule for these files.
  {
    files: ['shared/**/*.{js,ts,tsx}', 'server/**/*.{js,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            atlaskitPattern,
            featureDeepImportPattern,
            lucidePattern,
            tiptapPattern,
            srcBoundaryPattern,
          ],
        },
      ],
    },
  },
);
