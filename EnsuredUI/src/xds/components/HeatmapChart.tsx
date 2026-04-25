import React, { useMemo } from 'react';

export interface HeatCell {
  /** Column axis value (e.g. perilType) */
  x: string;
  /** Row axis value (e.g. region) */
  y: string;
  value: number;
}

interface Props {
  cells: HeatCell[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  formatValue?: (v: number) => string;
  /** Low color (hex, default dark blue) */
  colorLow?: string;
  /** High color (hex, default brand blue) */
  colorHigh?: string;
  height?: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function lerpColor(low: string, high: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(low);
  const [r2, g2, b2] = hexToRgb(high);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

function defaultFmt(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

const COL_W = 88;
const ROW_H = 40;
const LABEL_W = 130;
const HEADER_H = 44;

export default function HeatmapChart({
  cells,
  xAxisLabel,
  yAxisLabel,
  formatValue,
  colorLow = '#1a2744',
  colorHigh = '#4b8eff',
  height,
}: Props) {
  if (!cells || cells.length === 0) {
    return (
      <div
        style={{
          height: height ?? 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
        }}
      >
        No data
      </div>
    );
  }

  const xs = useMemo(() => [...new Set(cells.map((c) => c.x))].sort(), [cells]);
  const ys = useMemo(() => [...new Set(cells.map((c) => c.y))].sort(), [cells]);
  const maxVal = useMemo(() => Math.max(...cells.map((c) => c.value)), [cells]);

  const cellMap = useMemo(() => {
    const m: Record<string, number> = {};
    cells.forEach((c) => {
      m[`${c.x}|${c.y}`] = c.value;
    });
    return m;
  }, [cells]);

  const fmt = formatValue ?? defaultFmt;
  const svgW = LABEL_W + xs.length * COL_W;
  const svgH = HEADER_H + ys.length * ROW_H + (xAxisLabel ? 24 : 0);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg width={svgW} height={svgH} style={{ fontFamily: 'inherit', display: 'block' }}>
        {/* Y-axis label */}
        {yAxisLabel && (
          <text
            x={8}
            y={HEADER_H + (ys.length * ROW_H) / 2}
            textAnchor="middle"
            fill="#64748b"
            fontSize={10}
            transform={`rotate(-90, 8, ${HEADER_H + (ys.length * ROW_H) / 2})`}
          >
            {yAxisLabel}
          </text>
        )}

        {/* Column headers */}
        {xs.map((x, xi) => (
          <text
            key={x}
            x={LABEL_W + xi * COL_W + COL_W / 2}
            y={HEADER_H - 10}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={10}
          >
            {x.length > 11 ? `${x.slice(0, 10)}…` : x}
          </text>
        ))}

        {/* X-axis label */}
        {xAxisLabel && (
          <text
            x={LABEL_W + (xs.length * COL_W) / 2}
            y={svgH - 4}
            textAnchor="middle"
            fill="#64748b"
            fontSize={10}
          >
            {xAxisLabel}
          </text>
        )}

        {/* Row labels + cells */}
        {ys.map((y, yi) => (
          <g key={y}>
            <text
              x={LABEL_W - 8}
              y={HEADER_H + yi * ROW_H + ROW_H / 2 + 4}
              textAnchor="end"
              fill="#94a3b8"
              fontSize={10}
            >
              {y.length > 15 ? `${y.slice(0, 14)}…` : y}
            </text>

            {xs.map((x, xi) => {
              const val = cellMap[`${x}|${y}`] ?? 0;
              const t = maxVal > 0 ? val / maxVal : 0;
              const bg = t === 0 ? '#0f1724' : lerpColor(colorLow, colorHigh, t);
              const textDark = t < 0.5;

              return (
                <g key={x}>
                  <rect
                    x={LABEL_W + xi * COL_W + 2}
                    y={HEADER_H + yi * ROW_H + 2}
                    width={COL_W - 4}
                    height={ROW_H - 4}
                    fill={bg}
                    rx={4}
                  />
                  {val > 0 && (
                    <text
                      x={LABEL_W + xi * COL_W + COL_W / 2}
                      y={HEADER_H + yi * ROW_H + ROW_H / 2 + 4}
                      textAnchor="middle"
                      fill={textDark ? '#94a3b8' : '#dae2fd'}
                      fontSize={9}
                    >
                      {fmt(val)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}
