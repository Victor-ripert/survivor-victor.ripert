/**
 * Shared Jest setup. Every package runs ESM TypeScript through ts-jest with
 * the same module resolution, so only the differences (environment, setup
 * files, worker count) live in the package configs.
 */

/** @param {import('jest').Config} overrides */
export const createJestConfig = (overrides = {}) => ({
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  // Source imports carry the `.js` suffix ESM requires; Jest resolves them
  // back to the `.ts` files on disk.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  ...overrides,
});
