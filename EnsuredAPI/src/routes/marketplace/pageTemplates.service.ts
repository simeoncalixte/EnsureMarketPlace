import { PageTemplate } from '../../db/models';
import type {
  DealSubjectTemplateFieldSnapshot,
  DealSubjectTemplateSnapshot,
} from '../../db/models/capital.models';
import type {
  PageTemplateDefinition,
  PageTemplateFieldDefinition,
  PageTemplateFieldType,
  PageTemplateSectionLayoutDefinition,
} from '../../db/models/pageTemplates.models';
import {
  DEFAULT_PAGE_TEMPLATE_SCOPE_KEY,
  INSURED_SUBJECTS_PAGE_KEY,
  buildDefaultInsuredSubjectsPageDefinition,
} from '../../db/seed-data/pageTemplates';
import { lineOfBusinessTaxonomy as seedLineOfBusinessTaxonomy } from '../../db/seed-data/lineOfBusinessTaxonomy';
import type {
  FindInsuredSubjectsTemplateResult,
  LineOfBusinessSelectionResolution,
  LobSelection,
  RiskClassTemplateResolution,
} from './types';

export function normalizeSelectionValue(value?: string | null): string {
  return String(value ?? '').trim();
}

export function resolveLineOfBusinessSelectionCodes(
  lineOfBusinessCode?: string | null,
  lineOfBusinessSubTypeCode?: string | null,
): LineOfBusinessSelectionResolution {
  const requestedPrimary = normalizeSelectionValue(lineOfBusinessCode);
  const requestedSubType = normalizeSelectionValue(lineOfBusinessSubTypeCode);

  if (!requestedPrimary && !requestedSubType) {
    return { primaryCode: '', primaryLabel: '', subTypeCode: '', subTypeLabel: '' };
  }

  const matches = (left: string, right: string): boolean => left.trim().toLowerCase() === right.trim().toLowerCase();

  for (const primary of seedLineOfBusinessTaxonomy) {
    if (matches(primary.code, requestedPrimary) || matches(primary.label, requestedPrimary)) {
      const matchedSubType = requestedSubType
        ? primary.subTypes.find((subType) => matches(subType.code, requestedSubType) || matches(subType.label, requestedSubType))
        : primary.subTypes[0];

      return {
        primaryCode: primary.code,
        primaryLabel: primary.label,
        subTypeCode: matchedSubType?.code ?? '',
        subTypeLabel: matchedSubType?.label ?? '',
      };
    }

    const matchedSubType = primary.subTypes.find((subType) => matches(subType.code, requestedPrimary) || matches(subType.label, requestedPrimary));
    if (matchedSubType) {
      return {
        primaryCode: primary.code,
        primaryLabel: primary.label,
        subTypeCode: matchedSubType.code,
        subTypeLabel: matchedSubType.label,
      };
    }

    if (requestedSubType) {
      const matchedSubTypeFromHint = primary.subTypes.find(
        (subType) => matches(subType.code, requestedSubType) || matches(subType.label, requestedSubType),
      );

      if (matchedSubTypeFromHint) {
        return {
          primaryCode: primary.code,
          primaryLabel: primary.label,
          subTypeCode: matchedSubTypeFromHint.code,
          subTypeLabel: matchedSubTypeFromHint.label,
        };
      }
    }
  }

  return {
    primaryCode: requestedPrimary,
    primaryLabel: requestedPrimary,
    subTypeCode: requestedSubType,
    subTypeLabel: requestedSubType,
  };
}

