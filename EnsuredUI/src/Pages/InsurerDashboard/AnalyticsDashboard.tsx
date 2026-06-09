import React, { useEffect, useState } from 'react'
import { Link } from 'react-router'
import styled from 'styled-components'
import {
  getFinancialHealth,
  getProfitabilityByLob,
  getCapitalAdequacy,
  getReinsuranceUtilization,
  getExposureConcentration,
} from '../../api/analytics'
import { getCapitalExposureMetrics } from '../../api/marketplace'
import TimeSeriesChart from '../../xds/components/TimeSeriesChart'
import MultiLineChart from '../../xds/components/MultiLineChart'
import StackedBarChart from '../../xds/components/StackedBarChart'
import GaugeChart from '../../xds/components/GaugeChart'
import HeatmapChart, { HeatCell } from '../../xds/components/HeatmapChart'
import SectionHeader from '../../xds/components/SectionHeader'
import StatCard from '../../xds/components/StatCard'
import Badge from '../../xds/components/Badge'
import InsurerOnboarding from './InsurerOnboarding'
import { colors } from '../../xds/colors'

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

// ─── Layout ───────────────────────────────────────────────────────────────────
const PageRoot = styled.div`
  padding: 2rem 2.5rem;
  max-width: 1200px;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`;

const NewDealLink = styled(Link)`
  color: ${colors.primary};
  text-decoration: none;
  font-size: 13px;
`;

const KpiRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
`;

const GroupLabel = styled.div`
  margin-bottom: 8px;
  font-size: 11px;
  color: ${colors.neutral[500]};
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const Grid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const GaugeRow = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  margin-bottom: 20px;
`;

const SectionBlock = styled.div<{ $mb?: number }>`
  margin-bottom: ${({ $mb }) => `${$mb ?? 20}px`};
`;

// ─── Card shell ───────────────────────────────────────────────────────────────
const CardRoot = styled.div`
  background: ${colors.surfaceContainerHigh};
  border-radius: 10px;
  padding: 16px 20px 20px;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`;

const CardTitle = styled.span`
  font-size: 12px;
  color: ${colors.onSurfaceVariant};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

