# OpenApparatus Studio (Web)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Browser-based version of [OpenApparatus Studio](https://github.com/OpenApparatus/studio) — author, preview, and export OpenApparatus floor plans without installing anything.

The desktop app (Avalonia / .NET 8) remains the reference implementation. This repo is a parallel front-end that runs entirely in the browser, sharing the same generation core via WebAssembly.

## Status

**Early scaffolding.** Vite + React + TypeScript shell only — no floor-plan UI yet. The next milestone is compiling `OpenApparatus.Core` to WASM and proving end-to-end generation in the browser.

## Architecture (planned)

- **UI** — React + TypeScript, Vite for the build toolchain
- **2D preview** — SVG or `<canvas>`
- **3D preview** — [Three.js](https://threejs.org/) via [`@react-three/fiber`](https://docs.pmnd.rs/react-three-fiber)
- **Generation + export** — [`OpenApparatus.Core`](https://github.com/OpenApparatus/core) compiled to WebAssembly via .NET's `wasmbrowser` workload, called from a thin TS interop wrapper
- **Hosting** — static site (Cloudflare Pages), eventually under `extendedresearch.ca`

The Core dependency mirrors how the desktop app consumes it: relative `ProjectReference` to a sibling `openapparatus-core` clone, with an MSBuild override for non-standard layouts. When Core ships on NuGet, the local clone requirement goes away.

## Development

Requires Node 22+ (see `.nvmrc`).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run preview  # serve the production bundle locally
```

## Repo layout

```
openapparatus-studio-web/    ← this repo
openapparatus-studio/        ← desktop app (sibling clone)
openapparatus-core/          ← shared generation core (sibling clone)
```

## License

MIT — see [LICENSE](LICENSE).
