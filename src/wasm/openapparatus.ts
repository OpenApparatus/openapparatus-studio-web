// src/wasm/openapparatus.ts
//
// Thin wrapper around the .NET WASM runtime. The runtime ships the dotnet.js
// loader at /_framework/dotnet.js (Vite serves it out of public/_framework/),
// which is dynamically imported on first call so the ~1 MB brotli payload is
// only paid for when the user actually generates a plan.

export interface RoomDto {
  id: number;
  type: string;
  /** South-west corner X (world units). */
  x: number;
  /** South-west corner Z (world units). */
  z: number;
  /** Width along +X. */
  w: number;
  /** Depth along +Z. */
  d: number;
}

export interface DoorDto {
  roomA: number;
  /** -1 when the doorway is to outside. */
  roomB: number;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

export interface FloorPlan {
  seed: number;
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  rooms: RoomDto[];
  doors: DoorDto[];
}

export interface GenerateParams {
  seed: number;
  floorWidthCells: number;
  floorLengthCells: number;
  rectangleRoomCount: number;
  tileSize: number;
}

interface InteropExports {
  OpenApparatus: {
    Wasm: {
      Interop: {
        GenerateRoomsJson(
          seed: number,
          floorWidthCells: number,
          floorLengthCells: number,
          rectangleRoomCount: number,
          tileSize: number,
        ): string;
      };
    };
  };
}

interface DotnetApi {
  getConfig(): { mainAssemblyName?: string };
  getAssemblyExports(name: string): Promise<InteropExports>;
}

let runtimePromise: Promise<DotnetApi> | null = null;

async function loadRuntime(): Promise<DotnetApi> {
  if (runtimePromise) return runtimePromise;
  runtimePromise = (async () => {
    // dotnet.js is served as a static asset out of public/_framework/ — Vite
    // does NOT index it as a module, and TS has no declarations for it. Use a
    // dynamic-string import + cast to bypass both.
    const url = '/_framework/dotnet.js';
    const mod = (await import(/* @vite-ignore */ url)) as { dotnet: { create(): Promise<DotnetApi> } };
    const { dotnet } = mod;
    const api = (await dotnet.create()) as DotnetApi;
    return api;
  })();
  return runtimePromise;
}

let exportsPromise: Promise<InteropExports['OpenApparatus']['Wasm']['Interop']> | null = null;

async function loadInterop() {
  if (exportsPromise) return exportsPromise;
  exportsPromise = (async () => {
    const api = await loadRuntime();
    const cfg = api.getConfig();
    const name = cfg.mainAssemblyName ?? 'OpenApparatus.Wasm';
    const all = await api.getAssemblyExports(name);
    return all.OpenApparatus.Wasm.Interop;
  })();
  return exportsPromise;
}

export async function generateFloorPlan(params: GenerateParams): Promise<FloorPlan> {
  const interop = await loadInterop();
  const json = interop.GenerateRoomsJson(
    params.seed,
    params.floorWidthCells,
    params.floorLengthCells,
    params.rectangleRoomCount,
    params.tileSize,
  );
  return JSON.parse(json) as FloorPlan;
}
