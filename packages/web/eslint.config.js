import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import { ignores, typescript } from '../../eslint.base.mjs';

const files = ['src/**/*.{ts,tsx}'];

export default [
  ignores,
  typescript({
    files,
    globals: { window: 'readonly', document: 'readonly', console: 'readonly' },
    ecmaFeatures: { jsx: true },
  }),
  {
    files,
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      // The JSX transform makes the React import unnecessary.
      'react/react-in-jsx-scope': 'off',
    },
  },
];
