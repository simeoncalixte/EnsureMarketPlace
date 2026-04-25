import React, { useEffect, useState } from 'react'
import { Link } from 'react-router'
import getApiBase from '../../lib/api'
import TimeSeriesChart from '../../xds/components/TimeSeriesChart'
import MultiLineChart from '../../xds/components/MultiLineChart'
import StackedBarChart from '../../xds/components/StackedBarChart'
import GaugeChart from '../../xds/components/GaugeChart'
import HeatmapChart, { HeatCell } from '../../xds/components/HeatmapChart'

// ─── Types ────────────────────────────────────────────────────────────────────
type ExposurePoint = { calculatedAt: string; value: number };
type HealthRow = {
  month: string;
  gwp: number;
  earnedPremium: number;
  lossAmount: number;
  lossRatio: number;
  expenseRatio: number;
  combinedRatio: number;
};
type LobRow = { line: string; premium: number; losses: number; net: number };
type SolvencyRow = { month: string; solvencyRatio: number; totalCapital: number; requiredCapital: number };
type ReinsRow = { name: string; retained: number; ceded: number };
type ConcentrationRow = { region: string; perilType: string; exposure: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMoney(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}
function fmtPct(v: number): string { return `${(v * 100).toFixed(1)}%`; }
function shortMonth(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

// ─── Card shell ───────────────────────────────────────────────────────────────
function Card({
  title,
  badge,
  children,
  style,
}: {
  title: string;
  badge?: { text: string; ok: boolean };
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: '#0f1724',
        borderRadius: 10,
        padding: '16px 20px 20px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
        </span>
        {badge && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 4,
              background: badge.ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              color: badge.ok ? '#22c55e' : '#ef4444',
            }}
          >
            {badge.text}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [exposure, setExposure] = useState<ExposurePoint[]>([]);
  const [health, setHealth] = useState<HealthRow[]>([]);
  const [lob, setLob] = useState<LobRow[]>([]);
  const [solvency, setSolvency] = useState<SolvencyRow[]>([]);
  const [reins, setReins] = useState<ReinsRow[]>([]);
  const [concentration, setConcentration] = useState<HeatCell[]>([]);

  useEffect(() => {
    const base = getApiBase();

    async function load<T>(path: string, setter: (v: T) => void) {
      try {
        const res = await fetch(`${base}${path}`);
        if (res.ok) setter(await res.json());
      } catch {
        // ignore — charts show "No data" state
      }
    }

    const end = new Date();
    const start = new Date(end);
    start.setMonth(end.getMonth() - 11);

    load<ExposurePoint[]>(
      `/api/marketplace/metrics/capital-exposure?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`,
      setExposure,
    );
    load<HealthRow[]>('/api/analytics/financial-health?months=12', setHealth);
    load<LobRow[]>('/api/analytics/profitability-by-lob', setLob);
    load<SolvencyRow[]>('/api/analytics/capital-adequacy?months=12', setSolvency);
    load<ReinsRow[]>('/api/analytics/reinsurance-utilization', setReins);
    load<ConcentrationRow[]>('/api/analytics/exposure-concentration', (rows) =>
      setConcentration(rows.map((r) => ({ x: r.perilType, y: r.region, value: r.exposure }))),
    );
  }, []);

  // Latest KPI scalars
  const latestHealth = health[health.length - 1];
  const latestSolvency = solvency[solvency.length - 1];
  const totalGWP = health.reduce((s, r) => s + r.gwp, 0);
  const avgLossRatio = health.length > 0 ? health.reduce((s, r) => s + r.lossRatio, 0) / health.length : 0;
  const avgCombined = health.length > 0 ? health.reduce((s, r) => s + r.combinedRatio, 0) / health.length : 0;
  const currentSolvency = latestSolvency?.solvencyRatio ?? 0;

  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };
  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 };

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1200 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Analytics Dashboard</h1>
        <Link to="/insurer/coverage/create" style={{ color: '#4b8eff', textDecoration: 'none', fontSize: 13 }}>
          + New Deal
        </Link>
      </div>

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Annual GWP', value: fmtMoney(totalGWP), ok: totalGWP > 0 },
          { label: 'Avg Loss Ratio', value: fmtPct(avgLossRatio), ok: avgLossRatio < 0.65 },
          { label: 'Avg Combined Ratio', value: fmtPct(avgCombined), ok: avgCombined < 1.0 },
          { label: 'Solvency Ratio', value: currentSolvency > 0 ? `${currentSolvency.toFixed(2)}x` : '—', ok: currentSolvency >= 1.5 },
        ].map(({ label, value, ok }) => (
          <div key={label} style={{ background: '#0f1724', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: ok ? '#dae2fd' : '#f97316' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Section 1: Core Financial Health ── */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Core Financial Health
        </span>
      </div>
      <div style={{ ...grid2, marginBottom: 20 }}>
        <Card
          title="Loss Ratio Trend"
          badge={latestHealth ? { text: fmtPct(latestHealth.lossRatio), ok: latestHealth.lossRatio < 0.65 } : undefined}
        >
          <MultiLineChart
            data={health.map((r) => ({ ...r, month: shortMonth(r.month) }))}
            xKey="month"
            series={[{ key: 'lossRatio', label: 'Loss Ratio', color: '#4b8eff' }]}
            yFormatter={fmtPct}
            height={180}
          />
        </Card>

        <Card
          title="Combined Ratio"
          badge={latestHealth ? { text: fmtPct(latestHealth.combinedRatio), ok: latestHealth.combinedRatio < 1.0 } : undefined}
        >
          <MultiLineChart
            data={health.map((r) => ({ ...r, month: shortMonth(r.month) }))}
            xKey="month"
            series={[
              { key: 'lossRatio', label: 'Loss Ratio', color: '#4b8eff' },
              { key: 'expenseRatio', label: 'Expense Ratio', color: '#a78bfa', dashed: true },
              { key: 'combinedRatio', label: 'Combined Ratio', color: '#f97316' },
            ]}
            yFormatter={fmtPct}
            refLine={1.0}
            refLineLabel="100%"
            height={180}
          />
        </Card>
      </div>

      {/* ── Section 2: GWP vs Earned Premium ── */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Premium Overview
        </span>
      </div>
      <div style={{ marginBottom: 20 }}>
        <Card title="Gross Written Premium vs Earned Premium">
          <MultiLineChart
            data={health.map((r) => ({ ...r, month: shortMonth(r.month) }))}
            xKey="month"
            series={[
              { key: 'gwp', label: 'GWP', color: '#4b8eff' },
              { key: 'earnedPremium', label: 'Earned Premium', color: '#22c55e', dashed: true },
            ]}
            yFormatter={fmtMoney}
            height={200}
          />
        </Card>
      </div>

      {/* ── Section 3: Profitability by LoB ── */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          By Line of Business
        </span>
      </div>
      <div style={{ marginBottom: 20 }}>
        <Card title="Profitability by Line of Business">
          <StackedBarChart
            data={lob}
            xKey="line"
            stacked={false}
            bars={[
              { key: 'premium', label: 'Written Premium', color: '#4b8eff' },
              { key: 'losses', label: 'Incurred Losses', color: '#ef4444' },
              { key: 'net', label: 'Net Profit', color: '#22c55e' },
            ]}
            yFormatter={fmtMoney}
            height={220}
          />
        </Card>
      </div>

      {/* ── Section 4: Capital & Exposure ── */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Capital &amp; Exposure
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, marginBottom: 20 }}>
        <Card title="Capital Adequacy">
          <GaugeChart
            value={currentSolvency}
            max={3}
            label="Solvency Ratio"
            sublabel={`Required: ${latestSolvency ? fmtMoney(latestSolvency.requiredCapital) : '—'}`}
            height={200}
          />
        </Card>

        <Card title="Solvency Ratio Trend">
          <MultiLineChart
            data={solvency.map((r) => ({ ...r, month: shortMonth(r.month) }))}
            xKey="month"
            series={[
              { key: 'solvencyRatio', label: 'Solvency Ratio', color: '#22c55e' },
            ]}
            yFormatter={(v) => `${v.toFixed(2)}x`}
            refLine={1.0}
            refLineLabel="Min 1.0x"
            height={200}
          />
        </Card>
      </div>

      {/* ── Capital Exposure Time Series ── */}
      <div style={{ marginBottom: 20 }}>
        <Card title="Capital Exposure Over Time">
          <TimeSeriesChart points={exposure} height={180} />
        </Card>
      </div>

      {/* ── Section 5: Reinsurance ── */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Reinsurance
        </span>
      </div>
      <div style={{ marginBottom: 20 }}>
        <Card title="Reinsurance Utilization — Retained vs Ceded Risk">
          <StackedBarChart
            data={reins}
            xKey="name"
            stacked
            bars={[
              { key: 'retained', label: 'Retained', color: '#4b8eff' },
              { key: 'ceded', label: 'Ceded (Reinsured)', color: '#a78bfa' },
            ]}
            yFormatter={fmtMoney}
            height={220}
          />
        </Card>
      </div>

      {/* ── Section 6: Concentration Heatmap ── */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Concentration
        </span>
      </div>
      <div style={{ marginBottom: 32 }}>
        <Card title="Exposure Concentration — Region × Peril">
          <HeatmapChart
            cells={concentration}
            xAxisLabel="Peril Type"
            yAxisLabel="Region"
          />
        </Card>
      </div>
    </div>
  );
}