export function normalizeFieldKey(value: string): string {
  return value
    .trim()
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

export function cloneTemplate(template: PageTemplateDefinition): PageTemplateDefinition {
  return JSON.parse(JSON.stringify(template)) as PageTemplateDefinition;
}

export function resolveTemplateCacheKey(
  organizationId: number | null,
  lineOfBusinessCode?: string | null,
  lineOfBusinessSubTypeCode?: string | null,
): string {
  return [organizationId ?? 'global', normalizeSelectionValue(lineOfBusinessCode), normalizeSelectionValue(lineOfBusinessSubTypeCode)].join('|');
}

export function normalizeOptionalText(value?: string | null): string | null {
  const normalized = normalizeSelectionValue(value);
  return normalized.length > 0 ? normalized : null;
}

export function normalizeFieldValueMap(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, entryValue]) => {
    if (key.trim()) {
      acc[key] = entryValue;
    }

    return acc;
  }, {});
}

export function resolveTemplateFieldValue(field: PageTemplateFieldDefinition, fieldValues: Record<string, unknown>): unknown {
  const currentValue = fieldValues[field.key];

  if (typeof currentValue === 'string') {
    const trimmed = currentValue.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  } else if (currentValue !== undefined && currentValue !== null) {
    return currentValue;
  }

  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }

  return null;
}

export function buildRenderedTemplateSnapshot(params: {
  definitionJson: PageTemplateDefinition;
  scopeKey: string;
  organizationId: number | null;
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
  fieldValues: Record<string, unknown>;
}): DealSubjectTemplateSnapshot {
  const snapshot = cloneTemplate(params.definitionJson) as DealSubjectTemplateSnapshot;
  snapshot.scopeKey = params.scopeKey;
  snapshot.organizationId = params.organizationId;
  snapshot.lineOfBusinessCode = params.lineOfBusinessCode;
  snapshot.lineOfBusinessSubTypeCode = params.lineOfBusinessSubTypeCode;
  snapshot.sections = snapshot.sections.map((section) => ({
    ...section,
    fields: section.fields.map((field) => ({
      ...field,
      value: resolveTemplateFieldValue(field, params.fieldValues),
    })) as DealSubjectTemplateFieldSnapshot[],
  }));

  return snapshot;
}

export function cloneSectionLayout(layout?: PageTemplateSectionLayoutDefinition): PageTemplateSectionLayoutDefinition | undefined {
  if (!layout) {
    return undefined;
  }

  return {
    ...layout,
    columnWidths: layout.columnWidths ? [...layout.columnWidths] : undefined,
    rowHeights: layout.rowHeights ? [...layout.rowHeights] : undefined,
  };
}

export function defaultSectionLayout(fieldCount: number): PageTemplateSectionLayoutDefinition {
  const columns = fieldCount >= 6 ? 3 : fieldCount >= 3 ? 2 : 1;
  const rows = Math.max(2, Math.ceil(fieldCount / columns));

  return {
    type: 'grid',
    columns,
    gap: 12,
    dense: false,
    columnWidths: Array.from({ length: columns }, () => 1),
    rowHeights: Array.from({ length: rows }, () => 120),
  };
}

export function normalizeInsuredSubjectsPageTemplate(template: PageTemplateDefinition): PageTemplateDefinition {
  const normalized = cloneTemplate(template);
  normalized.sections = normalized.sections.map((section) => ({
    ...section,
    layout: cloneSectionLayout(section.layout) ?? defaultSectionLayout(section.fields.length),
  }));

  return normalized;
}

export function nextFieldOrder(fields: PageTemplateFieldDefinition[]): number {
  if (fields.length === 0) {
    return 10;
  }

  const currentMaxOrder = fields.reduce((max, field) => Math.max(max, Number(field.order) || 0), 0);
  return currentMaxOrder + 10;
}

const ALLOWED_FIELD_TYPES: ReadonlySet<PageTemplateFieldType> = new Set([
  'text',
  'textarea',
  'number',
  'integer',
  'select',
  'boolean',
  'radio',
  'date',
]);

export function normalizeFieldType(type?: string): PageTemplateFieldType {
  const normalized = String(type ?? 'text').trim().toLowerCase();
  return ALLOWED_FIELD_TYPES.has(normalized as PageTemplateFieldType)
    ? (normalized as PageTemplateFieldType)
    : 'text';
}

