import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

type Point = { calculatedAt: string; value: number };

interface Props {
  points: Point[];
  height?: number;
}

export default function TimeSeriesChart({ points, height = 160 }: Props) {
  if (!points || points.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No data</div>;
  }

  const data = points.map((p) => ({ ts: new Date(p.calculatedAt).getTime(), value: Number(p.value) }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 12 }}>
          <CartesianGrid stroke="#0b1326" strokeDasharray="3 3" />
          <XAxis
            dataKey="ts"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) => new Date(Number(t)).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
          />
          <YAxis
            dataKey="value"
            tickFormatter={(v) => Number(v).toLocaleString()}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
          />
          <Tooltip labelFormatter={(label) => new Date(Number(label)).toLocaleString()} formatter={(value: any) => [Number(value).toLocaleString(), 'Exposure']} />
          <Line type="monotone" dataKey="value" stroke="#4b8eff" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
