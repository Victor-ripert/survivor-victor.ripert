import { createJestConfig } from '../../jest.preset.mjs';

export default createJestConfig({
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  setupFiles: ['<rootDir>/test/setup/polyfills.ts'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
});
