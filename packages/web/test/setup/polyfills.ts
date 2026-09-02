// `jest-environment-jsdom` doesn't provide `TextEncoder`/`TextDecoder` —
// jsdom itself never implemented them, and Jest stopped polyfilling them
// itself a few versions back. `react-router-dom` needs them just to be
// imported, so without this, any test that imports it (anything rendering
// a `<Link>`, like `ProfileCard`) fails before a single assertion runs.
// Runs via `setupFiles` (before the test framework, and before the test
// file's own imports) rather than `setupFilesAfterEnv`, since the failure
// happens at module-evaluation time, not inside a test.
import { TextDecoder, TextEncoder } from 'node:util';

if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}
