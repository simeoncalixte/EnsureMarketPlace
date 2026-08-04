import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  getFinancialHealth,
  getProfitabilityByLob,
  getCapitalAdequacy,
  getReinsuranceUtilization,
  getExposureConcentration,
} from '../../api/analytics';
import { getCapitalExposureMetrics } from '../../api/marketplace';
import TimeSeriesChart from '../../xds/components/TimeSeriesChart';
import MultiLineChart from '../../xds/components/MultiLineChart';
import StackedBarChart from '../../xds/components/StackedBarChart';
import GaugeChart from '../../xds/components/GaugeChart';
import HeatmapChart, { HeatCell } from '../../xds/components/HeatmapChart';
import Badge from '../../xds/components/Badge';
import { colors } from '../../xds/colors';
import type { SurfaceRegistry } from '../../dashboards/registry';
import type { ResolvedSettings } from '../../dashboards/types';
import CustomMetricWidget from '../../dashboards/CustomMetricWidget';
import type { MetricDefinition } from '../../dashboards/metricTypes';

// The provider loads this many months; widgets slice the tail by `monthsBack`.
const SUPERSET_MONTHS = 24;
const monthsOf = (s: ResolvedSettings, def = 12): number => {
  const n = Number((s as Record<string, unknown>).monthsBack ?? def);
  return Number.isFinite(n) ? Math.max(1, Math.min(SUPERSET_MONTHS, n)) : def;
};
const refOf = (s: ResolvedSettings, def: boolean): boolean => {
  const v = (s as Record<string, unknown>).showRefLine;
  return v === undefined ? def : Boolean(v);
};

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

// ─── Formatting helpers (unchanged from the original page) ──────────────────────
function fmtMoney(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}
function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}
function shortMonth(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

// ─── Surface data context ───────────────────────────────────────────────────────
// All widgets on the insurer-analytics surface share one load so the network
// cost matches the original single-page dashboard regardless of layout.
type AnalyticsData = {
  exposure: ExposurePoint[];
  health: HealthRow[];
  lob: LobRow[];
  solvency: SolvencyRow[];
  reins: ReinsRow[];
  concentration: HeatCell[];
};

const empty: AnalyticsData = { exposure: [], health: [], lob: [], solvency: [], reins: [], concentration: [] };

const AnalyticsDataContext = createContext<AnalyticsData>(empty);
export const useAnalyticsData = () => useContext(AnalyticsDataContext);

export function AnalyticsDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AnalyticsData>(empty);

  useEffect(() => {
    async function load<T>(fetcher: () => Promise<T>, apply: (v: T) => void) {
      try {
        apply(await fetcher());
      } catch {
        // ignore — widgets show their "No data" state
      }
    }
    // Load a 24-month superset once; per-widget `monthsBack` settings slice it.
    const end = new Date();
    const start = new Date(end);
    start.setMonth(end.getMonth() - (SUPERSET_MONTHS - 1));

    load<ExposurePoint[]>(() => getCapitalExposureMetrics(start, end), (v) => setState((s) => ({ ...s, exposure: v })));
    load<HealthRow[]>(() => getFinancialHealth(SUPERSET_MONTHS), (v) => setState((s) => ({ ...s, health: v })));
    load<LobRow[]>(() => getProfitabilityByLob(), (v) => setState((s) => ({ ...s, lob: v })));
    load<SolvencyRow[]>(() => getCapitalAdequacy(SUPERSET_MONTHS), (v) => setState((s) => ({ ...s, solvency: v })));
    load<ReinsRow[]>(() => getReinsuranceUtilization(), (v) => setState((s) => ({ ...s, reins: v })));
    load<ConcentrationRow[]>(() => getExposureConcentration(), (rows) =>
      setState((s) => ({ ...s, concentration: rows.map((r) => ({ x: r.perilType, y: r.region, value: r.exposure })) })),
    );
  }, []);

  return <AnalyticsDataContext.Provider value={state}>{children}</AnalyticsDataContext.Provider>;
}

// ─── Shared derived KPIs ────────────────────────────────────────────────────────
function useKpis() {
  const { health, solvency } = useAnalyticsData();
  return useMemo(() => {
    const totalGWP = health.reduce((s, r) => s + r.gwp, 0);
    const avgLossRatio = health.length ? health.reduce((s, r) => s + r.lossRatio, 0) / health.length : 0;
    const avgCombined = health.length ? health.reduce((s, r) => s + r.combinedRatio, 0) / health.length : 0;
    const currentSolvency = solvency[solvency.length - 1]?.solvencyRatio ?? 0;
    return { totalGWP, avgLossRatio, avgCombined, currentSolvency };
  }, [health, solvency]);
}

const KpiValue = styled.div<{ $warn?: boolean }>`
  font-size: 28px;
  font-weight: 700;
  color: ${({ $warn }) => ($warn ? colors.warning : colors.onSurface)};
`;

function Kpi({ value, warn }: { value: string; warn: boolean }) {
  return <KpiValue $warn={warn}>{value}</KpiValue>;
}

const chartData = (rows: HealthRow[]) => rows.map((r) => ({ ...r, month: shortMonth(r.month) }));