export function buildNewTemplateField(input: {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  order: number;
}): PageTemplateFieldDefinition {
  return {
    key: normalizeFieldKey(input.key),
    label: input.label.trim(),
    type: normalizeFieldType(input.type),
    order: input.order,
    required: Boolean(input.required),
  };
}

export async function addTemplateField(params: {
  organizationId: number | null;
  lineOfBusinessCode?: string | null;
  lineOfBusinessSubTypeCode?: string | null;
  sectionKey: string;
  field: {
    key: string;
    label: string;
    type?: string;
    required?: boolean;
  };
}): Promise<PageTemplateDefinition> {
  const { definitionJson: baseTemplate } = await findInsuredSubjectsTemplate(
    params.organizationId,
    params.lineOfBusinessCode,
    params.lineOfBusinessSubTypeCode,
  );

  const nextTemplate = cloneTemplate(baseTemplate);
  const section = nextTemplate.sections.find((current) => current.key === params.sectionKey);
  if (!section) {
    throw new Error(`Template section not found: ${params.sectionKey}`);
  }

  const newField = buildNewTemplateField({
    key: params.field.key,
    label: params.field.label,
    type: params.field.type,
    required: params.field.required,
    order: nextFieldOrder(section.fields),
  });

  if (!newField.key || !newField.label) {
    throw new Error('Field key and label are required');
  }

  if (section.fields.some((existingField) => existingField.key === newField.key)) {
    throw new Error(`Field with key '${newField.key}' already exists in section '${section.key}'`);
  }

  section.fields = [...section.fields, newField].sort((left, right) => left.order - right.order);

  return upsertInsuredSubjectsTemplate({
    organizationId: params.organizationId,
    lineOfBusinessCode: params.lineOfBusinessCode,
    lineOfBusinessSubTypeCode: params.lineOfBusinessSubTypeCode,
    definitionJson: nextTemplate,
  });
}

export async function removeTemplateField(params: {
  organizationId: number | null;
  lineOfBusinessCode?: string | null;
  lineOfBusinessSubTypeCode?: string | null;
  sectionKey: string;
  fieldKey: string;
}): Promise<PageTemplateDefinition> {
  const { definitionJson: baseTemplate } = await findInsuredSubjectsTemplate(
    params.organizationId,
    params.lineOfBusinessCode,
    params.lineOfBusinessSubTypeCode,
  );

  const nextTemplate = cloneTemplate(baseTemplate);
  const section = nextTemplate.sections.find((current) => current.key === params.sectionKey);
  if (!section) {
    throw new Error(`Template section not found: ${params.sectionKey}`);
  }

  const normalizedFieldKey = normalizeFieldKey(params.fieldKey);
  const nextFields = section.fields.filter((field) => field.key !== normalizedFieldKey);

  if (nextFields.length === section.fields.length) {
    throw new Error(`Field '${normalizedFieldKey}' not found in section '${section.key}'`);
  }

  section.fields = nextFields;

  return upsertInsuredSubjectsTemplate({
    organizationId: params.organizationId,
    lineOfBusinessCode: params.lineOfBusinessCode,
    lineOfBusinessSubTypeCode: params.lineOfBusinessSubTypeCode,
    definitionJson: nextTemplate,
  });
}

export function getTemplateScopeKey(organizationId: number | null | undefined): string {
  return organizationId == null ? DEFAULT_PAGE_TEMPLATE_SCOPE_KEY : `organization:${organizationId}`;
}

export function templateWhere(scopeKey: string, lineOfBusinessCode: string, lineOfBusinessSubTypeCode: string) {
  return {
    scopeKey,
    pageKey: INSURED_SUBJECTS_PAGE_KEY,
    status: 'published' as const,
    lineOfBusinessCode,
    lineOfBusinessSubTypeCode,
  };
}

