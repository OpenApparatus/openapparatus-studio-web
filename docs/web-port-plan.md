# Web port — development plan

The OpenApparatus Studio web port is structured to **replace** the Avalonia desktop app at parity, not coexist with it. After parity, desktop goes into maintenance freeze, the last release is tagged, and the desktop repo is archived. Single codebase to maintain going forward.

## Status

- **Spike landed** (PR #1, merged): `OpenApparatus.Core` compiles to WebAssembly, runs in-browser via one `[JSExport]` entrypoint. Bundle ~1.0 MB brotli, warm-cache generate ~7 ms.
- **Desktop is in feature freeze** — only critical bug fixes during the port. No new features until web parity.

## Architecture target

| Repo | Role today | Role after port |
|---|---|---|
| `openapparatus-core` | Generators, assigners, environments, geometry primitives | Same — plus a small `OpenApparatus.IO` lib (exporters + ProjectIO) extracted from Studio |
| `openapparatus-studio` (Avalonia) | The whole app | Frozen → archived after parity |
| `openapparatus-studio-web` (React) | WASM spike | Becomes production at `studio.extendedresearch.ca` on AWS Amplify |

**No shared editor library.** Earlier plans contemplated extracting the desktop's `MainWindowViewModel` into a UI-agnostic shared lib that both clients consume. Rejected: that's extra work to keep a dying client alive. Instead, the web app is built fresh in React idioms, reading the desktop VM as a spec rather than translating it line-for-line. Most of the VM's 3,053 lines are MVVM glue (`[ObservableProperty]`, command bindings, computed UI state) that React replaces with hooks/state, not a 1:1 port.

## Chunk plan

Each chunk is a usable artifact. No long "complete the backend, then start the frontend" phase.

### Chunk 1 — Exporter + ProjectIO extraction (Core repo)
- Move `ObjExporter`, `GltfExporter`, `JsonExporter`, `ProjectIO` from `OpenApparatus.Studio/Services/` into a new `OpenApparatus.IO` library inside the `openapparatus-core` repo.
- Update `OpenApparatus.Studio` to consume the lib via `ProjectReference`. Existing tests still pass.
- Update `OpenApparatus.Wasm` (in `openapparatus-studio-web`) to reference the lib so it can call exporters.

**Deliverable:** Exporters live in one place, callable from both clients. Desktop unchanged in behavior. Web project compiles with exporter access available via `[JSExport]` (wiring in Chunk 2).

**Repos touched:** `openapparatus-core`, `openapparatus-studio`, `openapparatus-studio-web`.

### Chunk 2 — Generator playground (web)
- Full parameter panel matching desktop: grid W×L, tile size, rectangle count, seed (with shuffle), wall thickness/height, door width/height
- Polished 2D SVG plan view: rooms with labels, doorway *openings* (offset rectangles, not full adjacency edges), pan/zoom
- Three export buttons: OBJ, glTF, JSON — each downloads the file via `Uint8Array` interop
- Project save/load via File System Access API (with download/upload fallback)
- Stats footer: room counts, bounds, generation time

**Deliverable:** Web app is useful for "research community generates and exports plans." Could soft-launch to a small test audience already.

### Chunk 3 — 3D viewport
- Three.js + `@react-three/fiber` scene
- Walls, floors, ceilings extruded from the plan
- Materials applied (solid colors per room/region — match desktop defaults)
- Top-down + iso camera modes with yaw / pitch / distance / pivot, matching desktop math
- Side-by-side reference rendering against desktop for one fixed seed (visual regression baseline)

**Deliverable:** Web matches desktop's 3D output for the same seed and parameters. **Single biggest chunk of new work** — Avalonia's 3D doesn't translate, it gets rebuilt.

### Chunk 4 — Editor modes
- Layout mode: paint room IDs onto cells, drag-to-rectangle for 2×N rooms, room type assignment
- Adjacency mode: click a shared edge to cycle Closed → Doorway → Open
- Openings mode: drag opening handles along an edge to set offset, resize for width, sill-height slider, hinge / swing toggles
- Selection state, hover state, multi-select
- Undo / redo stack (lives in TS, not extracted from C#)
- Mode switcher UI

**Deliverable:** Web app is a full editor.

### Chunk 5 — Polish
- Theme variants (light / dark)
- Keyboard shortcuts mirroring desktop, with deliberate handling of browser-default collisions (Cmd+S, Cmd+O, Cmd+Z)
- Command palette
- Shortcut overlay
- Material / color editing (default colors, per-room overrides, random wall colors)
- Toast notifications

**Deliverable:** UX-feel parity with desktop.

### Chunk 6 — Hosting and desktop deprecation
- `amplify.yml` with Node 22 + .NET 10 install + `wasm-tools` workload + sibling Core clone
- Custom domain wired through Amplify (`studio.extendedresearch.ca`)
- Public launch
- Desktop README rewritten to point to web app
- Desktop repo archived (last release tagged, archive flag set)

**Deliverable:** Web is production. Desktop is frozen and discoverably deprecated.

## Effort

The desktop app shipped in 2 days. Industry-average estimates don't anchor to that velocity. Realistic estimate at the user's shipping cadence: **plausibly under two weeks of focused work, possibly under one**. The 3D viewport (Chunk 3) is the single biggest chunk; everything else is translation. Pace is set by the user, not promised here.

## Risks worth tracking

1. **3D parity drift.** Avalonia's 3D rendering and Three.js are different engines; lighting, camera math, and material handling can diverge. Mitigation: side-by-side renders against a fixed seed in Chunk 3; treat as visual-regression baseline.
2. **Performance on large grids.** Spike validated 33 rooms / 7 ms warm-cache. Need a quick benchmark at 500–1000 rooms in Chunk 2 before assuming the JSON-string interop scales.
3. **File dialog / OS-integration mismatch.** Desktop has native dialogs; web has File System Access API + downloads. Don't try to match exactly — adopt browser idioms.
4. **Keyboard shortcut collisions.** Cmd+S, Cmd+O, Cmd+Z, Cmd+W collide with browser defaults. Deliberate policy in Chunk 5.
5. **Desktop drift during port.** Already mitigated by feature freeze.

## Out of scope

- Multi-user collaboration / cloud sync — different product
- Mobile / touch UX — desktop never had it; web inherits no requirement
- Plugins / extensibility — neither has it
- i18n — neither has it
