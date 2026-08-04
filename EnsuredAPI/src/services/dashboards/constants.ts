/**
 * Extracted dashboard constants for the platform dashboards.
 * Keep runtime values here so `platformDefaults.ts` focuses on logic and types.
 */
import type {
  CatalogWidget,
  SettingsSchema,
  SurfaceSpec,
} from './types';
import { metricItem, plainItem, w, monthsBack, showRefLine } from './utils';

export const DASHBOARD_GRID_COLUMNS = 12;

export const SURFACE_KEYS = ['marketplace', 'insurer-analytics'] as const;

export type SurfaceKey = (typeof SURFACE_KEYS)[number];

export const RESERVED_TITLE_KEY = 'title';

export const CUSTOM_METRIC: CatalogWidget = {
  widgetKey: 'custom-metric',
  title: 'Custom Metric',
  category: 'metric',
  defaultSize: { w: 4, h: 6 },
  minSize: { w: 2, h: 3 },
  instanceable: true,
};

/** Helpers used to build the catalog & default layouts live in `utils.ts`. */

export const WIDGET_SETTINGS: Record<string, SettingsSchema> = {
  'marketplace-stats': [
    { key: 'card1Title', label: 'Title', type: 'text', default: 'Total Open Capacity' },
    { key: 'card1Value', label: 'Value source', type: 'select', default: 'totalOpenCapacity', options: [
      { value: 'totalOpenCapacity', label: 'Total open capacity' },
      { value: 'totalFunded', label: 'Total funded' },
      { value: 'activeDeals', label: 'Active deals' },
    ] },
    { key: 'card1Icon', label: 'Icon', type: 'text', default: 'trending_up' },
    { key: 'card1Caption', label: 'Caption', type: 'text', default: 'Live Pending Funding Capacity' },
    { key: 'card2Title', label: 'Title', type: 'text', default: 'Total Funded' },
    { key: 'card2Value', label: 'Value source', type: 'select', default: 'totalFunded', options: [
      { value: 'totalOpenCapacity', label: 'Total open capacity' },
      { value: 'totalFunded', label: 'Total funded' },
      { value: 'activeDeals', label: 'Active deals' },
    ] },
    { key: 'card2Icon', label: 'Icon', type: 'text', default: 'history' },
    { key: 'card2Caption', label: 'Caption', type: 'text', default: 'Funding Already Committed' },
    { key: 'card3Title', label: 'Title', type: 'text', default: 'Active Deals' },
    { key: 'card3Value', label: 'Value source', type: 'select', default: 'activeDeals', options: [
      { value: 'totalOpenCapacity', label: 'Total open capacity' },
      { value: 'totalFunded', label: 'Total funded' },
      { value: 'activeDeals', label: 'Active deals' },
    ] },
    { key: 'card3Icon', label: 'Icon', type: 'text', default: 'pending_actions' },
    { key: 'card3Caption', label: 'Caption', type: 'text', default: 'Active Opportunities Pending Funding' },
  ],
  'chart-loss-ratio-trend': [monthsBack(12), showRefLine(false)],
  'chart-combined-ratio': [monthsBack(12), showRefLine(true)],
  'chart-premium-overview': [monthsBack(12)],
  'chart-solvency-trend': [monthsBack(12), showRefLine(true)],
  'chart-capital-exposure': [monthsBack(12)],
};

export const SURFACES: Record<SurfaceKey, SurfaceSpec> = {
  'insurer-analytics': {
    catalog: [
      w('kpi-annual-gwp', 'Annual GWP', 'kpi', 3, 2),
      w('kpi-loss-ratio', 'Avg Loss Ratio', 'kpi', 3, 2),
      w('kpi-combined-ratio', 'Avg Combined Ratio', 'kpi', 3, 2),
      w('kpi-solvency', 'Solvency Ratio', 'kpi', 3, 2),
      w('chart-loss-ratio-trend', 'Loss Ratio Trend', 'chart', 6, 6, 3, 4),
      w('chart-combined-ratio', 'Combined Ratio', 'chart', 6, 6, 3, 4),
      w('chart-premium-overview', 'GWP vs Earned Premium', 'chart', 12, 6, 4, 4),
      w('chart-profitability-lob', 'Profitability by Line of Business', 'chart', 12, 6, 4, 4),
      w('gauge-capital-adequacy', 'Capital Adequacy', 'gauge', 4, 6, 3, 4),
      w('chart-solvency-trend', 'Solvency Ratio Trend', 'chart', 8, 6, 4, 4),
      w('chart-capital-exposure', 'Capital Exposure Over Time', 'chart', 12, 6, 4, 4),
      w('chart-reinsurance-utilization', 'Retained vs Ceded Risk', 'chart', 6, 6, 3, 4),
      w('heatmap-exposure-concentration', 'Region × Peril Concentration', 'chart', 6, 6, 3, 4),
      CUSTOM_METRIC,
    ],
    defaultLayout: [
      metricItem('submissions-total', 0, 0, 3, 3),
      metricItem('quotes-total', 3, 0, 3, 3),
      metricItem('pipeline-runs-total', 6, 0, 3, 3),
      metricItem('capacity-gross-sum', 9, 0, 3, 3),
      metricItem('submissions-over-time', 0, 3, 6, 6),
      metricItem('submissions-by-status', 6, 3, 6, 6),
      metricItem('quotes-by-status', 0, 9, 6, 6),
      metricItem('pipeline-runs-over-time', 6, 9, 6, 6),
      metricItem('capacity-gross-by-lob', 0, 15, 12, 6),
    ],
  },

  marketplace: {
    catalog: [
      w('marketplace-stats', 'Marketplace Stats', 'kpi', 12, 2, 4, 2),
      w('marketplace-explorer', 'Marketplace Explorer', 'composite', 12, 24, 6, 12),
      w('marketplace-footer', 'Live Risk Ticker', 'ticker', 12, 2, 4, 2),
      CUSTOM_METRIC,
    ],
    defaultLayout: [
      plainItem('marketplace-stats', 0, 0, 12, 3),
      plainItem('marketplace-explorer', 0, 3, 12, 24),
      plainItem('marketplace-footer', 0, 27, 12, 2),
    ],
  },
};
