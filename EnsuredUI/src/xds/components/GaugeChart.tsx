import React from 'react';
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import { colors } from '../colors';

interface Threshold {
  /** Upper bound for this color band (inclusive) */
  upTo: number;
  color: string;
}

interface Props {
  /** The current value to display */
  value: number;
  /** Max value the gauge represents (default 3) */
  max?: number;
  /** Label shown beneath the numeric value */
  label?: string;
  /** Sub-label / description */
  sublabel?: string;
  height?: number;
  thresholds?: Threshold[];
}

const DEFAULT_THRESHOLDS: Threshold[] = [
  { upTo: 1.0, color: colors.dataViz.red },   // danger – below minimum solvency
  { upTo: 1.5, color: colors.dataViz.orange },   // warning
  { upTo: 2.5, color: colors.dataViz.green },   // healthy
  { upTo: Infinity, color: colors.dataViz.blue }, // strong
];

function pickColor(value: number, thresholds: Threshold[]): string {
  for (const t of thresholds) {
    if (value <= t.upTo) return t.color;
  }
  return thresholds[thresholds.length - 1]?.color ?? colors.dataViz.blue;
}

export default function GaugeChart({
  value,
  max = 3,
  label = 'Solvency Ratio',
  sublabel,
  height = 180,
  thresholds = DEFAULT_THRESHOLDS,
}: Props) {
  const clampedPct = Math.min(100, Math.max(0, (value / max) * 100));
  const color = pickColor(value, thresholds);

  return (
    <div style={{ width: '100%', height, position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="62%"
          outerRadius="92%"
          data={[{ value: clampedPct, fill: color }]}
          startAngle={200}
          endAngle={-20}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            dataKey="value"
            cornerRadius={6}
            background={{ fill: colors.surfacePanel }}
          />
        </RadialBarChart>
      </ResponsiveContainer>

      {/* Centred overlay showing the numeric value */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          paddingTop: '12%',
        }}
      >
        <span style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>
          {value.toFixed(2)}x
        </span>
        {label && (
          <span style={{ fontSize: 11, color: colors.neutral[400], marginTop: 4 }}>{label}</span>
        )}
        {sublabel && (
          <span style={{ fontSize: 10, color: colors.neutral[500], marginTop: 2 }}>{sublabel}</span>
        )}
      </div>
    </div>
  );
}