export async function findInsuredSubjectsTemplate(
  organizationId: number | null,
  lineOfBusinessCode?: string | null,
  lineOfBusinessSubTypeCode?: string | null,
): Promise<FindInsuredSubjectsTemplateResult> {
  const resolvedSelection = resolveLineOfBusinessSelectionCodes(lineOfBusinessCode, lineOfBusinessSubTypeCode);
  const primaryCode = resolvedSelection.primaryCode;
  const subTypeCode = resolvedSelection.subTypeCode;
  const orgScopeKey = getTemplateScopeKey(organizationId);
  const isOrgScope = (key: string) => organizationId != null && key === orgScopeKey;

  const candidates = [
    { scopeKey: orgScopeKey, lineOfBusinessCode: primaryCode, lineOfBusinessSubTypeCode: subTypeCode },
    primaryCode ? { scopeKey: orgScopeKey, lineOfBusinessCode: primaryCode, lineOfBusinessSubTypeCode: '' } : null,
    { scopeKey: orgScopeKey, lineOfBusinessCode: '', lineOfBusinessSubTypeCode: '' },
    { scopeKey: DEFAULT_PAGE_TEMPLATE_SCOPE_KEY, lineOfBusinessCode: primaryCode, lineOfBusinessSubTypeCode: subTypeCode },
    primaryCode ? { scopeKey: DEFAULT_PAGE_TEMPLATE_SCOPE_KEY, lineOfBusinessCode: primaryCode, lineOfBusinessSubTypeCode: '' } : null,
    { scopeKey: DEFAULT_PAGE_TEMPLATE_SCOPE_KEY, lineOfBusinessCode: '', lineOfBusinessSubTypeCode: '' },
  ].filter((candidate): candidate is { scopeKey: string; lineOfBusinessCode: string; lineOfBusinessSubTypeCode: string } => Boolean(candidate));

  for (const candidate of candidates) {
    const pageTemplate = await PageTemplate.findOne({
      where: templateWhere(candidate.scopeKey, candidate.lineOfBusinessCode, candidate.lineOfBusinessSubTypeCode),
      order: [
        ['isDefault', 'DESC'],
        ['version', 'DESC'],
        ['updatedAt', 'DESC'],
      ],
    });

    if (pageTemplate?.definitionJson) {
      return {
        definitionJson: normalizeInsuredSubjectsPageTemplate(pageTemplate.definitionJson),
        isOrgTemplate: isOrgScope(candidate.scopeKey),
        scopeKey: candidate.scopeKey,
        organizationId: isOrgScope(candidate.scopeKey) ? organizationId : null,
        lineOfBusinessCode: candidate.lineOfBusinessCode,
        lineOfBusinessSubTypeCode: candidate.lineOfBusinessSubTypeCode,
      };
    }
  }

  return {
    definitionJson: normalizeInsuredSubjectsPageTemplate(buildDefaultInsuredSubjectsPageDefinition()),
    isOrgTemplate: false,
    scopeKey: DEFAULT_PAGE_TEMPLATE_SCOPE_KEY,
    organizationId: null,
    lineOfBusinessCode: resolvedSelection.primaryCode,
    lineOfBusinessSubTypeCode: resolvedSelection.subTypeCode,
  };
}

export async function resolveSubjectTemplateForDeal(params: {
  organizationId: number | null;
  lineOfBusinessCode?: string | null;
  lineOfBusinessSubTypeCode?: string | null;
  cache: Map<string, Promise<FindInsuredSubjectsTemplateResult>>;
}): Promise<FindInsuredSubjectsTemplateResult> {
  const resolvedSelection = resolveLineOfBusinessSelectionCodes(params.lineOfBusinessCode, params.lineOfBusinessSubTypeCode);
  const cacheKey = resolveTemplateCacheKey(params.organizationId, resolvedSelection.primaryCode, resolvedSelection.subTypeCode);
  const cached = params.cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const resolution = findInsuredSubjectsTemplate(params.organizationId, params.lineOfBusinessCode, params.lineOfBusinessSubTypeCode);
  params.cache.set(cacheKey, resolution);
  return resolution;
}

