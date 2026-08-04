// Custom-metric types, mirroring EnsuredAPI `services/dashboards/metrics.ts` and
// the model-field catalog (`services/modelFieldCatalog.ts`).

export const AGG_FNS = ['sum', 'avg', 'count', 'min', 'max'] as const;
export type AggFn = (typeof AGG_FNS)[number];

export const TIME_BUCKETS = ['month', 'quarter', 'year'] as const;
export type TimeBucket = (typeof TIME_BUCKETS)[number];

export const METRIC_VIZ = ['kpi', 'line', 'bar', 'table'] as const;
export type MetricViz = (typeof METRIC_VIZ)[number];

export const METRIC_FORMATS = ['number', 'currency', 'percent'] as const;
export type MetricFormat = (typeof METRIC_FORMATS)[number];

export type MetricTerm = { name: string; modelKey: string; fieldPath?: string; fn: AggFn };

export type GroupBy =
  | { kind: 'time'; modelKey: string; fieldPath: string; bucket: TimeBucket }
  | { kind: 'category'; modelKey: string; fieldPath: string };

export type MetricDefinition = {
  terms: MetricTerm[];
  formula: string;
  groupBy?: GroupBy | null;
  viz: MetricViz;
  format?: MetricFormat;
};

export type MetricResult =
  | { kind: 'scalar'; value: number | null; format: MetricFormat }
  | {
      kind: 'series';
      viz: MetricViz;
      format: MetricFormat;
      points: { group: string; value: number | null }[];
      truncated?: boolean;
    };

// ── Model-field catalog (the selectable backend attributes) ──
export type CatalogFieldKind = 'text' | 'number' | 'boolean' | 'date' | 'json' | 'uuid';
export type CatalogField = { path: string; label: string; kind: CatalogFieldKind; nullable: boolean; via?: string };
export type CatalogModel = { key: string; model: string; table: string; fields: CatalogField[] };
export type ModelFieldCatalog = { organizationId: number; models: CatalogModel[] };

/** Own (non-association) direct columns of a model — the only aggregatable/groupable fields. */
export function ownFields(model: CatalogModel | undefined): CatalogField[] {
  if (!model) return [];
  return model.fields.filter((f) => !f.via && f.path.split('.').length === 2);
}
