import { ignores, typescript } from '../../eslint.base.mjs';

export default [
  ignores,
  typescript({
    files: ['src/**/*.ts'],
    globals: { process: 'readonly', console: 'readonly' },
  }),
];
