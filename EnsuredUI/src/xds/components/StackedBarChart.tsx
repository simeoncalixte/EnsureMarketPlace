import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface BarSeries {
  key: string;
  label: string;
  color: string;
}

interface Props {
  data: Record<string, unknown>[];
  xKey: string;
  bars: BarSeries[];
  xFormatter?: (v: unknown) => string;
  yFormatter?: (v: number) => string;
  stacked?: boolean;
  height?: number;
}

const TOOLTIP_STYLE = {
  background: '#131b2e',
  border: '1px solid #222a3d',
  borderRadius: 4,
  fontSize: 11,
};

export default function StackedBarChart({
  data,
  xKey,
  bars,
  xFormatter,
  yFormatter,
  stacked = true,
  height = 200,
}: Props) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        No data
      </div>
    );
  }

  const yFmt = yFormatter ?? ((v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  });

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 12 }} barCategoryGap="30%">
          <CartesianGrid stroke="#0f1724" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={xKey}
            tickFormatter={xFormatter ?? ((v) => String(v))}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={yFmt}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value: unknown, name: string) => {
              const b = bars.find((b) => b.key === name);
              return [yFmt(Number(value)), b?.label ?? name];
            }}
          />
          <Legend iconType="square" wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 4 }} />
          {bars.map((b) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              name={b.label}
              fill={b.color}
              stackId={stacked ? 'stack' : undefined}
              radius={stacked ? undefined : [3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
