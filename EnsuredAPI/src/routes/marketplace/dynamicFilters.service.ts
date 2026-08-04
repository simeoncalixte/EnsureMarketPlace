import { Op } from 'sequelize';
import { CanonicalSubmission, Peril, Submission } from '../../db/models';
import type { CanonicalFilterIndex, CanonicalFilterSubject } from '../../services/pipeline/canonicalize/filterIndex';
import {
  hasActiveMarketplaceCatScoreFilters,
  loadSubmissionCatScoreIndex,
  matchesMarketplaceCatScoreFilters,
  parseMarketplaceCatScoreFilters,
} from './catScores.service';

const config = require('../../config/filters.config.json');

export type FilterOption = { value: string; label: string };

type ResolverMeta = {
  source?: 'submission' | 'canonicalSubmission' | 'catScore' | 'organization' | 'opportunity';
  path?: string;
  scope?: 'submission' | 'subject' | 'catScore' | 'opportunity';
  operator?: 'in' | 'range' | 'equals' | 'contains' | 'exists';
  combineWithSameScope?: 'sameSubject' | 'anySubject';
};

type FilterFieldConfig = {
  id: string;
  type: string;
  resolver?: ResolverMeta;
};

type CanonicalPredicate = {
  fieldId: string;
  values: string[];
  min: number | null;
  max: number | null;
  resolver: ResolverMeta;
};

type CanonicalRow = CanonicalSubmission & {
  submission?: Submission | null;
};

