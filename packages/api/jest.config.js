/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  setupFiles: ['<rootDir>/test/env.setup.ts'],
  // These are integration tests against one real shared database, not
  // isolated unit tests — Jest's default per-file parallel workers let two
  // files mutate global tables (e.g. CertificationQuestion.isActive) at the
  // same time, which is a genuine race, not flakiness to tolerate.
  maxWorkers: 1,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
  },
};
