import { createJestConfig } from '../../jest.preset.mjs';

export default createJestConfig({
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  // `createJestConfig`'s own `moduleNameMapper` (the `.js` -> extensionless
  // resolution every package needs) isn't inherited here — passing this key
  // at all replaces it rather than merging with it, so both rules have to
  // live together in this one object.
  moduleNameMapper: {
    '\\.module\\.css$': '<rootDir>/test/mocks/styleMock.js',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFiles: ['<rootDir>/test/setup/polyfills.ts'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
});