function fieldsFromConfig(): FilterFieldConfig[] {
  const sections = Array.isArray(config.sections) ? config.sections : [];
  return sections.flatMap((section: { fields?: unknown }) =>
    Array.isArray(section.fields) ? section.fields as FilterFieldConfig[] : [],
  );
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function parseCsvTokens(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.flatMap((entry) => parseCsvTokens(entry));
  if (typeof raw !== 'string') return [];
  return raw.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function parseNumeric(raw: unknown): number | null {
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function normalizeToken(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function getByPath(root: unknown, path: string | undefined): unknown {
  if (!path) return undefined;
  return path.split('.').reduce((current: unknown, segment) => {
    if (current == null) return undefined;
    if (Array.isArray(current)) {
      return current.flatMap((entry) => {
        const record = toRecord(entry);
        const value = record[segment];
        return Array.isArray(value) ? value : value == null ? [] : [value];
      });
    }
    return toRecord(current)[segment];
  }, root);
}

function valueMatchesIn(value: unknown, requested: Set<string>): boolean {
  if (requested.size === 0) return true;
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values.some((entry) => requested.has(normalizeToken(entry)));
}

function valueMatchesContains(value: unknown, requested: Set<string>): boolean {
  if (requested.size === 0) return true;
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values.some((entry) => {
    const haystack = normalizeToken(entry);
    return haystack && Array.from(requested).some((needle) => haystack.includes(needle));
  });
}

function valueMatchesRange(value: unknown, min: number | null, max: number | null): boolean {
  const number = Number(value);
  if (!Number.isFinite(number)) return false;
  if (min !== null && number < min) return false;
  if (max !== null && number > max) return false;
  return true;
}

function predicateIsActive(predicate: CanonicalPredicate): boolean {
  return predicate.values.length > 0 || predicate.min !== null || predicate.max !== null;
}

function predicateForField(field: FilterFieldConfig, query: Record<string, unknown>): CanonicalPredicate | null {
  const resolver = field.resolver;
  if (!resolver || resolver.source === 'catScore' || resolver.source === 'opportunity') return null;
  const values = parseCsvTokens(query[field.id]).map((value) =>
    field.id === 'sub' && value.includes(':') ? value.split(':').pop() ?? value : value,
  );
  const min = parseNumeric(query[`${field.id}Min`]);
  const max = parseNumeric(query[`${field.id}Max`]);
  const predicate = { fieldId: field.id, values, min, max, resolver };
  return predicateIsActive(predicate) ? predicate : null;
}

function matchesPredicate(root: unknown, predicate: CanonicalPredicate): boolean {
  const value = getByPath(root, predicate.resolver.path);
  const operator = predicate.resolver.operator ?? (predicate.values.length > 0 ? 'in' : 'range');
  if (operator === 'range') return valueMatchesRange(value, predicate.min, predicate.max);
  if (operator === 'equals') return predicate.values.length > 0 && valueMatchesIn(value, new Set(predicate.values.map(normalizeToken)));
  if (operator === 'contains') return valueMatchesContains(value, new Set(predicate.values.map(normalizeToken)));
  if (operator === 'exists') return value !== null && value !== undefined && (!Array.isArray(value) || value.length > 0);
  return valueMatchesIn(value, new Set(predicate.values.map(normalizeToken)));
}

function subjectMatchesPredicate(subject: CanonicalFilterSubject, predicate: CanonicalPredicate): boolean {
  const subjectPath = predicate.resolver.path?.replace(/^filterIndex\.subjects\./, '') ?? '';
  return matchesPredicate(subject, { ...predicate, resolver: { ...predicate.resolver, path: subjectPath } });
}

function matchesCanonicalPredicates(index: CanonicalFilterIndex, predicates: CanonicalPredicate[]): boolean {
  const subjectPredicates = predicates.filter((predicate) => predicate.resolver.scope === 'subject');
  const submissionPredicates = predicates.filter((predicate) => predicate.resolver.scope !== 'subject');

  for (const predicate of submissionPredicates) {
    if (!matchesPredicate({ filterIndex: index }, predicate)) return false;
  }

  const sameSubjectPredicates = subjectPredicates.filter(
    (predicate) => predicate.resolver.combineWithSameScope === 'sameSubject',
  );
  const anySubjectPredicates = subjectPredicates.filter(
    (predicate) => predicate.resolver.combineWithSameScope !== 'sameSubject',
  );

  for (const predicate of anySubjectPredicates) {
    if (!index.subjects.some((subject) => subjectMatchesPredicate(subject, predicate))) return false;
  }

  if (sameSubjectPredicates.length > 0) {
    return index.subjects.some((subject) =>
      sameSubjectPredicates.every((predicate) => subjectMatchesPredicate(subject, predicate)),
    );
  }

  return true;
}

function indexFromRow(row: CanonicalRow): CanonicalFilterIndex | null {
  const data = toRecord(row.data);
  const index = data.filterIndex;
  if (index && typeof index === 'object' && Array.isArray((index as { subjects?: unknown }).subjects)) {
    return index as CanonicalFilterIndex;
  }
  return null;
}

async function loadCanonicalRows(baseSubmissionIds?: number[]): Promise<CanonicalRow[]> {
  const where: Record<string, unknown> = {};
  if (baseSubmissionIds) {
    if (baseSubmissionIds.length === 0) return [];
    where.submissionId = { [Op.in]: baseSubmissionIds };
  }
  return CanonicalSubmission.findAll({
    where,
    include: [{ model: Submission, as: 'submission', required: false }],
    order: [['submissionId', 'ASC']],
  }) as Promise<CanonicalRow[]>;
}

async function applyCatFilters(
  submissionIds: number[],
  query: Record<string, unknown>,
): Promise<Set<number> | null> {
  const catFilters = parseMarketplaceCatScoreFilters(query);
  if (!hasActiveMarketplaceCatScoreFilters(catFilters)) return null;
  const scoresBySubmission = await loadSubmissionCatScoreIndex(submissionIds);
  const allowed = new Set<number>();
  for (const submissionId of submissionIds) {
    const scores = scoresBySubmission.get(submissionId) ?? [];
    if (scores.some((score) => matchesMarketplaceCatScoreFilters(score, catFilters))) {
      allowed.add(submissionId);
    }
  }
  return allowed;
}

export async function resolveMatchingSubmissionIds(params: {
  query: Record<string, unknown>;
  baseSubmissionIds?: number[];
}): Promise<Set<number> | null> {
  const fields = fieldsFromConfig();
  const predicates = fields
    .map((field) => predicateForField(field, params.query))
    .filter((predicate): predicate is CanonicalPredicate => Boolean(predicate));
  const hasCanonicalPredicates = predicates.length > 0;
  const hasCatPredicates = hasActiveMarketplaceCatScoreFilters(parseMarketplaceCatScoreFilters(params.query));

  if (!hasCanonicalPredicates && !hasCatPredicates) return null;

  let allowed: Set<number>;
  if (hasCanonicalPredicates) {
    const rows = await loadCanonicalRows(params.baseSubmissionIds);
    allowed = new Set<number>();
    for (const row of rows) {
      const index = indexFromRow(row);
      if (!index || row.submissionId == null) continue;
      if (matchesCanonicalPredicates(index, predicates)) allowed.add(row.submissionId);
    }
  } else {
    allowed = new Set(params.baseSubmissionIds ?? (await Submission.findAll({ attributes: ['id'] })).map((row) => row.id));
  }

  const catAllowed = await applyCatFilters(Array.from(allowed), params.query);
  if (catAllowed) {
    allowed = new Set(Array.from(allowed).filter((submissionId) => catAllowed.has(submissionId)));
  }

  return allowed;
}

export async function listCanonicalSubjectPerilOptions(): Promise<FilterOption[]> {
  const rows = await CanonicalSubmission.findAll({ attributes: ['data'] }).catch(() => []);
  const codes = new Set<string>();
  for (const row of rows) {
    const index = indexFromRow(row as CanonicalRow);
    for (const code of index?.subjectPerilCodes ?? []) codes.add(code);
  }

  if (codes.size === 0) {
    return [];
  }

  const perils = await Peril.findAll({
    where: { code: { [Op.in]: Array.from(codes) }, isActive: true },
    order: [['sortOrder', 'ASC'], ['label', 'ASC']],
  }).catch(() => []);
  const labels = new Map(perils.map((peril) => [peril.code, peril.label]));
  return Array.from(codes)
    .sort((a, b) => (labels.get(a) ?? a).localeCompare(labels.get(b) ?? b))
    .map((code) => ({ value: code, label: labels.get(code) ?? code }));
}

export async function listCanonicalOrganizationOptions(
  role: 'broker' | 'carrier',
  fallback: () => Promise<FilterOption[]>,
): Promise<FilterOption[]> {
  const rows = await CanonicalSubmission.findAll({ attributes: ['data'] }).catch(() => []);
  const byId = new Map<number, { id: number; name: string; status: string | null }>();
  const idKey = role === 'broker' ? 'brokerOrganizationId' : 'carrierOrganizationId';
  const nameKey = role === 'broker' ? 'brokerOrganizationName' : 'carrierOrganizationName';
  const statusKey = role === 'broker' ? 'brokerOrganizationStatus' : 'carrierOrganizationStatus';

  for (const row of rows) {
    const index = indexFromRow(row as CanonicalRow);
    const id = Number((index as Record<string, unknown> | null)?.[idKey]);
    const name = String((index as Record<string, unknown> | null)?.[nameKey] ?? '').trim();
    if (!Number.isInteger(id) || id <= 0 || !name) continue;
    byId.set(id, { id, name, status: String((index as Record<string, unknown> | null)?.[statusKey] ?? '').trim() || null });
  }

  if (byId.size === 0) return fallback();

  return Array.from(byId.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((record) => ({
      value: String(record.id),
      label: `${record.name} (${record.status === 'active' ? 'Active' : 'Inactive'})`,
    }));
}

export async function listCanonicalSubmissionTypeOptions(): Promise<FilterOption[]> {
  const rows = await CanonicalSubmission.findAll({ attributes: ['data'] }).catch(() => []);
  const byCode = new Map<string, string>();
  for (const row of rows) {
    const index = indexFromRow(row as CanonicalRow);
    if (!index?.submissionTypeCode) continue;
    byCode.set(index.submissionTypeCode, index.submissionTypeLabel ?? index.submissionTypeCode);
  }
  return Array.from(byCode.entries())
    .sort((left, right) => left[1].localeCompare(right[1]))
    .map(([value, label]) => ({ value, label }));
}
