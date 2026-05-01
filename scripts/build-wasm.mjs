// scripts/build-wasm.mjs
//
// Publishes the .NET WASM project and copies its _framework/ output into
// public/_framework/ so Vite's dev server and `vite build` both pick it up.
//
// Usage:
//   node scripts/build-wasm.mjs                # default: Release publish
//   node scripts/build-wasm.mjs --skip-publish # only copy existing dist (faster on rebuild)
//
// Env:
//   OPENAPPARATUS_CORE_REPO   Path to sibling openapparatus-core/ repo. Optional;
//                             the .csproj's default relative path works for a normal
//                             clone but breaks inside .claude/worktrees/. Set this
//                             explicitly when building from a worktree.

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const wasmProj = join(repoRoot, 'wasm', 'OpenApparatus.Wasm', 'OpenApparatus.Wasm.csproj');
const wasmDist = join(repoRoot, 'wasm', 'OpenApparatus.Wasm', 'dist');
const publishedFramework = join(wasmDist, 'wwwroot', '_framework');
const publicFramework = join(repoRoot, 'public', '_framework');

const skipPublish = process.argv.includes('--skip-publish');

if (!skipPublish) {
  const args = [
    'publish', wasmProj,
    '-c', 'Release',
    '-o', wasmDist,
    '--nologo',
  ];

  const corePath = process.env.OPENAPPARATUS_CORE_REPO;
  if (corePath) {
    // Trailing separator matters for MSBuild path concatenation.
    const normalized = corePath.endsWith('/') || corePath.endsWith('\\')
      ? corePath
      : corePath + '/';
    args.push(`-p:OpenApparatusCoreRepo=${normalized}`);
  }

  console.log('[build-wasm] dotnet', args.join(' '));
  execSync(`dotnet ${args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`, {
    stdio: 'inherit',
    cwd: repoRoot,
  });
}

if (!existsSync(publishedFramework)) {
  console.error(`[build-wasm] Expected published _framework at ${publishedFramework} — did publish succeed?`);
  process.exit(1);
}

// Replace public/_framework atomically-ish.
if (existsSync(publicFramework)) {
  rmSync(publicFramework, { recursive: true, force: true });
}
mkdirSync(dirname(publicFramework), { recursive: true });
cpSync(publishedFramework, publicFramework, { recursive: true });

console.log(`[build-wasm] Copied ${publishedFramework} -> ${publicFramework}`);
