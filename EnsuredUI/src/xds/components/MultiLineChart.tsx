import React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  format?: (v: number) => string;
  dashed?: boolean;
}

interface Props {
  data: Record<string, unknown>[];
  xKey: string;
  series: LineSeries[];
  xFormatter?: (v: unknown) => string;
  yFormatter?: (v: number) => string;
  /** Draw a horizontal reference line at this Y value (e.g. 1.0 = 100% combined ratio) */
  refLine?: number;
  refLineLabel?: string;
  height?: number;
}

const TOOLTIP_STYLE = {
  background: '#131b2e',
  border: '1px solid #222a3d',
  borderRadius: 4,
  fontSize: 11,
};

export default function MultiLineChart({
  data,
  xKey,
  series,
  xFormatter,
  yFormatter,
  refLine,
  refLineLabel,
  height = 200,
}: Props) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        No data
      </div>
    );
  }

  const yFmt = yFormatter ?? ((v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 12 }}>
          <CartesianGrid stroke="#0f1724" strokeDasharray="3 3" />
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
            labelFormatter={xFormatter ? (v) => xFormatter(v) : undefined}
            formatter={(value: unknown, name: string) => {
              const s = series.find((s) => s.key === name);
              const fmt = s?.format ?? yFmt;
              return [fmt(Number(value)), s?.label ?? name];
            }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 4 }} />
          {refLine !== undefined && (
            <ReferenceLine
              y={refLine}
              stroke="#ef4444"
              strokeDasharray="5 3"
              label={{ value: refLineLabel ?? String(refLine), fill: '#ef4444', fontSize: 10 }}
            />
          )}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? '6 3' : undefined}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