// ─── Widget components ──────────────────────────────────────────────────────────
function AnnualGwp() {
  const { totalGWP } = useKpis();
  return <Kpi value={fmtMoney(totalGWP)} warn={!(totalGWP > 0)} />;
}
function LossRatioKpi() {
  const { avgLossRatio } = useKpis();
  return <Kpi value={fmtPct(avgLossRatio)} warn={!(avgLossRatio < 0.65)} />;
}
function CombinedRatioKpi() {
  const { avgCombined } = useKpis();
  return <Kpi value={fmtPct(avgCombined)} warn={!(avgCombined < 1.0)} />;
}
function SolvencyKpi() {
  const { currentSolvency } = useKpis();
  return <Kpi value={currentSolvency > 0 ? `${currentSolvency.toFixed(2)}x` : '—'} warn={!(currentSolvency >= 1.5)} />;
}

function LossRatioTrend({ settings }: { settings: ResolvedSettings }) {
  const { health } = useAnalyticsData();
  const rows = health.slice(-monthsOf(settings));
  const latest = rows[rows.length - 1];
  const showRef = refOf(settings, false);
  return (
    <>
      {latest && (
        <Badge variant={latest.lossRatio < 0.65 ? 'success' : 'danger'}>{fmtPct(latest.lossRatio)}</Badge>
      )}
      <MultiLineChart
        data={chartData(rows)}
        xKey="month"
        series={[{ key: 'lossRatio', label: 'Loss Ratio', color: colors.primary }]}
        yFormatter={fmtPct}
        refLine={showRef ? 0.65 : undefined}
        refLineLabel={showRef ? '65%' : undefined}
        height={180}
      />
    </>
  );
}

function CombinedRatio({ settings }: { settings: ResolvedSettings }) {
  const { health } = useAnalyticsData();
  const showRef = refOf(settings, true);
  return (
    <MultiLineChart
      data={chartData(health.slice(-monthsOf(settings)))}
      xKey="month"
      series={[
        { key: 'lossRatio', label: 'Loss Ratio', color: colors.primary },
        { key: 'expenseRatio', label: 'Expense Ratio', color: colors.dataViz.purple, dashed: true },
        { key: 'combinedRatio', label: 'Combined Ratio', color: colors.dataViz.orange },
      ]}
      yFormatter={fmtPct}
      refLine={showRef ? 1.0 : undefined}
      refLineLabel={showRef ? '100%' : undefined}
      height={180}
    />
  );
}

function PremiumOverview({ settings }: { settings: ResolvedSettings }) {
  const { health } = useAnalyticsData();
  return (
    <MultiLineChart
      data={chartData(health.slice(-monthsOf(settings)))}
      xKey="month"
      series={[
        { key: 'gwp', label: 'GWP', color: colors.primary },
        { key: 'earnedPremium', label: 'Earned Premium', color: colors.dataViz.green, dashed: true },
      ]}
      yFormatter={fmtMoney}
      height={200}
    />
  );
}

function ProfitabilityLob() {
  const { lob } = useAnalyticsData();
  return (
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
  );
}

function CapitalAdequacyGauge() {
  const { solvency } = useAnalyticsData();
  const latest = solvency[solvency.length - 1];
  return (
    <GaugeChart
      value={latest?.solvencyRatio ?? 0}
      max={3}
      label="Solvency Ratio"
      sublabel={`Required: ${latest ? fmtMoney(latest.requiredCapital) : '—'}`}
      height={200}
    />
  );
}

function SolvencyTrend({ settings }: { settings: ResolvedSettings }) {
  const { solvency } = useAnalyticsData();
  const showRef = refOf(settings, true);
  const rows = solvency.slice(-monthsOf(settings));
  return (
    <MultiLineChart
      data={rows.map((r) => ({ ...r, month: shortMonth(r.month) }))}
      xKey="month"
      series={[{ key: 'solvencyRatio', label: 'Solvency Ratio', color: colors.dataViz.green }]}
      yFormatter={(v) => `${v.toFixed(2)}x`}
      refLine={showRef ? 1.0 : undefined}
      refLineLabel={showRef ? 'Min 1.0x' : undefined}
      height={200}
    />
  );
}

function CapitalExposure({ settings }: { settings: ResolvedSettings }) {
  const { exposure } = useAnalyticsData();
  return <TimeSeriesChart points={exposure.slice(-monthsOf(settings))} height={180} />;
}

function ReinsuranceUtilization() {
  const { reins } = useAnalyticsData();
  return (
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
  );
}

function ExposureConcentration() {
  const { concentration } = useAnalyticsData();
  return <HeatmapChart cells={concentration} xAxisLabel="Peril Type" yAxisLabel="Region" />;
}

// ─── Registry: widgetKey → renderer (keys match the backend catalog) ────────────
export const analyticsRegistry: SurfaceRegistry = {
  'kpi-annual-gwp': () => <AnnualGwp />,
  'kpi-loss-ratio': () => <LossRatioKpi />,
  'kpi-combined-ratio': () => <CombinedRatioKpi />,
  'kpi-solvency': () => <SolvencyKpi />,
  'chart-loss-ratio-trend': (_item, s) => <LossRatioTrend settings={s} />,
  'chart-combined-ratio': (_item, s) => <CombinedRatio settings={s} />,
  'chart-premium-overview': (_item, s) => <PremiumOverview settings={s} />,
  'chart-profitability-lob': () => <ProfitabilityLob />,
  'gauge-capital-adequacy': () => <CapitalAdequacyGauge />,
  'chart-solvency-trend': (_item, s) => <SolvencyTrend settings={s} />,
  'chart-capital-exposure': (_item, s) => <CapitalExposure settings={s} />,
  'heatmap-exposure-concentration': () => <ExposureConcentration />,
  'custom-metric': (item) => <CustomMetricWidget definition={item.settings?.definition as MetricDefinition | undefined} />,
};
