import { createJestConfig } from '../../jest.preset.mjs';

export default createJestConfig({
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
});
