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
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
// recharts applies colors as SVG presentation attributes, which can't resolve
// `var()`; use the concrete-resolving palette (still re-reads on theme change).
import { rawColors as colors } from '../colors';

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
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.neutral[400] }}>
        No data
      </div>
    );
  }

  // Resolved per render so it follows the active theme.
  const tooltipStyle = {
    background: colors.surfacePanel,
    border: `1px solid ${colors.surfaceHigh}`,
    borderRadius: 4,
    fontSize: 11,
  };

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
          <CartesianGrid stroke={colors.surfaceLow} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={xKey}
            tickFormatter={xFormatter ?? ((v) => String(v))}
            tick={{ fill: colors.neutral[400], fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={yFmt}
            tick={{ fill: colors.neutral[400], fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: colors.neutral[400] }}
            formatter={(value: ValueType | undefined, name: NameType | undefined) => {
              const key = String(name ?? '');
              const b = bars.find((b) => b.key === key);
              return [yFmt(Number(value)), b?.label ?? key];
            }}
          />
          <Legend iconType="square" wrapperStyle={{ fontSize: 11, color: colors.neutral[400], paddingTop: 4 }} />
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
