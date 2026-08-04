import { col, fn, literal, Model, ModelStatic } from 'sequelize';
import { buildModelFieldCatalog, resolveOrgScopedModel } from '../modelFieldCatalog';
import { evaluateExpression } from '../pipeline/validation/ruleEngine';

/**
 * Custom-metric engine for configurable dashboard widgets. A user composes a
 * metric from real backend attributes (the org model-catalog) and a formula:
 *
 *   terms:   A = sum(submission.limit),  B = count(submission)
 *   formula: A / B                       (→ average limit)
 *   groupBy: submission.createdAt by month   (→ a live monthly series)
 *
 * Everything is **catalog-validated and org-scoped**: every referenced attribute
 * must exist in the caller's org model-catalog (so a metric can only ever touch
 * org-scoped tables), aggregations run with a forced `where: { organizationId }`,
 * and the formula is evaluated by the rules engine's safe parser (no `eval`).
 * No seeded fallback — results are strictly live.
 */

export const AGG_FNS = ['sum', 'avg', 'count', 'min', 'max'] as const;
export type AggFn = (typeof AGG_FNS)[number];

export const TIME_BUCKETS = ['month', 'quarter', 'year'] as const;
export type TimeBucket = (typeof TIME_BUCKETS)[number];

export const METRIC_VIZ = ['kpi', 'line', 'bar', 'table'] as const;
export type MetricViz = (typeof METRIC_VIZ)[number];

export const METRIC_FORMATS = ['number', 'currency', 'percent'] as const;
export type MetricFormat = (typeof METRIC_FORMATS)[number];

/** One named aggregation term (e.g. `A = sum(submission.limit)`). */
export type MetricTerm = {
  name: string;
  modelKey: string;
  /** Dot path `modelKey.field`; optional for `count` (counts rows). */
  fieldPath?: string;
  fn: AggFn;
};

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
  | { kind: 'series'; viz: MetricViz; format: MetricFormat; points: { group: string; value: number | null }[]; truncated?: boolean };

const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_TERMS = 12;
const MAX_POINTS = 100;

export class MetricError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super(`invalid_metric: ${issues.join('; ')}`);
    this.name = 'MetricError';
    this.issues = issues;
  }
}

// ─── Catalog lookup helpers ───────────────────────────────────────────────────
type FieldInfo = { kind: string; via?: string };

function ownFields(organizationId: number, modelKey: string): Map<string, FieldInfo> {
  const catalog = buildModelFieldCatalog(organizationId);
  const entry = catalog.models.find((m) => m.key === modelKey);
  const map = new Map<string, FieldInfo>();
  if (!entry) return map;
  for (const f of entry.fields) {
    // Restrict to direct columns of the model (no association traversal) — these
    // aggregate without joins. Own fields are `modelKey.field` with no `via`.
    if (f.via) continue;
    const segs = f.path.split('.');
    if (segs.length !== 2) continue;
    map.set(segs[1], { kind: f.kind, via: f.via });
  }
  return map;
}

/** Resolve a `modelKey.field` path's leaf field name, or null if malformed. */
function leafField(modelKey: string, fieldPath: string | undefined): string | null {
  if (!fieldPath) return null;
  const segs = fieldPath.split('.');
  if (segs.length !== 2 || segs[0] !== modelKey) return null;
  return segs[1];
}

/** Map an attribute name to its real DB column (handles `underscored` models). */
function columnOf(model: ModelStatic<Model>, attr: string): string {
  const attrs = (model as any).getAttributes?.() ?? (model as any).rawAttributes ?? {};
  return attrs[attr]?.field ?? attr;
}

