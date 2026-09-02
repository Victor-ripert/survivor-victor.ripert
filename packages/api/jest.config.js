import { createJestConfig } from '../../jest.preset.mjs';

export default createJestConfig({
  setupFiles: ['<rootDir>/test/env.setup.ts'],
  // Part of this suite runs integration tests against one real shared
  // database, not isolated unit tests — Jest's default per-file parallel
  // workers let two files mutate global tables (e.g.
  // CertificationQuestion.isActive) at the same time, which is a genuine
  // race, not flakiness to tolerate.
  maxWorkers: 1,
});
