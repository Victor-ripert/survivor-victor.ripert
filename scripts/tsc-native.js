#!/usr/bin/env node
'use strict';

// TypeScript 7 ships without the programmatic compiler API that ts-jest and
// typescript-eslint need, so `typescript` is aliased to the 6.x-compatible
// `@typescript/typescript6` package for those tools, and the real native 7.x
// compiler lives under the `typescript-native` alias instead (see
// https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).
// That leaves the plain `tsc` bin ambiguous in this workspace (a transitive
// dependency of the 6.x compat package also ships a `tsc` bin and can win the
// node_modules/.bin symlink), so build scripts call this helper instead of
// bare `tsc` to invoke the native compiler unambiguously.
//
// `typescript-native`'s package.json `exports` map doesn't expose ./bin/tsc to
// require.resolve, but package.json itself is always resolvable, so derive the
// bin path from there.

const path = require('path');
const { spawnSync } = require('child_process');

const pkgPath = require.resolve('typescript-native/package.json');
const tscPath = path.join(path.dirname(pkgPath), 'bin', 'tsc');

const result = spawnSync(process.execPath, [tscPath, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(result.status ?? 1);
