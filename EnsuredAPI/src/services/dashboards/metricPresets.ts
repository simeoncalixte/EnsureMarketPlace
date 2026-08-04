import type { MetricDefinition } from './metrics';

/**
 * Predefined metric definitions — the "default" dashboard content, built from
 * REAL org-scoped attributes (the model-field catalog). Each preset is a normal
 * MetricDefinition, so a default widget is just a `custom-metric` instance seeded
 * with one of these: live data out of the box, and fully reconfigurable in the
 * builder exactly like a user-added metric.
 *
 * Every preset must validate against the catalog (own numeric columns for
 * sum/avg, date columns for time group-by, text columns for category) — covered
 * by a test that runs `validateMetricDefinition` over the whole library.
 */

export type MetricPreset = {
  id: string;
  title: string;
  /** Grouping for the Add-widget preset menu. */
  group: 'Submissions' | 'Quotes' | 'Pipeline' | 'Capacity';
  definition: MetricDefinition;
};

const count = (modelKey: string): MetricDefinition['terms'] => [{ name: 'A', modelKey, fn: 'count' }];

export const METRIC_PRESETS: MetricPreset[] = [
  // ── Submissions ──
  {
    id: 'submissions-total',
    title: 'Submissions',
    group: 'Submissions',
    definition: { terms: count('submission'), formula: 'A', viz: 'kpi', format: 'number' },
  },
  {
    id: 'submissions-by-status',
    title: 'Submissions by Status',
    group: 'Submissions',
    definition: {
      terms: count('submission'),
      formula: 'A',
      groupBy: { kind: 'category', modelKey: 'submission', fieldPath: 'submission.status' },
      viz: 'bar',
      format: 'number',
    },
  },
  {
    id: 'submissions-over-time',
    title: 'Submissions over Time',
    group: 'Submissions',
    definition: {
      terms: count('submission'),
      formula: 'A',
      groupBy: { kind: 'time', modelKey: 'submission', fieldPath: 'submission.createdAt', bucket: 'month' },
      viz: 'line',
      format: 'number',
    },
  },
  {
    id: 'submissions-by-source',
    title: 'Submissions by Source',
    group: 'Submissions',
    definition: {
      terms: count('submission'),
      formula: 'A',
      groupBy: { kind: 'category', modelKey: 'submission', fieldPath: 'submission.source' },
      viz: 'bar',
      format: 'number',
    },
  },

  // ── Quotes ──
  {
    id: 'quotes-total',
    title: 'Quotes',
    group: 'Quotes',
    definition: { terms: count('quote'), formula: 'A', viz: 'kpi', format: 'number' },
  },
  {
    id: 'quotes-by-status',
    title: 'Quotes by Status',
    group: 'Quotes',
    definition: {
      terms: count('quote'),
      formula: 'A',
      groupBy: { kind: 'category', modelKey: 'quote', fieldPath: 'quote.status' },
      viz: 'bar',
      format: 'number',
    },
  },
  {
    id: 'quotes-over-time',
    title: 'Quotes over Time',
    group: 'Quotes',
    definition: {
      terms: count('quote'),
      formula: 'A',
      groupBy: { kind: 'time', modelKey: 'quote', fieldPath: 'quote.createdAt', bucket: 'month' },
      viz: 'line',
      format: 'number',
    },
  },

  // ── Pipeline ──
  {
    id: 'pipeline-runs-total',
    title: 'Pipeline Runs',
    group: 'Pipeline',
    definition: { terms: count('pipelineRun'), formula: 'A', viz: 'kpi', format: 'number' },
  },
  {
    id: 'pipeline-runs-over-time',
    title: 'Pipeline Runs over Time',
    group: 'Pipeline',
    definition: {
      terms: count('pipelineRun'),
      formula: 'A',
      groupBy: { kind: 'time', modelKey: 'pipelineRun', fieldPath: 'pipelineRun.createdAt', bucket: 'month' },
      viz: 'line',
      format: 'number',
    },
  },
  {
    id: 'pipeline-runs-by-status',
    title: 'Pipeline Runs by Status',
    group: 'Pipeline',
    definition: {
      terms: count('pipelineRun'),
      formula: 'A',
      groupBy: { kind: 'category', modelKey: 'pipelineRun', fieldPath: 'pipelineRun.status' },
      viz: 'bar',
      format: 'number',
    },
  },

  // ── Capacity ──
  {
    id: 'capacity-total',
    title: 'Capacity Definitions',
    group: 'Capacity',
    definition: { terms: count('capacityDefinition'), formula: 'A', viz: 'kpi', format: 'number' },
  },
  {
    id: 'capacity-gross-sum',
    title: 'Total Gross Capacity',
    group: 'Capacity',
    definition: {
      terms: [{ name: 'A', modelKey: 'capacityDefinition', fieldPath: 'capacityDefinition.grossCapacity', fn: 'sum' }],
      formula: 'A',
      viz: 'kpi',
      format: 'currency',
    },
  },
  {
    id: 'capacity-gross-by-lob',
    title: 'Gross Capacity by Line of Business',
    group: 'Capacity',
    definition: {
      terms: [{ name: 'A', modelKey: 'capacityDefinition', fieldPath: 'capacityDefinition.grossCapacity', fn: 'sum' }],
      formula: 'A',
      groupBy: { kind: 'category', modelKey: 'capacityDefinition', fieldPath: 'capacityDefinition.lineOfBusiness' },
      viz: 'bar',
      format: 'currency',
    },
  },
];

const BY_ID = new Map(METRIC_PRESETS.map((p) => [p.id, p]));

export function presetById(id: string): MetricPreset | undefined {
  return BY_ID.get(id);
}
