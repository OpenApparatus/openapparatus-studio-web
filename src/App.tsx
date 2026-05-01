import { useState } from 'react';
import { generateFloorPlan, type FloorPlan } from './wasm/openapparatus';

const DEFAULT_PARAMS = {
  floorWidthCells: 6,
  floorLengthCells: 6,
  rectangleRoomCount: 3,
  tileSize: 3.5,
};

const ROOM_FILL: Record<string, string> = {
  Square: '#dde6f0',
  Rectangle: '#cfd8e3',
};

function App() {
  const [seed, setSeed] = useState(42);
  const [plan, setPlan] = useState<FloorPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  async function onGenerate() {
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    try {
      const result = await generateFloorPlan({ seed, ...DEFAULT_PARAMS });
      setPlan(result);
      setElapsedMs(performance.now() - t0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 900 }}>
      <h1>OpenApparatus WASM spike</h1>
      <p style={{ color: '#555' }}>
        Click <em>Generate</em> to run the .NET grid-domino generator + spanning-tree
        passage assigner inside the browser. First click also downloads the runtime
        (~1&nbsp;MB brotli).
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '16px 0' }}>
        <label>
          Seed:{' '}
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(parseInt(e.target.value, 10) || 0)}
            style={{ width: 80 }}
          />
        </label>
        <button onClick={onGenerate} disabled={loading}>
          {loading ? 'Generating…' : 'Generate'}
        </button>
        {elapsedMs !== null && (
          <span style={{ color: '#555' }}>Last call: {elapsedMs.toFixed(1)} ms</span>
        )}
      </div>

      {error && (
        <pre style={{ color: '#a00', whiteSpace: 'pre-wrap' }}>Error: {error}</pre>
      )}

      {plan && <FloorPlanSvg plan={plan} />}

      {plan && (
        <details style={{ marginTop: 16 }}>
          <summary>Plan stats</summary>
          <ul>
            <li>Seed: {plan.seed}</li>
            <li>Rooms: {plan.rooms.length}</li>
            <li>Doors: {plan.doors.length}</li>
            <li>
              Bounds: ({plan.minX.toFixed(1)}, {plan.minZ.toFixed(1)}) → (
              {plan.maxX.toFixed(1)}, {plan.maxZ.toFixed(1)})
            </li>
          </ul>
        </details>
      )}
    </main>
  );
}

function FloorPlanSvg({ plan }: { plan: FloorPlan }) {
  const pad = 1;
  const minX = plan.minX - pad;
  const minZ = plan.minZ - pad;
  const w = plan.maxX - plan.minX + pad * 2;
  const h = plan.maxZ - plan.minZ + pad * 2;
  // SVG y grows down; flip Z so +Z renders up.
  return (
    <svg
      viewBox={`${minX} ${minZ} ${w} ${h}`}
      style={{
        width: '100%',
        maxWidth: 600,
        border: '1px solid #ddd',
        background: '#fafafa',
      }}
      preserveAspectRatio="xMidYMid meet"
    >
      <g transform={`translate(0 ${2 * minZ + h}) scale(1 -1)`}>
        {plan.rooms.map((r) => (
          <g key={r.id}>
            <rect
              x={r.x}
              y={r.z}
              width={r.w}
              height={r.d}
              fill={ROOM_FILL[r.type] ?? '#eee'}
              stroke="#333"
              strokeWidth={0.05}
            />
            <text
              x={r.x + r.w / 2}
              y={r.z + r.d / 2}
              fontSize={0.6}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#333"
              transform={`scale(1 -1) translate(0 ${-2 * (r.z + r.d / 2)})`}
            >
              {r.id}
            </text>
          </g>
        ))}
        {plan.doors.map((d, i) => (
          <line
            key={i}
            x1={d.x1}
            y1={d.z1}
            x2={d.x2}
            y2={d.z2}
            stroke="#c33"
            strokeWidth={0.2}
            strokeLinecap="round"
          />
        ))}
      </g>
    </svg>
  );
}

export default App;