export async function upsertInsuredSubjectsTemplate(params: {
  organizationId: number | null;
  lineOfBusinessCode?: string | null;
  lineOfBusinessSubTypeCode?: string | null;
  definitionJson: PageTemplateDefinition;
}): Promise<PageTemplateDefinition> {
  const organizationId = params.organizationId ?? null;
  const scopeKey = getTemplateScopeKey(organizationId);
  const lineOfBusinessCode = normalizeSelectionValue(params.lineOfBusinessCode);
  const lineOfBusinessSubTypeCode = normalizeSelectionValue(params.lineOfBusinessSubTypeCode);
  const now = new Date();

  const existing = await PageTemplate.findOne({
    where: templateWhere(scopeKey, lineOfBusinessCode, lineOfBusinessSubTypeCode),
    order: [
      ['isDefault', 'DESC'],
      ['version', 'DESC'],
      ['updatedAt', 'DESC'],
    ],
  });

  if (existing) {
    const updated = await existing.update({
      organizationId,
      scopeKey,
      pageKey: INSURED_SUBJECTS_PAGE_KEY,
      version: existing.version,
      status: 'published',
      schemaVersion: params.definitionJson.schemaVersion ?? existing.schemaVersion ?? 1,
      isDefault: false,
      lineOfBusinessCode,
      lineOfBusinessSubTypeCode,
      parentTemplateId: null,
      createdByUserId: existing.createdByUserId,
      publishedAt: now,
      definitionJson: normalizeInsuredSubjectsPageTemplate(params.definitionJson),
    });

    return updated.definitionJson;
  }

  const created = await PageTemplate.create({
    organizationId,
    scopeKey,
    pageKey: INSURED_SUBJECTS_PAGE_KEY,
    version: 1,
    status: 'published',
    schemaVersion: params.definitionJson.schemaVersion ?? 1,
    isDefault: false,
    source: 'human',
    lineOfBusinessCode,
    lineOfBusinessSubTypeCode,
    parentTemplateId: null,
    createdByUserId: null,
    publishedAt: now,
    definitionJson: normalizeInsuredSubjectsPageTemplate(params.definitionJson),
  });

  return created.definitionJson;
}

// ---------------------------------------------------------------------------
// Generalized risk-class schema authoring (any page / any risk class).
//
// These generalize the insured-subjects helpers to an arbitrary `pageKey`,
// keyed by the line-of-business taxonomy. The insured-subjects routes above are
// left untouched and keep working; the new `/marketplace/risk-classes/:lob/*`
// routes reuse the same building blocks (`buildNewTemplateField`,
// `normalizeInsuredSubjectsPageTemplate`, etc.).
// ---------------------------------------------------------------------------

export const RISK_CLASS_PAGE_KEY = INSURED_SUBJECTS_PAGE_KEY;

/**
 * Parse a `:lob` route param. Accepts `primaryCode` or `primaryCode/subTypeCode`
 * (the slash is URL-encoded as `%2F` by clients, decoded by Fastify). The codes
 * are resolved against the taxonomy so labels/aliases also work.
 */
export function parseLobParam(lob: string): LobSelection {
  const raw = String(lob ?? '').trim();
  const [primaryPart, subTypePart] = raw.split('/');
  const resolved = resolveLineOfBusinessSelectionCodes(primaryPart, subTypePart);
  return { primaryCode: resolved.primaryCode, subTypeCode: resolved.subTypeCode };
}

function riskClassTemplateWhere(scopeKey: string, pageKey: string, lineOfBusinessCode: string, lineOfBusinessSubTypeCode: string) {
  return {
    scopeKey,
    pageKey,
    status: 'published' as const,
    lineOfBusinessCode,
    lineOfBusinessSubTypeCode,
  };
}

