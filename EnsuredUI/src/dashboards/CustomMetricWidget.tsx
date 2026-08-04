import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { colors } from '../xds/colors';
import MultiLineChart from '../xds/components/MultiLineChart';
import StackedBarChart from '../xds/components/StackedBarChart';
import { evaluateMetric } from './api';
import type { MetricDefinition, MetricFormat, MetricResult } from './metricTypes';

// Renders a user-defined metric against LIVE org-scoped data. The definition
// lives in the widget instance's settings; this component evaluates it via the
// server and draws a KPI, line, bar, or table per the chosen viz.

const Centered = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 60px;
  color: ${colors.onSurfaceVariant};
  font-size: 13px;
  text-align: center;
`;

const KpiValue = styled.div`
  font-size: 30px;
  font-weight: 700;
  color: ${colors.onSurface};
  padding: 12px 0;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  th,
  td {
    text-align: left;
    padding: 6px 8px;
    border-bottom: 1px solid ${colors.outlineVariant};
    color: ${colors.onSurface};
  }
  th {
    color: ${colors.onSurfaceVariant};
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.06em;
  }
  td:last-child,
  th:last-child {
    text-align: right;
  }
`;

function fmt(v: number | null, format: MetricFormat): string {
  if (v == null || !Number.isFinite(v)) return '—';
  if (format === 'percent') return `${(v * 100).toFixed(1)}%`;
  if (format === 'currency') {
    const a = Math.abs(v);
    if (a >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (a >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v);
}

export default function CustomMetricWidget({ definition }: { definition?: MetricDefinition }) {
  const [result, setResult] = useState<MetricResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Re-evaluate whenever the definition changes (stringified for a stable dep).
  const defKey = useMemo(() => (definition ? JSON.stringify(definition) : ''), [definition]);
  const ready = Boolean(definition && definition.terms && definition.terms.length > 0 && definition.formula);

  useEffect(() => {
    if (!ready || !definition) {
      setResult(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    evaluateMetric(definition)
      .then((r) => alive && setResult(r))
      .catch((e) => alive && setError(e?.body?.issues?.join('; ') || e?.message || 'Failed to evaluate'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defKey, ready]);

  if (!ready) return <Centered>Configure this metric — pick attributes and a formula.</Centered>;
  if (loading && !result) return <Centered>Loading…</Centered>;
  if (error) return <Centered>{error}</Centered>;
  if (!result) return <Centered>No data.</Centered>;

  if (result.kind === 'scalar') {
    return <KpiValue>{fmt(result.value, result.format)}</KpiValue>;
  }

  const data = result.points.map((p) => ({ group: p.group, value: p.value ?? 0 }));
  if (data.length === 0) return <Centered>No data for this metric yet.</Centered>;
  const yFormatter = (v: number) => fmt(v, result.format);

  if (result.viz === 'line') {
    return (
      <MultiLineChart
        data={data}
        xKey="group"
        series={[{ key: 'value', label: 'Value', color: colors.primary }]}
        yFormatter={yFormatter}
        height={200}
      />
    );
  }
  if (result.viz === 'bar') {
    return (
      <StackedBarChart
        data={data}
        xKey="group"
        bars={[{ key: 'value', label: 'Value', color: colors.primary }]}
        yFormatter={yFormatter}
        height={200}
      />
    );
  }
  // table
  return (
    <Table>
      <thead>
        <tr>
          <th>Group</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {result.points.map((p) => (
          <tr key={p.group}>
            <td>{p.group}</td>
            <td>{fmt(p.value, result.format)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
