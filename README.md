# OpenApparatus Studio (Web)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Browser-based version of [OpenApparatus Studio](https://github.com/OpenApparatus/studio) — author, preview, and export OpenApparatus floor plans without installing anything.

The desktop app (Avalonia / .NET 8) remains the reference implementation. This repo is a parallel front-end that runs entirely in the browser, sharing the same generation core via WebAssembly.

## Status

**Feasibility spike landed.** `OpenApparatus.Core` compiles to WebAssembly and drives a minimal "Generate" page in the browser end-to-end. No editor UI yet, no exporters, no 3D preview. Next milestones: extracting `ObjExporter` / `GltfExporter` / `JsonExporter` / `ProjectIO` from the desktop Studio assembly into a shared library, then a viewer-quality 2D/3D preview.

### Spike measurements (Release publish, .NET 10, 6×6 grid + 3 rectangles)

| Metric | Value |
|---|---|
| Bundle uncompressed | 3.2 MB |
| Bundle gzipped | 1.2 MB |
| Bundle brotli (Cloudflare default) | ~1.0 MB |
| Cold load + first generate (local serve) | ~105 ms |
| Warm-cache generate (mean of 5) | ~7 ms |
| Rooms × doors generated | 33 × 33 (32 spanning-tree + 1 outer entrance) |

The biggest single asset is `dotnet.native.wasm` (~370 KB brotli); `System.Private.CoreLib` and `System.Text.Json` follow at ~320 KB and ~47 KB. The JSON-over-string interop pattern (see below) costs the `System.Text.Json` chunk; if it ever matters we can swap to typed-array marshalling.

## Architecture (planned)

- **UI** — React + TypeScript, Vite for the build toolchain
- **2D preview** — SVG or `<canvas>`
- **3D preview** — [Three.js](https://threejs.org/) via [`@react-three/fiber`](https://docs.pmnd.rs/react-three-fiber)
- **Generation + export** — [`OpenApparatus.Core`](https://github.com/OpenApparatus/core) compiled to WebAssembly via .NET's `wasmbrowser` workload, called from a thin TS interop wrapper
- **Hosting** — static site (Cloudflare Pages), eventually under `extendedresearch.ca`

The Core dependency mirrors how the desktop app consumes it: relative `ProjectReference` to a sibling `openapparatus-core` clone, with an MSBuild override for non-standard layouts. When Core ships on NuGet, the local clone requirement goes away.

## Development

Requires Node 22+ (see `.nvmrc`), .NET 10 SDK, and the `wasm-tools` workload (`dotnet workload install wasm-tools`).

```bash
npm install
npm run build:wasm   # publish .NET → wasm/.../dist + copy into public/_framework/
npm run dev          # http://localhost:5173
npm run build        # production bundle in dist/ (auto-runs build:wasm first)
npm run preview      # serve the production bundle locally
```

The `predev` hook runs `build:wasm` only if `public/_framework/` is missing — change C# code? rerun `npm run build:wasm` manually. The TS/React side hot-reloads as usual.

If `OpenApparatus.Core` lives somewhere other than the sibling-clone path
(e.g. when working inside a worktree), point the build at it:

```bash
OPENAPPARATUS_CORE_REPO=/path/to/openapparatus-core npm run build:wasm
```

## Interop pattern (notes from the spike)

`OpenApparatus.Wasm/Interop.cs` exposes a single `[JSExport]` static method that returns a JSON string. Object graphs from Core (`MultiRoomEnvironment` → `Room` → `IRoomShape`, `Adjacency` → `Passage` polymorphism) cross the JS/WASM boundary as a flat DTO serialized with `System.Text.Json` source-gen — no attempt to marshal the live CLR objects across. This sidesteps `[JSExport]`'s limits on arbitrary reference types and keeps the surface trivially evolvable.

## Repo layout

```
openapparatus-studio-web/    ← this repo
openapparatus-studio/        ← desktop app (sibling clone)
openapparatus-core/          ← shared generation core (sibling clone)
```

## License

MIT — see [LICENSE](LICENSE).