/**
 * Resolve the active draft/published template for an org + risk class + page,
 * walking the same scope/specificity ladder the insured-subjects resolver uses.
 */
export async function findRiskClassTemplate(
  organizationId: number | null,
  pageKey: string,
  selection: LobSelection,
): Promise<RiskClassTemplateResolution> {
  const primaryCode = selection.primaryCode;
  const subTypeCode = selection.subTypeCode;
  const orgScopeKey = getTemplateScopeKey(organizationId);
  const isOrgScope = (key: string) => organizationId != null && key === orgScopeKey;

  const candidates = [
    { scopeKey: orgScopeKey, lineOfBusinessCode: primaryCode, lineOfBusinessSubTypeCode: subTypeCode },
    primaryCode ? { scopeKey: orgScopeKey, lineOfBusinessCode: primaryCode, lineOfBusinessSubTypeCode: '' } : null,
    { scopeKey: orgScopeKey, lineOfBusinessCode: '', lineOfBusinessSubTypeCode: '' },
    { scopeKey: DEFAULT_PAGE_TEMPLATE_SCOPE_KEY, lineOfBusinessCode: primaryCode, lineOfBusinessSubTypeCode: subTypeCode },
    primaryCode ? { scopeKey: DEFAULT_PAGE_TEMPLATE_SCOPE_KEY, lineOfBusinessCode: primaryCode, lineOfBusinessSubTypeCode: '' } : null,
    { scopeKey: DEFAULT_PAGE_TEMPLATE_SCOPE_KEY, lineOfBusinessCode: '', lineOfBusinessSubTypeCode: '' },
  ].filter((candidate): candidate is { scopeKey: string; lineOfBusinessCode: string; lineOfBusinessSubTypeCode: string } => Boolean(candidate));

  for (const candidate of candidates) {
    const pageTemplate = await PageTemplate.findOne({
      where: riskClassTemplateWhere(candidate.scopeKey, pageKey, candidate.lineOfBusinessCode, candidate.lineOfBusinessSubTypeCode),
      order: [
        ['isDefault', 'DESC'],
        ['version', 'DESC'],
        ['updatedAt', 'DESC'],
      ],
    });

    if (pageTemplate?.definitionJson) {
      return {
        definitionJson: normalizeInsuredSubjectsPageTemplate(pageTemplate.definitionJson),
        isOrgTemplate: isOrgScope(candidate.scopeKey),
        scopeKey: candidate.scopeKey,
        organizationId: isOrgScope(candidate.scopeKey) ? organizationId : null,
        lineOfBusinessCode: candidate.lineOfBusinessCode,
        lineOfBusinessSubTypeCode: candidate.lineOfBusinessSubTypeCode,
        sourceTemplateId: pageTemplate.id,
      };
    }
  }

  // Fall back to the seeded default definition (re-keyed to the requested page),
  // exactly as the insured-subjects resolver does.
  const fallback = normalizeInsuredSubjectsPageTemplate(buildDefaultInsuredSubjectsPageDefinition());
  fallback.pageKey = pageKey;
  return {
    definitionJson: fallback,
    isOrgTemplate: false,
    scopeKey: DEFAULT_PAGE_TEMPLATE_SCOPE_KEY,
    organizationId: null,
    lineOfBusinessCode: primaryCode,
    lineOfBusinessSubTypeCode: subTypeCode,
    sourceTemplateId: null,
  };
}