function Card({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: { text: string; ok: boolean };
  children: React.ReactNode;
}) {
  return (
    <CardRoot>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {badge && <Badge variant={badge.ok ? 'success' : 'danger'}>{badge.text}</Badge>}
      </CardHeader>
      {children}
    </CardRoot>
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
    async function load<T>(fetcher: () => Promise<T>, setter: (v: T) => void) {
      try {
        setter(await fetcher());
      } catch {
        // ignore — charts show "No data" state
      }
    }

    const end = new Date();
    const start = new Date(end);
    start.setMonth(end.getMonth() - 11);

    load<ExposurePoint[]>(() => getCapitalExposureMetrics(start, end), setExposure);
    load<HealthRow[]>(() => getFinancialHealth(12), setHealth);
    load<LobRow[]>(() => getProfitabilityByLob(), setLob);
    load<SolvencyRow[]>(() => getCapitalAdequacy(12), setSolvency);
    load<ReinsRow[]>(() => getReinsuranceUtilization(), setReins);
    load<ConcentrationRow[]>(() => getExposureConcentration(), (rows) =>
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

  const kpis = [
    { label: 'Annual GWP', value: fmtMoney(totalGWP), ok: totalGWP > 0 },
    { label: 'Avg Loss Ratio', value: fmtPct(avgLossRatio), ok: avgLossRatio < 0.65 },
    { label: 'Avg Combined Ratio', value: fmtPct(avgCombined), ok: avgCombined < 1.0 },
    { label: 'Solvency Ratio', value: currentSolvency > 0 ? `${currentSolvency.toFixed(2)}x` : '—', ok: currentSolvency >= 1.5 },
  ];

  return (
    <PageRoot>
      {/* ── Header ── */}
      <HeaderRow>
        <SectionHeader title="Analytics Dashboard" />
        <NewDealLink to="/insurer/coverage/create">+ New Deal</NewDealLink>
      </HeaderRow>

      {/* ── Onboarding panel (additive; self-gates on role/dismissed/complete) ── */}
      {/* Renders nothing for non-insurers / dismissed / fully-onboarded users, so the
          dashboard layout is byte-for-byte unchanged in those cases. */}
      <InsurerOnboarding />

      {/* ── KPI Row ── */}
      <KpiRow>
        {kpis.map(({ label, value, ok }) => (
          <StatCard key={label} label={label} value={value} tone={ok ? 'default' : 'warning'} />
        ))}
      </KpiRow>

      {/* ── Section 1: Core Financial Health ── */}
      <GroupLabel>Core Financial Health</GroupLabel>
      <SectionBlock as={Grid2}>
        <Card
          title="Loss Ratio Trend"
          badge={latestHealth ? { text: fmtPct(latestHealth.lossRatio), ok: latestHealth.lossRatio < 0.65 } : undefined}
        >
          <MultiLineChart
            data={health.map((r) => ({ ...r, month: shortMonth(r.month) }))}
            xKey="month"
            series={[{ key: 'lossRatio', label: 'Loss Ratio', color: colors.primary }]}
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
              { key: 'lossRatio', label: 'Loss Ratio', color: colors.primary },
              { key: 'expenseRatio', label: 'Expense Ratio', color: colors.dataViz.purple, dashed: true },
              { key: 'combinedRatio', label: 'Combined Ratio', color: colors.dataViz.orange },
            ]}
            yFormatter={fmtPct}
            refLine={1.0}
            refLineLabel="100%"
            height={180}
          />
        </Card>
      </SectionBlock>

      {/* ── Section 2: GWP vs Earned Premium ── */}
      <GroupLabel>Premium Overview</GroupLabel>
      <SectionBlock>
        <Card title="Gross Written Premium vs Earned Premium">
          <MultiLineChart
            data={health.map((r) => ({ ...r, month: shortMonth(r.month) }))}
            xKey="month"
            series={[
              { key: 'gwp', label: 'GWP', color: colors.primary },
              { key: 'earnedPremium', label: 'Earned Premium', color: colors.dataViz.green, dashed: true },
            ]}
            yFormatter={fmtMoney}
            height={200}
          />
        </Card>
      </SectionBlock>

      {/* ── Section 3: Profitability by LoB ── */}
      <GroupLabel>By Line of Business</GroupLabel>
      <SectionBlock>
        <Card title="Profitability by Line of Business">
          <StackedBarChart
            data={lob}
            xKey="line"
            stacked={false}
            bars={[
              { key: 'premium', label: 'Written Premium', color: colors.primary },
              { key: 'losses', label: 'Incurred Losses', color: colors.dataViz.red },
              { key: 'net', label: 'Net Profit', color: colors.dataViz.green },
            ]}
            yFormatter={fmtMoney}
            height={220}
          />
        </Card>
      </SectionBlock>

      {/* ── Section 4: Capital & Exposure ── */}
      <GroupLabel>Capital &amp; Exposure</GroupLabel>
      <GaugeRow>
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
              { key: 'solvencyRatio', label: 'Solvency Ratio', color: colors.dataViz.green },
            ]}
            yFormatter={(v) => `${v.toFixed(2)}x`}
            refLine={1.0}
            refLineLabel="Min 1.0x"
            height={200}
          />
        </Card>
      </GaugeRow>

      {/* ── Capital Exposure Time Series ── */}
      <SectionBlock>
        <Card title="Capital Exposure Over Time">
          <TimeSeriesChart points={exposure} height={180} />
        </Card>
      </SectionBlock>

      {/* ── Section 5: Reinsurance ── */}
      <GroupLabel>Reinsurance</GroupLabel>
      <SectionBlock>
        <Card title="Reinsurance Utilization — Retained vs Ceded Risk">
          <StackedBarChart
            data={reins}
            xKey="name"
            stacked
            bars={[
              { key: 'retained', label: 'Retained', color: colors.primary },
              { key: 'ceded', label: 'Ceded (Reinsured)', color: colors.dataViz.purple },
            ]}
            yFormatter={fmtMoney}
            height={220}
          />
        </Card>
      </SectionBlock>

      {/* ── Section 6: Concentration Heatmap ── */}
      <GroupLabel>Concentration</GroupLabel>
      <SectionBlock $mb={32}>
        <Card title="Exposure Concentration — Region × Peril">
          <HeatmapChart
            cells={concentration}
            xAxisLabel="Peril Type"
            yAxisLabel="Region"
          />
        </Card>
      </SectionBlock>
    </PageRoot>
  );
}
