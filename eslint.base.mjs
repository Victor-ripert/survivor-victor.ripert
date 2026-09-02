import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

/** Build output and dependencies are never linted. */
export const ignores = {
  ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
};

/**
 * The TypeScript rules every package shares. Packages add their own globals
 * and framework plugins on top.
 *
 * @param {{ files: string[], globals?: Record<string, string>, ecmaFeatures?: object }} options
 */
export const typescript = ({ files, globals = {}, ecmaFeatures = {} }) => ({
  files,
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ecmaFeatures,
    },
    globals,
  },
  plugins: {
    '@typescript-eslint': tsPlugin,
  },
  rules: {
    ...tsPlugin.configs.recommended.rules,
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
});
