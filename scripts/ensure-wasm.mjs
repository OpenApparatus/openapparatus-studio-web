// scripts/ensure-wasm.mjs
//
// Pre-dev hook: run a full WASM build only if public/_framework is missing.
// On a fresh clone or after `git clean`, this triggers the first publish.
// On warm runs it's a no-op so `npm run dev` stays fast.

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const publicFramework = resolve(repoRoot, 'public', '_framework');

if (existsSync(publicFramework)) {
  console.log('[ensure-wasm] public/_framework exists — skipping. Run `npm run build:wasm` to refresh.');
  process.exit(0);
}

console.log('[ensure-wasm] public/_framework missing — running full WASM build...');
execSync('node scripts/build-wasm.mjs', { stdio: 'inherit', cwd: repoRoot });