export async function upsertRiskClassTemplate(params: {
  organizationId: number | null;
  pageKey: string;
  selection: LobSelection;
  definitionJson: PageTemplateDefinition;
}): Promise<PageTemplate> {
  const organizationId = params.organizationId ?? null;
  const scopeKey = getTemplateScopeKey(organizationId);
  const lineOfBusinessCode = params.selection.primaryCode;
  const lineOfBusinessSubTypeCode = params.selection.subTypeCode;
  const now = new Date();
  const definitionJson = normalizeInsuredSubjectsPageTemplate({ ...params.definitionJson, pageKey: params.pageKey });

  const existing = await PageTemplate.findOne({
    where: riskClassTemplateWhere(scopeKey, params.pageKey, lineOfBusinessCode, lineOfBusinessSubTypeCode),
    order: [
      ['isDefault', 'DESC'],
      ['version', 'DESC'],
      ['updatedAt', 'DESC'],
    ],
  });

  if (existing) {
    return existing.update({
      organizationId,
      scopeKey,
      pageKey: params.pageKey,
      status: 'published',
      schemaVersion: definitionJson.schemaVersion ?? existing.schemaVersion ?? 1,
      isDefault: false,
      lineOfBusinessCode,
      lineOfBusinessSubTypeCode,
      parentTemplateId: null,
      publishedAt: now,
      definitionJson,
    });
  }

  return PageTemplate.create({
    organizationId,
    scopeKey,
    pageKey: params.pageKey,
    version: 1,
    status: 'published',
    schemaVersion: definitionJson.schemaVersion ?? 1,
    isDefault: false,
    source: 'human',
    lineOfBusinessCode,
    lineOfBusinessSubTypeCode,
    parentTemplateId: null,
    createdByUserId: null,
    publishedAt: now,
    definitionJson,
  });
}

export async function addRiskClassField(params: {
  organizationId: number | null;
  pageKey: string;
  selection: LobSelection;
  sectionKey: string;
  field: { key: string; label: string; type?: string; required?: boolean };
}): Promise<PageTemplateDefinition> {
  const base = await findRiskClassTemplate(params.organizationId, params.pageKey, params.selection);
  const nextTemplate = cloneTemplate(base.definitionJson);
  const section = nextTemplate.sections.find((current) => current.key === params.sectionKey);
  if (!section) {
    throw new Error(`Template section not found: ${params.sectionKey}`);
  }

  const newField = buildNewTemplateField({
    key: params.field.key,
    label: params.field.label,
    type: params.field.type,
    required: params.field.required,
    order: nextFieldOrder(section.fields),
  });

  if (!newField.key || !newField.label) {
    throw new Error('Field key and label are required');
  }
  if (section.fields.some((existingField) => existingField.key === newField.key)) {
    throw new Error(`Field with key '${newField.key}' already exists in section '${section.key}'`);
  }

  section.fields = [...section.fields, newField].sort((left, right) => left.order - right.order);

  const saved = await upsertRiskClassTemplate({
    organizationId: params.organizationId,
    pageKey: params.pageKey,
    selection: params.selection,
    definitionJson: nextTemplate,
  });
  return saved.definitionJson;
}

export async function removeRiskClassField(params: {
  organizationId: number | null;
  pageKey: string;
  selection: LobSelection;
  sectionKey: string;
  fieldKey: string;
}): Promise<PageTemplateDefinition> {
  const base = await findRiskClassTemplate(params.organizationId, params.pageKey, params.selection);
  const nextTemplate = cloneTemplate(base.definitionJson);
  const section = nextTemplate.sections.find((current) => current.key === params.sectionKey);
  if (!section) {
    throw new Error(`Template section not found: ${params.sectionKey}`);
  }

  const normalizedFieldKey = normalizeFieldKey(params.fieldKey);
  const nextFields = section.fields.filter((field) => field.key !== normalizedFieldKey);
  if (nextFields.length === section.fields.length) {
    throw new Error(`Field '${normalizedFieldKey}' not found in section '${section.key}'`);
  }
  section.fields = nextFields;

  const saved = await upsertRiskClassTemplate({
    organizationId: params.organizationId,
    pageKey: params.pageKey,
    selection: params.selection,
    definitionJson: nextTemplate,
  });
  return saved.definitionJson;
}