// ─── Validation ───────────────────────────────────────────────────────────────
export function validateMetricDefinition(organizationId: number, def: unknown): string[] {
  const issues: string[] = [];
  const d = def as Partial<MetricDefinition> | null | undefined;
  if (!d || typeof d !== 'object') return ['definition missing'];

  const terms = Array.isArray(d.terms) ? d.terms : [];
  if (terms.length === 0) issues.push('at least one term required');
  if (terms.length > MAX_TERMS) issues.push(`too many terms (max ${MAX_TERMS})`);

  const names = new Set<string>();
  for (const t of terms) {
    if (!t || typeof t !== 'object') {
      issues.push('malformed term');
      continue;
    }
    if (!NAME_RE.test(String(t.name))) issues.push(`invalid term name "${t.name}"`);
    if (names.has(t.name)) issues.push(`duplicate term name "${t.name}"`);
    names.add(t.name);
    if (!AGG_FNS.includes(t.fn as AggFn)) issues.push(`term ${t.name}: bad fn`);
    const model = resolveOrgScopedModel(String(t.modelKey));
    if (!model) {
      issues.push(`term ${t.name}: unknown model "${t.modelKey}"`);
      continue;
    }
    if (t.fn !== 'count') {
      const fields = ownFields(organizationId, t.modelKey);
      const leaf = leafField(t.modelKey, t.fieldPath);
      if (!leaf || !fields.has(leaf)) issues.push(`term ${t.name}: unknown field "${t.fieldPath}"`);
      else if (fields.get(leaf)!.kind !== 'number') issues.push(`term ${t.name}: ${t.fieldPath} is not numeric`);
    }
  }

  // Formula: only term names + numbers/operators; safe-parse with dummy values.
  const formula = String(d.formula ?? '');
  if (!formula.trim()) issues.push('formula required');
  else {
    const idents = formula.match(/[A-Za-z_][A-Za-z0-9_.]*/g) ?? [];
    for (const id of idents) if (!names.has(id)) issues.push(`formula references unknown term "${id}"`);
    const dummy = Object.fromEntries([...names].map((n) => [n, 1]));
    if (evaluateExpression(formula, dummy) === null && issues.length === 0) issues.push('formula does not evaluate');
  }

  // Group-by: single-model constraint, correct field kind, viz consistency.
  const gb = d.groupBy;
  if (gb) {
    const model = resolveOrgScopedModel(String(gb.modelKey));
    if (!model) issues.push(`groupBy: unknown model "${gb.modelKey}"`);
    else {
      const fields = ownFields(organizationId, gb.modelKey);
      const leaf = leafField(gb.modelKey, gb.fieldPath);
      const info = leaf ? fields.get(leaf) : undefined;
      if (!info) issues.push(`groupBy: unknown field "${gb.fieldPath}"`);
      else if (gb.kind === 'time' && info.kind !== 'date') issues.push('groupBy: time requires a date field');
      else if (gb.kind === 'category' && !['text', 'boolean'].includes(info.kind))
        issues.push('groupBy: category requires a text/boolean field');
      if (gb.kind === 'time' && !TIME_BUCKETS.includes((gb as any).bucket)) issues.push('groupBy: bad time bucket');
    }
    for (const t of terms) if (t.modelKey !== gb.modelKey) issues.push(`grouped metrics require all terms on model "${gb.modelKey}"`);
  }

  if (!METRIC_VIZ.includes(d.viz as MetricViz)) issues.push('bad viz');
  else if (!gb && d.viz !== 'kpi') issues.push('viz requires a group-by');
  else if (gb && d.viz === 'kpi') issues.push('kpi viz cannot have a group-by');

  return Array.from(new Set(issues));
}

// ─── Aggregation ──────────────────────────────────────────────────────────────
function aggExpr(model: ModelStatic<Model>, term: MetricTerm) {
  if (term.fn === 'count') return fn('COUNT', literal('*'));
  const column = columnOf(model, leafField(term.modelKey, term.fieldPath)!);
  return fn(term.fn.toUpperCase(), col(column));
}

function groupExpr(model: ModelStatic<Model>, gb: GroupBy) {
  const column = columnOf(model, leafField(gb.modelKey, gb.fieldPath)!);
  if (gb.kind === 'time') return fn('DATE_TRUNC', gb.bucket, col(column));
  return col(column);
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Evaluate a metric definition against live, org-scoped data. */
export async function evaluateMetric(organizationId: number, def: MetricDefinition): Promise<MetricResult> {
  const issues = validateMetricDefinition(organizationId, def);
  if (issues.length) throw new MetricError(issues);

  const format = def.format ?? 'number';

  // ── Scalar: each term is an independent aggregate; formula combines them. ──
  if (!def.groupBy) {
    const ctx: Record<string, number> = {};
    for (const term of def.terms) {
      const model = resolveOrgScopedModel(term.modelKey)!;
      const row: any = await model.findOne({
        attributes: [[aggExpr(model, term), 'v']],
        where: { organizationId } as any,
        raw: true,
      });
      ctx[term.name] = num(row?.v) ?? 0;
    }
    return { kind: 'scalar', value: evaluateExpression(def.formula, ctx), format };
  }

  // ── Series: single model, one grouped query, formula per group row. ──
  const gb = def.groupBy;
  const model = resolveOrgScopedModel(gb.modelKey)!;
  const grouping = groupExpr(model, gb);
  const attributes: any[] = [[grouping, 'g'], ...def.terms.map((t) => [aggExpr(model, t), t.name])];
  const rows: any[] = await model.findAll({
    attributes,
    where: { organizationId } as any,
    group: [grouping] as any,
    order: [grouping] as any,
    raw: true,
  });

  const truncated = rows.length > MAX_POINTS;
  const points = rows.slice(0, MAX_POINTS).map((r) => {
    const ctx: Record<string, number> = {};
    for (const t of def.terms) ctx[t.name] = num(r[t.name]) ?? 0;
    return { group: formatGroup(r.g, gb), value: evaluateExpression(def.formula, ctx) };
  });
  return { kind: 'series', viz: def.viz, format, points, truncated };
}

function formatGroup(value: unknown, gb: GroupBy): string {
  if (value == null) return '—';
  if (gb.kind === 'time') {
    const d = new Date(value as string);
    if (!Number.isNaN(d.getTime())) {
      if (gb.bucket === 'year') return String(d.getUTCFullYear());
      if (gb.bucket === 'quarter') return `${d.getUTCFullYear()} Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
    }
  }
  return String(value);
}
