import { FastifyPluginAsync } from 'fastify';
import { Op } from 'sequelize';
import {
  Deal,
  PageTemplate,
  LineOfBusinessPrimaryType,
  LineOfBusinessSubType,
  Policy,
  RiskPortfolio,
  RiskMetric,
  SPV,
  SPVEntity,
  Tranche,
  TrancheSubscription,
} from '../db/models';
import type {
  DealSubjectRecord,
  DealSubjectTemplateFieldSnapshot,
  DealSubjectTemplateSnapshot,
} from '../db/models/capital.models';
import { getSequelize } from '../config/database';
import { resolveOrganizationIdFromRequest } from '../lib/org';
import type {
  PageTemplateDefinition,
  PageTemplateFieldDefinition,
  PageTemplateFieldType,
  PageTemplateSectionLayoutDefinition,
} from '../db/models/pageTemplates.models';
import {
  DEFAULT_PAGE_TEMPLATE_SCOPE_KEY,
  INSURED_SUBJECTS_PAGE_KEY,
  buildDefaultInsuredSubjectsPageDefinition,
} from '../db/seed-data/pageTemplates';
import { lineOfBusinessTaxonomy as seedLineOfBusinessTaxonomy } from '../db/seed-data/lineOfBusinessTaxonomy';
import { RiskClassSchemaVersion } from '../db/models/riskClassSchema.models';
import { RiskClassRegistry } from '../db/models/riskClassRegistry.models';
import { publishSchemaVersion } from '../pipeline/schema/publish';
import { resolveRiskClass } from '../pipeline/registry/resolve';
import { upsertRegistry } from '../pipeline/registry/upsert';
import { BenchmarkPrior } from '../db/models/benchmarkPrior.models';
import { resolveBenchmarkPrior, type BenchmarkPriorRow } from '../pipeline/benchmarkPriors/resolve';
import { upsertBenchmarkPrior } from '../pipeline/benchmarkPriors/upsert';
import { computeCoverage, summarizeCoverage } from '../pipeline/benchmarkPriors/coverage';

const ACTIVE_DEAL_STATUSES = new Set(['approved', 'fundraising', 'active']);
const OPEN_SUBSCRIPTION_STATUSES = new Set(['committed', 'pending', 'partially_filled']);

interface MarketplaceOpportunity {
  id: string;
  dealId: number;
  trancheId: number;
  fundingState: 'new' | 'partially_funded';
  dealName: string;
  dealStatus: string;
  trancheName: string;
  riskLevel: string;
  expectedReturnPct: number;
  maxLoss: number;
  durationMonths: number;
  capitalRequired: number;
  committedCapital: number;
  fundedAmount: number;
  pendingAmount: number;
  fundingProgressPct: number;
  startDate: string;
  endDate: string;
  lineOfBusiness?: string;
  lineOfBusinessSubType?: string;
  latitude?: number;
  longitude?: number;
}

function deriveDealLineOfBusiness(
  subjects: DealSubjectRecord[] | null | undefined,
  fallbackPerilType?: string | null,
): { lineOfBusiness?: string; lineOfBusinessSubType?: string } {
  const rows = Array.isArray(subjects) ? subjects : [];

  for (const subject of rows) {
    const lineOfBusiness =
      typeof subject.lineOfBusiness === 'string'
        ? subject.lineOfBusiness.trim()
        : '';
    const lineOfBusinessSubType =
      typeof subject.lineOfBusinessSubType === 'string'
        ? subject.lineOfBusinessSubType.trim()
        : '';

    if (lineOfBusiness || lineOfBusinessSubType) {
      return {
        lineOfBusiness: lineOfBusiness || undefined,
        lineOfBusinessSubType: lineOfBusinessSubType || undefined,
      };
    }
  }

  const peril = String(fallbackPerilType ?? '').trim().toLowerCase();
  if (!peril) {
    return {};
  }

  if (['hurricane', 'tornado', 'wind', 'windstorm'].includes(peril)) {
    return { lineOfBusiness: 'Catastrophe Property', lineOfBusinessSubType: 'Windstorm' };
  }
  if (peril === 'flood') {
    return { lineOfBusiness: 'Catastrophe Property', lineOfBusinessSubType: 'Flood' };
  }
  if (peril === 'earthquake') {
    return { lineOfBusiness: 'Catastrophe Property', lineOfBusinessSubType: 'Earthquake' };
  }
  if (peril === 'wildfire') {
    return { lineOfBusiness: 'Catastrophe Property', lineOfBusinessSubType: 'Wildfire' };
  }

  const label = peril
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((token) => token[0].toUpperCase() + token.slice(1))
    .join(' ');

  return label ? { lineOfBusiness: label } : {};
}

type TrancheWithRelations = Tranche & {
  deal?: Deal & { portfolio?: RiskPortfolio };
  subscriptions?: TrancheSubscription[];
  latitude?: unknown;
  longitude?: unknown;
};

type LineOfBusinessTaxonomyNode = {
  code: string;
  label: string;
  subTypes: Array<{
    code: string;
    label: string;
  }>;
};

const pageTemplateOptionSchema = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    value: { type: 'string' },
  },
  required: ['label', 'value'],
  additionalProperties: true,
} as const;

const pageTemplateFieldLayoutSchema = {
  type: 'object',
  properties: {
    columnStart: { type: 'integer' },
    columnSpan: { type: 'integer' },
    rowStart: { type: 'integer' },
    rowSpan: { type: 'integer' },
  },
  additionalProperties: true,
} as const;

const pageTemplateFieldSchema = {
  type: 'object',
  properties: {
    key: { type: 'string' },
    label: { type: 'string' },
    type: { type: 'string' },
    order: { type: 'integer' },
    required: { type: 'boolean' },
    canonicalKey: { type: 'string' },
    placeholder: { type: 'string' },
    helperText: { type: 'string' },
    dataSource: { type: 'string' },
    dependsOn: { type: 'string' },
    options: {
      type: 'array',
      items: pageTemplateOptionSchema,
    },
    layout: pageTemplateFieldLayoutSchema,
    visibleWhen: {
      type: 'object',
      properties: {
        lineOfBusinessCodes: { type: 'array', items: { type: 'string' } },
        lineOfBusinessSubTypeCodes: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: true,
    },
  },
  required: ['key', 'label', 'type', 'order'],
  additionalProperties: true,
} as const;

const pageTemplateSectionLayoutSchema = {
  type: 'object',
  properties: {
    type: { type: 'string' },
    columns: { type: 'integer' },
    gap: { type: 'integer' },
    dense: { type: 'boolean' },
    columnWidths: {
      type: 'array',
      items: { type: 'number' },
    },
    rowHeights: {
      type: 'array',
      items: { type: 'number' },
    },
  },
  additionalProperties: true,
} as const;

const pageTemplateSectionSchema = {
  type: 'object',
  properties: {
    key: { type: 'string' },
    label: { type: 'string' },
    order: { type: 'integer' },
    description: { type: 'string' },
    layout: pageTemplateSectionLayoutSchema,
    fields: {
      type: 'array',
      items: pageTemplateFieldSchema,
    },
  },
  required: ['key', 'label', 'order', 'fields'],
  additionalProperties: true,
} as const;

const pageTemplateSchema = {
  type: 'object',
  properties: {
    schemaVersion: { type: 'integer' },
    pageKey: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    sections: {
      type: 'array',
      items: pageTemplateSectionSchema,
    },
  },
  required: ['schemaVersion', 'pageKey', 'title', 'sections'],
  additionalProperties: true,
} as const;

function normalizeSelectionValue(value?: string | null): string {
  return String(value ?? '').trim();
}

type LineOfBusinessSelectionResolution = {
  primaryCode: string;
  primaryLabel: string;
  subTypeCode: string;
  subTypeLabel: string;
};

function resolveLineOfBusinessSelectionCodes(
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

function normalizeFieldKey(value: string): string {
  return value
    .trim()
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function cloneTemplate(template: PageTemplateDefinition): PageTemplateDefinition {
  return JSON.parse(JSON.stringify(template)) as PageTemplateDefinition;
}

type SubjectTemplateResolution = {
  definitionJson: PageTemplateDefinition;
  isOrgTemplate: boolean;
  scopeKey: string;
  organizationId: number | null;
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
};

function resolveTemplateCacheKey(
  organizationId: number | null,
  lineOfBusinessCode?: string | null,
  lineOfBusinessSubTypeCode?: string | null,
): string {
  return [organizationId ?? 'global', normalizeSelectionValue(lineOfBusinessCode), normalizeSelectionValue(lineOfBusinessSubTypeCode)].join('|');
}

function normalizeOptionalText(value?: string | null): string | null {
  const normalized = normalizeSelectionValue(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeFieldValueMap(value: unknown): Record<string, unknown> {
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

function resolveTemplateFieldValue(field: PageTemplateFieldDefinition, fieldValues: Record<string, unknown>): unknown {
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

function buildRenderedTemplateSnapshot(params: {
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

function buildDealSubjectRecord(params: {
  subject: {
    subjectId?: string;
    subjectLabel?: string;
    subjectIndex?: number;
    lineOfBusiness?: string | null;
    lineOfBusinessSubType?: string | null;
    fieldValues?: Record<string, unknown>;
    locationText?: unknown;
    assetType?: unknown;
    constructionType?: unknown;
    occupancyType?: unknown;
    replacementCost?: unknown;
    latitude?: unknown;
    longitude?: unknown;
    vulnerabilityScore?: unknown;
  };
  index: number;
  templateResolution: SubjectTemplateResolution;
}): DealSubjectRecord {
  const subjectLabel = String(params.subject.subjectLabel ?? `Subject ${params.index + 1}`).trim() || `Subject ${params.index + 1}`;
  const lineOfBusiness = normalizeOptionalText(params.subject.lineOfBusiness);
  const lineOfBusinessSubType = normalizeOptionalText(params.subject.lineOfBusinessSubType);
  const normalizedFieldValues = normalizeFieldValueMap(params.subject.fieldValues);
  const renderedTemplateValues: Record<string, unknown> = {
    subjectLabel,
    lineOfBusiness: lineOfBusiness ?? null,
    lineOfBusinessSubType: lineOfBusinessSubType ?? null,
    locationText: normalizeOptionalText(typeof params.subject.locationText === 'string' ? params.subject.locationText : null),
    assetType: normalizeOptionalText(typeof params.subject.assetType === 'string' ? params.subject.assetType : null),
    constructionType: normalizeOptionalText(typeof params.subject.constructionType === 'string' ? params.subject.constructionType : null),
    occupancyType: normalizeOptionalText(typeof params.subject.occupancyType === 'string' ? params.subject.occupancyType : null),
    replacementCost: params.subject.replacementCost ?? null,
    latitude: params.subject.latitude ?? null,
    longitude: params.subject.longitude ?? null,
    vulnerabilityScore: params.subject.vulnerabilityScore ?? null,
    ...normalizedFieldValues,
  };

  return {
    subjectId: String(params.subject.subjectId ?? `subject-${params.index + 1}`),
    subjectLabel,
    subjectIndex: Number.isFinite(Number(params.subject.subjectIndex)) ? Number(params.subject.subjectIndex) : params.index + 1,
    lineOfBusiness,
    lineOfBusinessSubType,
    fieldValues: normalizedFieldValues,
    locationText: typeof renderedTemplateValues.locationText === 'string' ? normalizeOptionalText(renderedTemplateValues.locationText) : null,
    assetType: typeof renderedTemplateValues.assetType === 'string' ? normalizeOptionalText(renderedTemplateValues.assetType) : null,
    constructionType: typeof renderedTemplateValues.constructionType === 'string' ? normalizeOptionalText(renderedTemplateValues.constructionType) : null,
    occupancyType: typeof renderedTemplateValues.occupancyType === 'string' ? normalizeOptionalText(renderedTemplateValues.occupancyType) : null,
    replacementCost: renderedTemplateValues.replacementCost ?? null,
    latitude: renderedTemplateValues.latitude ?? null,
    longitude: renderedTemplateValues.longitude ?? null,
    vulnerabilityScore: renderedTemplateValues.vulnerabilityScore ?? null,
    templateSnapshot: buildRenderedTemplateSnapshot({
      definitionJson: params.templateResolution.definitionJson,
      scopeKey: params.templateResolution.scopeKey,
      organizationId: params.templateResolution.organizationId,
      lineOfBusinessCode: params.templateResolution.lineOfBusinessCode,
      lineOfBusinessSubTypeCode: params.templateResolution.lineOfBusinessSubTypeCode,
      fieldValues: renderedTemplateValues,
    }),
  };
}

function cloneSectionLayout(layout?: PageTemplateSectionLayoutDefinition): PageTemplateSectionLayoutDefinition | undefined {
  if (!layout) {
    return undefined;
  }

  return {
    ...layout,
    columnWidths: layout.columnWidths ? [...layout.columnWidths] : undefined,
    rowHeights: layout.rowHeights ? [...layout.rowHeights] : undefined,
  };
}

function defaultSectionLayout(fieldCount: number): PageTemplateSectionLayoutDefinition {
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

function normalizeInsuredSubjectsPageTemplate(template: PageTemplateDefinition): PageTemplateDefinition {
  const normalized = cloneTemplate(template);
  normalized.sections = normalized.sections.map((section) => ({
    ...section,
    layout: cloneSectionLayout(section.layout) ?? defaultSectionLayout(section.fields.length),
  }));

  return normalized;
}

function nextFieldOrder(fields: PageTemplateFieldDefinition[]): number {
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

function normalizeFieldType(type?: string): PageTemplateFieldType {
  const normalized = String(type ?? 'text').trim().toLowerCase();
  return ALLOWED_FIELD_TYPES.has(normalized as PageTemplateFieldType)
    ? (normalized as PageTemplateFieldType)
    : 'text';
}

function buildNewTemplateField(input: {
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

async function addTemplateField(params: {
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

async function removeTemplateField(params: {
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

function getTemplateScopeKey(organizationId: number | null | undefined): string {
  return organizationId == null ? DEFAULT_PAGE_TEMPLATE_SCOPE_KEY : `organization:${organizationId}`;
}

function templateWhere(scopeKey: string, lineOfBusinessCode: string, lineOfBusinessSubTypeCode: string) {
  return {
    scopeKey,
    pageKey: INSURED_SUBJECTS_PAGE_KEY,
    status: 'published' as const,
    lineOfBusinessCode,
    lineOfBusinessSubTypeCode,
  };
}

type FindInsuredSubjectsTemplateResult = {
  definitionJson: PageTemplateDefinition;
  isOrgTemplate: boolean;
  scopeKey: string;
  organizationId: number | null;
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
};

async function findInsuredSubjectsTemplate(
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

async function resolveSubjectTemplateForDeal(params: {
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

async function upsertInsuredSubjectsTemplate(params: {
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

const RISK_CLASS_PAGE_KEY = INSURED_SUBJECTS_PAGE_KEY;

type LobSelection = { primaryCode: string; subTypeCode: string };

/**
 * Parse a `:lob` route param. Accepts `primaryCode` or `primaryCode/subTypeCode`
 * (the slash is URL-encoded as `%2F` by clients, decoded by Fastify). The codes
 * are resolved against the taxonomy so labels/aliases also work.
 */
function parseLobParam(lob: string): LobSelection {
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

type RiskClassTemplateResolution = {
  definitionJson: PageTemplateDefinition;
  isOrgTemplate: boolean;
  scopeKey: string;
  organizationId: number | null;
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
  sourceTemplateId: number | null;
};

/**
 * Resolve the active draft/published template for an org + risk class + page,
 * walking the same scope/specificity ladder the insured-subjects resolver uses.
 */
async function findRiskClassTemplate(
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

async function upsertRiskClassTemplate(params: {
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

async function addRiskClassField(params: {
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

async function removeRiskClassField(params: {
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

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthsBetween(startDate: Date, endDate: Date): number {
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 1;
  }

  const startMonth = startDate.getFullYear() * 12 + startDate.getMonth();
  const endMonth = endDate.getFullYear() * 12 + endDate.getMonth();
  return Math.max(1, endMonth - startMonth + 1);
}

function serializeFallbackLineOfBusinessTaxonomy(): LineOfBusinessTaxonomyNode[] {
  return seedLineOfBusinessTaxonomy.map((primary) => ({
    code: primary.code,
    label: primary.label,
    subTypes: primary.subTypes.map((subType) => ({
      code: subType.code,
      label: subType.label,
    })),
  }));
}

async function loadLineOfBusinessTaxonomy(): Promise<LineOfBusinessTaxonomyNode[]> {
  try {
    const [primaries, subTypes] = await Promise.all([
      LineOfBusinessPrimaryType.findAll({ order: [['sortOrder', 'ASC'], ['label', 'ASC']] }),
      LineOfBusinessSubType.findAll({ order: [['primaryCode', 'ASC'], ['sortOrder', 'ASC'], ['label', 'ASC']] }),
    ]);

    if (primaries.length === 0) {
      return serializeFallbackLineOfBusinessTaxonomy();
    }

    const groupedSubTypes = new Map<string, Array<{ code: string; label: string }>>();
    for (const subType of subTypes) {
      const primaryCode = subType.primaryCode;
      const entries = groupedSubTypes.get(primaryCode) ?? [];
      entries.push({ code: subType.code, label: subType.label });
      groupedSubTypes.set(primaryCode, entries);
    }

    return primaries.map((primary) => ({
      code: primary.code,
      label: primary.label,
      subTypes: groupedSubTypes.get(primary.code) ?? [],
    }));
  } catch (error) {
    return serializeFallbackLineOfBusinessTaxonomy();
  }
}

async function loadInsuredSubjectsPageTemplate(): Promise<PageTemplateDefinition> {
  try {
    const pageTemplate = await PageTemplate.findOne({
      where: {
        scopeKey: DEFAULT_PAGE_TEMPLATE_SCOPE_KEY,
        pageKey: INSURED_SUBJECTS_PAGE_KEY,
        status: 'published',
      },
      order: [
        ['isDefault', 'DESC'],
        ['version', 'DESC'],
        ['updatedAt', 'DESC'],
      ],
    });

    if (pageTemplate?.definitionJson) {
      return pageTemplate.definitionJson;
    }
  } catch {
    // fall through to the seeded definition below
  }

  return buildDefaultInsuredSubjectsPageDefinition();
}

export const marketplaceRoute: FastifyPluginAsync = async (app) => {
  app.get(
    '/marketplace/line-of-business-taxonomy',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'List line of business primary and subtype taxonomy',
        querystring: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
            lineOfBusinessCode: { type: 'string' },
            lineOfBusinessSubTypeCode: { type: 'string' },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              primaryTypes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    label: { type: 'string' },
                    subTypes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          code: { type: 'string' },
                          label: { type: 'string' },
                        },
                        required: ['code', 'label'],
                      },
                    },
                  },
                  required: ['code', 'label', 'subTypes'],
                },
              },
              pageTemplate: pageTemplateSchema,
              isOrgTemplate: { type: 'boolean' },
            },
            required: ['primaryTypes', 'pageTemplate', 'isOrgTemplate'],
          },
        },
      },
    },
    async (request, reply) => {
      const query = (request.query ?? {}) as {
        organizationId?: number | null;
        lineOfBusinessCode?: string;
        lineOfBusinessSubTypeCode?: string;
      };

      const resolvedOrganizationId = query.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const primaryTypes = await loadLineOfBusinessTaxonomy();
      const { definitionJson: pageTemplate, isOrgTemplate } = await findInsuredSubjectsTemplate(
        resolvedOrganizationId,
        query.lineOfBusinessCode,
        query.lineOfBusinessSubTypeCode,
      );
      return reply.code(200).send({ primaryTypes, pageTemplate, isOrgTemplate });
    },
  );

  app.put(
    '/marketplace/insured-subjects/page-template',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Save insured subject page template JSONB',
        body: {
          type: 'object',
          required: ['definitionJson'],
          properties: {
            organizationId: { type: ['integer', 'null'] },
            lineOfBusinessCode: { type: 'string' },
            lineOfBusinessSubTypeCode: { type: 'string' },
            definitionJson: pageTemplateSchema,
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              pageTemplate: pageTemplateSchema,
            },
            required: ['pageTemplate'],
          },
          201: {
            type: 'object',
            properties: {
              pageTemplate: pageTemplateSchema,
            },
            required: ['pageTemplate'],
          },
        },
      },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as {
        organizationId?: number | null;
        lineOfBusinessCode?: string;
        lineOfBusinessSubTypeCode?: string;
        definitionJson: PageTemplateDefinition;
      };

      const resolvedOrganizationId = body.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const pageTemplate = await upsertInsuredSubjectsTemplate({
        organizationId: resolvedOrganizationId ?? null,
        lineOfBusinessCode: body.lineOfBusinessCode,
        lineOfBusinessSubTypeCode: body.lineOfBusinessSubTypeCode,
        definitionJson: body.definitionJson,
      });

      return reply.code(201).send({ pageTemplate });
    },
  );

  app.post(
    '/marketplace/insured-subjects/page-template/fields',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Add a field to an insured subject template section and persist it',
        body: {
          type: 'object',
          required: ['sectionKey', 'field'],
          properties: {
            organizationId: { type: ['integer', 'null'] },
            lineOfBusinessCode: { type: 'string' },
            lineOfBusinessSubTypeCode: { type: 'string' },
            sectionKey: { type: 'string' },
            field: {
              type: 'object',
              required: ['key', 'label'],
              properties: {
                key: { type: 'string' },
                label: { type: 'string' },
                type: { type: 'string' },
                required: { type: 'boolean' },
              },
              additionalProperties: true,
            },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              pageTemplate: pageTemplateSchema,
            },
            required: ['pageTemplate'],
          },
        },
      },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as {
        organizationId?: number | null;
        lineOfBusinessCode?: string;
        lineOfBusinessSubTypeCode?: string;
        sectionKey: string;
        field: {
          key: string;
          label: string;
          type?: string;
          required?: boolean;
        };
      };

      try {
        const resolvedOrganizationId = body.organizationId ?? (await resolveOrganizationIdFromRequest(request));
        const pageTemplate = await addTemplateField({
          organizationId: resolvedOrganizationId ?? null,
          lineOfBusinessCode: body.lineOfBusinessCode,
          lineOfBusinessSubTypeCode: body.lineOfBusinessSubTypeCode,
          sectionKey: body.sectionKey,
          field: body.field,
        });

        return reply.code(200).send({ pageTemplate });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add template field';
        const statusCode = /not found/i.test(message) ? 404 : 400;
        return reply.code(statusCode).send({ error: message });
      }
    },
  );

  app.delete(
    '/marketplace/insured-subjects/page-template/fields',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Remove a field from an insured subject template section and persist it',
        body: {
          type: 'object',
          required: ['sectionKey', 'fieldKey'],
          properties: {
            organizationId: { type: ['integer', 'null'] },
            lineOfBusinessCode: { type: 'string' },
            lineOfBusinessSubTypeCode: { type: 'string' },
            sectionKey: { type: 'string' },
            fieldKey: { type: 'string' },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              pageTemplate: pageTemplateSchema,
            },
            required: ['pageTemplate'],
          },
        },
      },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as {
        organizationId?: number | null;
        lineOfBusinessCode?: string;
        lineOfBusinessSubTypeCode?: string;
        sectionKey: string;
        fieldKey: string;
      };

      try {
        const resolvedOrganizationId = body.organizationId ?? (await resolveOrganizationIdFromRequest(request));
        const pageTemplate = await removeTemplateField({
          organizationId: resolvedOrganizationId ?? null,
          lineOfBusinessCode: body.lineOfBusinessCode,
          lineOfBusinessSubTypeCode: body.lineOfBusinessSubTypeCode,
          sectionKey: body.sectionKey,
          fieldKey: body.fieldKey,
        });

        return reply.code(200).send({ pageTemplate });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to remove template field';
        const statusCode = /not found/i.test(message) ? 404 : 400;
        return reply.code(statusCode).send({ error: message });
      }
    },
  );

  // -------------------------------------------------------------------------
  // Generalized risk-class schema authoring + versioning (Slice 1).
  // `:lob` accepts `primaryCode` or `primaryCode/subTypeCode` (slash URL-encoded).
  // The insured-subjects routes above remain as working aliases for the
  // `insured-subjects` page key.
  // -------------------------------------------------------------------------

  app.get(
    '/marketplace/risk-classes/:lob/schema',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Get the active draft/published schema template for an org + risk class',
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        querystring: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
            pageKey: { type: 'string' },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              lineOfBusinessCode: { type: 'string' },
              lineOfBusinessSubTypeCode: { type: 'string' },
              pageKey: { type: 'string' },
              isOrgTemplate: { type: 'boolean' },
              pageTemplate: pageTemplateSchema,
            },
            required: ['lineOfBusinessCode', 'pageKey', 'isOrgTemplate', 'pageTemplate'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const query = (request.query ?? {}) as { organizationId?: number | null; pageKey?: string };
      const pageKey = String(query.pageKey ?? RISK_CLASS_PAGE_KEY).trim() || RISK_CLASS_PAGE_KEY;
      const resolvedOrganizationId = query.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const selection = parseLobParam(params.lob);
      const resolution = await findRiskClassTemplate(resolvedOrganizationId ?? null, pageKey, selection);

      return reply.code(200).send({
        lineOfBusinessCode: selection.primaryCode,
        lineOfBusinessSubTypeCode: selection.subTypeCode,
        pageKey,
        isOrgTemplate: resolution.isOrgTemplate,
        pageTemplate: resolution.definitionJson,
      });
    },
  );

  app.post(
    '/marketplace/risk-classes/:lob/schema',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Create or replace the draft schema template for an org + risk class',
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['definitionJson'],
          properties: {
            organizationId: { type: ['integer', 'null'] },
            pageKey: { type: 'string' },
            definitionJson: pageTemplateSchema,
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: { pageTemplate: pageTemplateSchema },
            required: ['pageTemplate'],
          },
          201: {
            type: 'object',
            properties: { pageTemplate: pageTemplateSchema },
            required: ['pageTemplate'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const body = (request.body ?? {}) as {
        organizationId?: number | null;
        pageKey?: string;
        definitionJson: PageTemplateDefinition;
      };
      const pageKey = String(body.pageKey ?? RISK_CLASS_PAGE_KEY).trim() || RISK_CLASS_PAGE_KEY;
      const resolvedOrganizationId = body.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const selection = parseLobParam(params.lob);

      const saved = await upsertRiskClassTemplate({
        organizationId: resolvedOrganizationId ?? null,
        pageKey,
        selection,
        definitionJson: body.definitionJson,
      });

      return reply.code(201).send({ pageTemplate: saved.definitionJson });
    },
  );

  app.post(
    '/marketplace/risk-classes/:lob/schema/fields',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Add a field to a risk-class schema template section',
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['sectionKey', 'field'],
          properties: {
            organizationId: { type: ['integer', 'null'] },
            pageKey: { type: 'string' },
            sectionKey: { type: 'string' },
            field: {
              type: 'object',
              required: ['key', 'label'],
              properties: {
                key: { type: 'string' },
                label: { type: 'string' },
                type: { type: 'string' },
                required: { type: 'boolean' },
              },
              additionalProperties: true,
            },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: { pageTemplate: pageTemplateSchema },
            required: ['pageTemplate'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const body = (request.body ?? {}) as {
        organizationId?: number | null;
        pageKey?: string;
        sectionKey: string;
        field: { key: string; label: string; type?: string; required?: boolean };
      };
      const pageKey = String(body.pageKey ?? RISK_CLASS_PAGE_KEY).trim() || RISK_CLASS_PAGE_KEY;

      try {
        const resolvedOrganizationId = body.organizationId ?? (await resolveOrganizationIdFromRequest(request));
        const pageTemplate = await addRiskClassField({
          organizationId: resolvedOrganizationId ?? null,
          pageKey,
          selection: parseLobParam(params.lob),
          sectionKey: body.sectionKey,
          field: body.field,
        });
        return reply.code(200).send({ pageTemplate });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add template field';
        const statusCode = /not found/i.test(message) ? 404 : 400;
        return reply.code(statusCode).send({ error: message });
      }
    },
  );

  app.delete(
    '/marketplace/risk-classes/:lob/schema/fields',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Remove a field from a risk-class schema template section',
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['sectionKey', 'fieldKey'],
          properties: {
            organizationId: { type: ['integer', 'null'] },
            pageKey: { type: 'string' },
            sectionKey: { type: 'string' },
            fieldKey: { type: 'string' },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: { pageTemplate: pageTemplateSchema },
            required: ['pageTemplate'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const body = (request.body ?? {}) as {
        organizationId?: number | null;
        pageKey?: string;
        sectionKey: string;
        fieldKey: string;
      };
      const pageKey = String(body.pageKey ?? RISK_CLASS_PAGE_KEY).trim() || RISK_CLASS_PAGE_KEY;

      try {
        const resolvedOrganizationId = body.organizationId ?? (await resolveOrganizationIdFromRequest(request));
        const pageTemplate = await removeRiskClassField({
          organizationId: resolvedOrganizationId ?? null,
          pageKey,
          selection: parseLobParam(params.lob),
          sectionKey: body.sectionKey,
          fieldKey: body.fieldKey,
        });
        return reply.code(200).send({ pageTemplate });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to remove template field';
        const statusCode = /not found/i.test(message) ? 404 : 400;
        return reply.code(statusCode).send({ error: message });
      }
    },
  );

  app.post(
    '/marketplace/risk-classes/:lob/schema/publish',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Compile the current draft template into a new immutable schema version',
        description:
          'Compiles the active draft template into an immutable, content-addressed risk_class_schema_versions row. Idempotent: republishing identical content returns the existing version.',
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        body: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
            pageKey: { type: 'string' },
            publishedByUserId: { type: ['integer', 'null'] },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              created: { type: 'boolean' },
              version: { type: 'object', additionalProperties: true },
            },
            required: ['created', 'version'],
          },
          201: {
            type: 'object',
            properties: {
              created: { type: 'boolean' },
              version: { type: 'object', additionalProperties: true },
            },
            required: ['created', 'version'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const body = (request.body ?? {}) as {
        organizationId?: number | null;
        pageKey?: string;
        publishedByUserId?: number | null;
      };
      const pageKey = String(body.pageKey ?? RISK_CLASS_PAGE_KEY).trim() || RISK_CLASS_PAGE_KEY;
      const resolvedOrganizationId = body.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const selection = parseLobParam(params.lob);
      const resolution = await findRiskClassTemplate(resolvedOrganizationId ?? null, pageKey, selection);

      const { version, created } = await publishSchemaVersion({
        organizationId: resolvedOrganizationId ?? null,
        lineOfBusinessCode: selection.primaryCode,
        lineOfBusinessSubTypeCode: selection.subTypeCode,
        pageKey,
        definitionJson: resolution.definitionJson,
        sourceTemplateId: resolution.sourceTemplateId,
        publishedByUserId: body.publishedByUserId ?? null,
      });

      return reply.code(created ? 201 : 200).send({ created, version: version.toJSON() });
    },
  );

  app.get(
    '/marketplace/risk-classes/:lob/schema/versions',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'List published schema versions (audit history) for an org + risk class',
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        querystring: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
            pageKey: { type: 'string' },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              versions: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
            required: ['versions'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const query = (request.query ?? {}) as { organizationId?: number | null; pageKey?: string };
      const pageKey = String(query.pageKey ?? RISK_CLASS_PAGE_KEY).trim() || RISK_CLASS_PAGE_KEY;
      const resolvedOrganizationId = query.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const selection = parseLobParam(params.lob);

      const rows = await RiskClassSchemaVersion.findAll({
        where: {
          organizationId: resolvedOrganizationId ?? null,
          lineOfBusinessCode: selection.primaryCode,
          lineOfBusinessSubTypeCode: selection.subTypeCode,
          pageKey,
        },
        order: [['schemaVersion', 'DESC']],
      });

      return reply.code(200).send({ versions: rows.map((row) => row.toJSON()) });
    },
  );

  app.get(
    '/marketplace/risk-classes/:lob/schema/versions/:v',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Fetch a frozen schema version + compiled JSON Schema',
        params: {
          type: 'object',
          required: ['lob', 'v'],
          properties: { lob: { type: 'string' }, v: { type: 'integer' } },
        },
        querystring: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
            pageKey: { type: 'string' },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              version: { type: 'object', additionalProperties: true },
            },
            required: ['version'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string; v: number };
      const query = (request.query ?? {}) as { organizationId?: number | null; pageKey?: string };
      const pageKey = String(query.pageKey ?? RISK_CLASS_PAGE_KEY).trim() || RISK_CLASS_PAGE_KEY;
      const resolvedOrganizationId = query.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const selection = parseLobParam(params.lob);

      const row = await RiskClassSchemaVersion.findOne({
        where: {
          organizationId: resolvedOrganizationId ?? null,
          lineOfBusinessCode: selection.primaryCode,
          lineOfBusinessSubTypeCode: selection.subTypeCode,
          pageKey,
          schemaVersion: Number(params.v),
        },
      });

      if (!row) {
        return reply.code(404).send({ error: 'Schema version not found' });
      }

      return reply.code(200).send({ version: row.toJSON() });
    },
  );

  // -------------------------------------------------------------------------
  // Risk Class Registry (Slice 2) — the behavior declaration bound to a risk
  // class, as DATA. `:lob` accepts `primaryCode` or `primaryCode/subTypeCode`.
  //
  // GET returns the org's declaration when one exists, otherwise the RESOLVED
  // default (org/platform ladder → generic default), so a caller always gets a
  // usable bundle. PUT upserts the org's declaration.
  //
  // NOTE: no modeling/pricing/appetite engine consumes these yet — Slice 2 ships
  // the spine and the socket only. Adoption is Slices 4/5.
  // -------------------------------------------------------------------------

  app.get(
    '/marketplace/risk-classes/:lob/registry',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Get the risk-class registry declaration (or resolved default) for an org + risk class',
        description:
          "Returns the org's stored registry declaration for the risk class when one exists, otherwise the resolved default (specificity ladder → generic default). Always returns a usable resolution.",
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        querystring: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              lineOfBusinessCode: { type: 'string' },
              lineOfBusinessSubTypeCode: { type: 'string' },
              hasOrgDeclaration: { type: 'boolean' },
              declaration: { type: ['object', 'null'], additionalProperties: true },
              resolution: { type: 'object', additionalProperties: true },
            },
            required: ['lineOfBusinessCode', 'lineOfBusinessSubTypeCode', 'hasOrgDeclaration', 'resolution'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const query = (request.query ?? {}) as { organizationId?: number | null };
      const resolvedOrganizationId = query.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const selection = parseLobParam(params.lob);

      // The org's own stored declaration (exact scope), if any.
      let declaration: RiskClassRegistry | null = null;
      try {
        declaration = await RiskClassRegistry.findOne({
          where: {
            organizationId: resolvedOrganizationId ?? null,
            lineOfBusinessCode: selection.primaryCode,
            lineOfBusinessSubTypeCode: selection.subTypeCode,
          },
        });
      } catch {
        // Degrade gracefully — fall back to the resolver below.
        declaration = null;
      }

      const resolution = await resolveRiskClass(
        resolvedOrganizationId ?? null,
        selection.primaryCode,
        selection.subTypeCode,
      );

      return reply.code(200).send({
        lineOfBusinessCode: selection.primaryCode,
        lineOfBusinessSubTypeCode: selection.subTypeCode,
        hasOrgDeclaration: Boolean(declaration),
        declaration: declaration ? declaration.toJSON() : null,
        resolution,
      });
    },
  );

  app.put(
    '/marketplace/risk-classes/:lob/registry',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Upsert the risk-class registry declaration for an org + risk class',
        description:
          'Upserts the org-scoped registry declaration (data, not code): modeling/rating method names, appetite dimensions, required data fields, default method params, and the active schema version.',
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        body: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
            activeSchemaVersionId: { type: ['integer', 'null'] },
            riskModelingMethod: { type: ['string', 'null'] },
            ratingMethod: { type: ['string', 'null'] },
            appetiteDimensionsJson: { type: 'object', additionalProperties: true },
            requiredDataFieldsJson: { type: 'array', items: { type: 'string' } },
            methodParamsJson: { type: 'object', additionalProperties: true },
            status: { type: 'string', enum: ['active', 'inactive'] },
            createdByUserId: { type: ['integer', 'null'] },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: { declaration: { type: 'object', additionalProperties: true } },
            required: ['declaration'],
          },
          201: {
            type: 'object',
            properties: { declaration: { type: 'object', additionalProperties: true } },
            required: ['declaration'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const body = (request.body ?? {}) as {
        organizationId?: number | null;
        activeSchemaVersionId?: number | null;
        riskModelingMethod?: string | null;
        ratingMethod?: string | null;
        appetiteDimensionsJson?: Record<string, unknown>;
        requiredDataFieldsJson?: string[];
        methodParamsJson?: Record<string, unknown>;
        status?: 'active' | 'inactive';
        createdByUserId?: number | null;
      };
      const resolvedOrganizationId = body.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const selection = parseLobParam(params.lob);

      const existed = await RiskClassRegistry.findOne({
        where: {
          organizationId: resolvedOrganizationId ?? null,
          lineOfBusinessCode: selection.primaryCode,
          lineOfBusinessSubTypeCode: selection.subTypeCode,
        },
      });

      const saved = await upsertRegistry({
        organizationId: resolvedOrganizationId ?? null,
        lineOfBusinessCode: selection.primaryCode,
        lineOfBusinessSubTypeCode: selection.subTypeCode,
        activeSchemaVersionId: body.activeSchemaVersionId,
        riskModelingMethod: body.riskModelingMethod,
        ratingMethod: body.ratingMethod,
        appetiteDimensionsJson: body.appetiteDimensionsJson,
        requiredDataFieldsJson: body.requiredDataFieldsJson,
        methodParamsJson: body.methodParamsJson,
        status: body.status,
        createdByUserId: body.createdByUserId ?? null,
      });

      return reply.code(existed ? 200 : 201).send({ declaration: saved.toJSON() });
    },
  );

  // -------------------------------------------------------------------------
  // Benchmark priors (Slice 5.0) — the credibility-weighting anchors bound to a
  // risk class. Same `:lob` convention and tenant/error patterns as the registry
  // routes above. `:lob` = primaryCode or primaryCode/subTypeCode.
  // -------------------------------------------------------------------------

  // Coverage report (Slice 5.3) — for each PRIMARY taxonomy line, whether a
  // PLATFORM-DEFAULT benchmark prior exists (cited) or it falls back to generic.
  // Read-only + additive. Registered BEFORE `/:lob` so the static `coverage`
  // segment is matched first (Fastify gives static segments priority anyway).
  app.get(
    '/marketplace/benchmark-priors/coverage',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Benchmark-prior coverage across the primary taxonomy lines',
        description:
          'For each of the primary line-of-business taxonomy codes, reports whether a platform-default benchmark prior is cited and where it resolves from (platform_primary / platform_subtype / none). Read-only.',
        response: {
          200: {
            type: 'object',
            properties: {
              summary: {
                type: 'object',
                properties: {
                  total: { type: 'integer' },
                  covered: { type: 'integer' },
                  uncovered: { type: 'integer' },
                },
                required: ['total', 'covered', 'uncovered'],
              },
              lines: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    label: { type: 'string' },
                    hasPlatformPrior: { type: 'boolean' },
                    resolvedFrom: { type: 'string' },
                    source: { type: ['string', 'null'] },
                  },
                  required: ['code', 'label', 'hasPlatformPrior', 'resolvedFrom', 'source'],
                },
              },
            },
            required: ['summary', 'lines'],
          },
        },
      },
    },
    async (_request, reply) => {
      const [primaries, priorInstances] = await Promise.all([
        LineOfBusinessPrimaryType.findAll({ order: [['sortOrder', 'ASC'], ['label', 'ASC']] }),
        BenchmarkPrior.findAll({ where: { organizationId: null, status: 'active' } }),
      ]);

      const taxonomyLines = primaries.map((p) => ({ code: p.code, label: p.label }));
      const platformRows: BenchmarkPriorRow[] = priorInstances.map((p) => {
        const json = p.toJSON() as Record<string, unknown>;
        const num = (v: unknown): number | null => {
          if (v == null) return null;
          const n = typeof v === 'number' ? v : Number(v);
          return Number.isFinite(n) ? n : null;
        };
        return {
          id: p.id,
          organizationId: p.organizationId,
          lineOfBusinessCode: p.lineOfBusinessCode,
          lineOfBusinessSubTypeCode: p.lineOfBusinessSubTypeCode,
          exposureBasis: p.exposureBasis ?? null,
          lossRate: num(json.lossRate),
          targetLossRatio: num(json.targetLossRatio),
          expenseRatio: num(json.expenseRatio),
          marginTarget: num(json.marginTarget),
          fullCredibilityStandard: num(json.fullCredibilityStandard),
          paramsJson: (p.paramsJson as Record<string, unknown>) ?? {},
          source: p.source,
          sourceUrl: p.sourceUrl ?? null,
          asOfDate: p.asOfDate ?? null,
          status: p.status,
        };
      });

      const lines = computeCoverage(taxonomyLines, platformRows);
      return reply.code(200).send({ summary: summarizeCoverage(lines), lines });
    },
  );

  app.get(
    '/marketplace/benchmark-priors/:lob',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Get the resolved benchmark prior for an org + risk class',
        description:
          "Returns the org's stored prior (exact scope) when one exists, plus the resolved prior via the specificity ladder (org+subtype → org+primary → platform+subtype → platform+primary → none). Every prior carries a required source citation.",
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        querystring: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              lineOfBusinessCode: { type: 'string' },
              lineOfBusinessSubTypeCode: { type: 'string' },
              hasOrgPrior: { type: 'boolean' },
              prior: { type: ['object', 'null'], additionalProperties: true },
              resolvedFrom: { type: 'string' },
              resolvedPrior: { type: ['object', 'null'], additionalProperties: true },
            },
            required: ['lineOfBusinessCode', 'lineOfBusinessSubTypeCode', 'hasOrgPrior', 'resolvedFrom'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const query = (request.query ?? {}) as { organizationId?: number | null };
      const resolvedOrganizationId = query.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const selection = parseLobParam(params.lob);

      let orgPrior: BenchmarkPrior | null = null;
      try {
        orgPrior = await BenchmarkPrior.findOne({
          where: {
            organizationId: resolvedOrganizationId ?? null,
            lineOfBusinessCode: selection.primaryCode,
            lineOfBusinessSubTypeCode: selection.subTypeCode,
          },
        });
      } catch {
        orgPrior = null;
      }

      const resolution = await resolveBenchmarkPrior(
        resolvedOrganizationId ?? null,
        selection.primaryCode,
        selection.subTypeCode,
      );

      return reply.code(200).send({
        lineOfBusinessCode: selection.primaryCode,
        lineOfBusinessSubTypeCode: selection.subTypeCode,
        hasOrgPrior: Boolean(orgPrior),
        prior: orgPrior ? orgPrior.toJSON() : null,
        resolvedFrom: resolution.resolvedFrom,
        resolvedPrior: resolution.prior,
      });
    },
  );

  app.put(
    '/marketplace/benchmark-priors/:lob',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Upsert the benchmark prior for an org + risk class',
        description:
          'Upserts the org-scoped benchmark prior (data, not code). A required source citation must be present when creating a new prior.',
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        body: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
            exposureBasis: { type: ['string', 'null'] },
            lossRate: { type: ['number', 'string', 'null'] },
            targetLossRatio: { type: ['number', 'string', 'null'] },
            expenseRatio: { type: ['number', 'string', 'null'] },
            marginTarget: { type: ['number', 'string', 'null'] },
            fullCredibilityStandard: { type: ['number', 'string', 'null'] },
            paramsJson: { type: 'object', additionalProperties: true },
            source: { type: 'string' },
            sourceUrl: { type: ['string', 'null'] },
            asOfDate: { type: ['string', 'null'] },
            status: { type: 'string', enum: ['active', 'inactive'] },
            createdByUserId: { type: ['integer', 'null'] },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: { prior: { type: 'object', additionalProperties: true } },
            required: ['prior'],
          },
          201: {
            type: 'object',
            properties: { prior: { type: 'object', additionalProperties: true } },
            required: ['prior'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const body = (request.body ?? {}) as {
        organizationId?: number | null;
        exposureBasis?: string | null;
        lossRate?: number | string | null;
        targetLossRatio?: number | string | null;
        expenseRatio?: number | string | null;
        marginTarget?: number | string | null;
        fullCredibilityStandard?: number | string | null;
        paramsJson?: Record<string, unknown>;
        source?: string;
        sourceUrl?: string | null;
        asOfDate?: string | null;
        status?: 'active' | 'inactive';
        createdByUserId?: number | null;
      };
      const resolvedOrganizationId = body.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const selection = parseLobParam(params.lob);

      const existed = await BenchmarkPrior.findOne({
        where: {
          organizationId: resolvedOrganizationId ?? null,
          lineOfBusinessCode: selection.primaryCode,
          lineOfBusinessSubTypeCode: selection.subTypeCode,
        },
      });

      try {
        const saved = await upsertBenchmarkPrior({
          organizationId: resolvedOrganizationId ?? null,
          lineOfBusinessCode: selection.primaryCode,
          lineOfBusinessSubTypeCode: selection.subTypeCode,
          exposureBasis: body.exposureBasis,
          lossRate: body.lossRate,
          targetLossRatio: body.targetLossRatio,
          expenseRatio: body.expenseRatio,
          marginTarget: body.marginTarget,
          fullCredibilityStandard: body.fullCredibilityStandard,
          paramsJson: body.paramsJson,
          source: body.source,
          sourceUrl: body.sourceUrl,
          asOfDate: body.asOfDate,
          status: body.status,
          createdByUserId: body.createdByUserId ?? null,
        });

        return reply.code(existed ? 200 : 201).send({ prior: saved.toJSON() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to upsert benchmark prior';
        return reply.code(400).send({ error: message });
      }
    },
  );

  app.get(
    '/marketplace/opportunities/active-pending-funding',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'List active opportunities pending funding',
        description: 'Returns active deal tranches where committed subscriptions are still below required capital.',
        querystring: {
          type: 'object',
          properties: {
            dealId: { type: 'integer' },
            dealName: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                dealId: { type: 'integer' },
                dealName: { type: 'string' },
                dealStatus: { type: 'string' },
                trancheId: { type: 'integer' },
                fundingState: { type: 'string', enum: ['new', 'partially_funded'] },
                trancheName: { type: 'string' },
                riskLevel: { type: 'string' },
                expectedReturnPct: { type: 'number' },
                maxLoss: { type: 'number' },
                durationMonths: { type: 'integer' },
                capitalRequired: { type: 'number' },
                committedCapital: { type: 'number' },
                fundedAmount: { type: 'number' },
                pendingAmount: { type: 'number' },
                fundingProgressPct: { type: 'number' },
                startDate: { type: 'string' },
                endDate: { type: 'string' },
                lineOfBusiness: { type: ['string', 'null'] },
                lineOfBusinessSubType: { type: ['string', 'null'] },
                latitude: { type: ['number', 'null'] },
                longitude: { type: ['number', 'null'] },
              },
              required: [
                'id',
                'dealId',
                'trancheId',
                'fundingState',
                'trancheName',
                'riskLevel',
                'expectedReturnPct',
                'maxLoss',
                'durationMonths',
                'capitalRequired',
                'committedCapital',
                'fundedAmount',
                'pendingAmount',
                'fundingProgressPct',
              ],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { dealId, dealName } = (request.query ?? {}) as { dealId?: number; dealName?: string };

      const include: any[] = [
        {
          model: Deal,
          as: 'deal',
          include: [{ model: RiskPortfolio, as: 'portfolio' }],
        },
        { model: TrancheSubscription, as: 'subscriptions' },
      ];

      if (dealId || dealName) {
        const dealWhere: any = {};
        if (dealId) dealWhere.id = dealId;
        if (dealName) dealWhere.name = String(dealName);
        include[0] = {
          model: Deal,
          as: 'deal',
          where: dealWhere,
          include: [{ model: RiskPortfolio, as: 'portfolio' }],
        };
      }

      const tranches = await Tranche.findAll({
        include,
        order: [['createdAt', 'DESC']],
      });

      // Collect tranche-level opportunity objects in a flat list so the
      // client receives a simple array of tranche opportunities.
      const trancheList: MarketplaceOpportunity[] = [];
      const portfolioIds = new Set<number>();
      const submissionIds = new Set<number>();
      const portfolioToDeal: Record<number, number> = {};
      const submissionToDeal: Record<number, number> = {};

      for (const trancheRecord of tranches) {
        const tranche = trancheRecord as unknown as TrancheWithRelations;
        const deal = tranche.deal;
        if (!deal || !ACTIVE_DEAL_STATUSES.has(deal.status)) {
          continue;
        }

        const subscriptions = (tranche.subscriptions ?? []).filter(
          (subscription) => OPEN_SUBSCRIPTION_STATUSES.has(String(subscription.status).toLowerCase()),
        );

        const capitalRequired = toNumber(tranche.capitalRequired);
        const fundedAmount = subscriptions.reduce((sum, subscription) => sum + toNumber(subscription.committedAmount), 0);
        const pendingAmount = Math.max(0, capitalRequired - fundedAmount);

        if (capitalRequired <= 0 || pendingAmount <= 0) {
          continue;
        }

        const maxLoss = Math.max(0, toNumber(tranche.layerMax) - toNumber(tranche.layerMin));
        const expectedReturnPct = toNumber(tranche.expectedReturn ?? tranche.returnRate) * 100;
        const startDt = new Date(deal.startDate as unknown as string | number | Date);
        const endDt = new Date(deal.endDate as unknown as string | number | Date);
        const durationMonths = monthsBetween(startDt, endDt);
        const fundingProgressPct = Math.min(100, (fundedAmount / capitalRequired) * 100);
        const fundingState = fundedAmount <= 0 ? 'new' : 'partially_funded';

        const latitude = Number(tranche.latitude);
        const longitude = Number(tranche.longitude);

        const contractType = deriveDealLineOfBusiness(
          deal.subjectsJson,
          deal.portfolio?.perilType
        );

        const trancheInfo: MarketplaceOpportunity = {
          id: `${deal.id}-${tranche.id}`,
          dealId: deal.id,
          dealName: deal.name,
          dealStatus: deal.status,
          trancheId: tranche.id,
          fundingState,
          trancheName: tranche.name,
          riskLevel: tranche.riskLevel,
          expectedReturnPct,
          maxLoss,
          durationMonths,
          capitalRequired,
          committedCapital: fundedAmount,
          fundedAmount,
          pendingAmount,
          fundingProgressPct,
          startDate: startDt.toISOString(),
          endDate: endDt.toISOString(),
          lineOfBusiness: contractType.lineOfBusiness,
          lineOfBusinessSubType: contractType.lineOfBusinessSubType,
          latitude: Number.isFinite(latitude) ? latitude : undefined,
          longitude: Number.isFinite(longitude) ? longitude : undefined,
        };
        trancheList.push(trancheInfo);

        // collect mapping for later policy-coordinate lookup
        if (deal.portfolioId) {
          portfolioIds.add(deal.portfolioId);
          portfolioToDeal[deal.portfolioId] = deal.id;
        }
        if (deal.submissionId) {
          submissionIds.add(deal.submissionId);
          submissionToDeal[deal.submissionId] = deal.id;
        }
      }
      // Fill missing opportunity coordinates from related policy models.
      try {
        const orClauses: any[] = [];
        if (portfolioIds.size > 0) orClauses.push({ portfolioId: { [Op.in]: Array.from(portfolioIds) } });
        if (submissionIds.size > 0) orClauses.push({ submissionId: { [Op.in]: Array.from(submissionIds) } });

        if (orClauses.length > 0) {
          const policies = await Policy.findAll({
            where: {
              [Op.and]: [
                { latitude: { [Op.ne]: null } },
                { longitude: { [Op.ne]: null } },
                { [Op.or]: orClauses },
              ],
            },
            order: [['id', 'ASC']],
          });

          const dealCoords = new Map<number, Array<{ latitude: number; longitude: number }>>();

          for (const policy of policies) {
            const mappedByPortfolio = policy.portfolioId ? portfolioToDeal[policy.portfolioId] : undefined;
            const mappedBySubmission = policy.submissionId ? submissionToDeal[policy.submissionId] : undefined;
            const mappedDealId = mappedByPortfolio ?? mappedBySubmission;
            if (!mappedDealId) {
              continue;
            }

            const latitude = Number((policy as any).latitude);
            const longitude = Number((policy as any).longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
              continue;
            }

            const existing = dealCoords.get(mappedDealId) ?? [];
            existing.push({ latitude, longitude });
            dealCoords.set(mappedDealId, existing);
          }

          const perDealCursor = new Map<number, number>();
          for (const opportunity of trancheList) {
            if (Number.isFinite(opportunity.latitude) && Number.isFinite(opportunity.longitude)) {
              continue;
            }

            const coords = dealCoords.get(opportunity.dealId);
            if (!coords || coords.length === 0) {
              continue;
            }

            const cursor = perDealCursor.get(opportunity.dealId) ?? 0;
            const selected = coords[cursor % coords.length];
            perDealCursor.set(opportunity.dealId, cursor + 1);

            opportunity.latitude = selected.latitude;
            opportunity.longitude = selected.longitude;
          }
        }
      } catch (err) {
        // ignore policy lookup failures; opportunities still return without coordinates
      }

      // Sort tranche-level opportunities by pending amount descending
      trancheList.sort((a, b) => b.pendingAmount - a.pendingAmount);

      return reply.code(200).send(trancheList);
    },
  );

  app.get(
    '/marketplace/summary/capital-exposure',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Aggregate capital exposure across active deals',
        response: {
          200: {
            type: 'object',
            properties: {
              totalCapitalRequired: { type: 'number' },
              totalCommitted: { type: 'number' },
              totalAvailable: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const tranches = await Tranche.findAll({ include: [{ model: Deal, as: 'deal' }, { model: TrancheSubscription, as: 'subscriptions' }] });

        let totalCapitalRequired = 0;
        let totalCommitted = 0;

        for (const t of tranches as any[]) {
          const deal = t.deal as Deal | undefined;
          if (!deal || !ACTIVE_DEAL_STATUSES.has(deal.status)) continue;

          // Prioritize explicit capitalRequired if present, otherwise fall back to layer range
          const capitalReq = toNumber(t.capitalRequired ?? Math.max(0, toNumber(t.layerMax) - toNumber(t.layerMin)));
          totalCapitalRequired += capitalReq;

          const funded = (t.subscriptions ?? []).reduce((sum: number, s: any) => sum + toNumber(s.committedAmount), 0);
          totalCommitted += funded;
        }

        const totalAvailable = Math.max(0, totalCapitalRequired - totalCommitted);

        return reply.code(200).send({ totalCapitalRequired, totalCommitted, totalAvailable });
      } catch (err) {
        app.log.error(err);
        return reply.code(500).send({ error: 'exposure_summary_failed' });
      }
    },
  );

  app.get(
    '/marketplace/metrics/capital-exposure',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Return capital exposure time series',
        querystring: {
          type: 'object',
          properties: {
            dealId: { type: 'integer' },
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                calculatedAt: { type: 'string', format: 'date-time' },
                value: { type: 'number' },
                dealId: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const qs = (request.query ?? {}) as { dealId?: number; start?: string; end?: string };
        const where: any = { metricType: 'capital_exposure' };
        if (qs.dealId) where.dealId = qs.dealId;
        if (qs.start && qs.end) {
          where.calculatedAt = { [Op.between]: [new Date(qs.start), new Date(qs.end)] };
        } else if (qs.start) {
          where.calculatedAt = { [Op.gte]: new Date(qs.start) };
        } else if (qs.end) {
          where.calculatedAt = { [Op.lte]: new Date(qs.end) };
        }

        const rows = await RiskMetric.findAll({ where, order: [['calculatedAt', 'ASC']] });

        const out = rows.map((r: any) => ({ calculatedAt: r.calculatedAt.toISOString(), value: Number(r.value), dealId: r.dealId }));
        return reply.code(200).send(out);
      } catch (err) {
        app.log.error(err);
        return reply.code(500).send({ error: 'metrics_query_failed' });
      }
    },
  );

  app.post(
    '/marketplace/deals',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Create a new deal and optional tranches',
        body: {
          type: 'object',
          properties: {
            spvId: { type: 'integer' },
            name: { type: 'string' },
            coverageLimit: { type: 'number' },
            attachmentPoint: { type: 'number' },
            exhaustionPoint: { type: 'number' },
            premium: { type: 'number' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            subjects: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  subjectLabel: { type: 'string' },
                  subjectIndex: { type: 'integer' },
                  lineOfBusiness: { type: ['string', 'null'] },
                  lineOfBusinessSubType: { type: ['string', 'null'] },
                  fieldValues: {
                    type: 'object',
                    additionalProperties: true,
                  },
                  locationText: { type: ['string', 'null'] },
                  assetType: { type: ['string', 'null'] },
                  constructionType: { type: ['string', 'null'] },
                  occupancyType: { type: ['string', 'null'] },
                  replacementCost: { type: ['number', 'null'] },
                  latitude: { type: ['number', 'null'] },
                  longitude: { type: ['number', 'null'] },
                  vulnerabilityScore: { type: ['number', 'null'] },
                },
                required: ['subjectLabel', 'subjectIndex'],
              },
            },
            tranches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  layerMin: { type: 'number' },
                  layerMax: { type: 'number' },
                  returnRate: { type: 'number' },
                  riskLevel: { type: 'string' },
                  capitalRequired: { type: 'number' },
                },
                required: ['name', 'layerMin', 'layerMax'],
              },
            },
          },
          required: ['name', 'coverageLimit', 'attachmentPoint', 'exhaustionPoint', 'premium', 'startDate', 'endDate'],
        },
        response: {
          201: { type: 'object' },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as any;
      const { spvId, name, coverageLimit, attachmentPoint, exhaustionPoint, premium, startDate, endDate, subjects, tranches } = body;
      const resolvedOrganizationId = body.organizationId ?? (await resolveOrganizationIdFromRequest(request));

      const normalizeText = (value: unknown): string | null => {
        if (typeof value !== 'string') {
          return null;
        }

        const trimmed = value.trim();
        return trimmed ? trimmed : null;
      };

      const subjectTemplateCache = new Map<string, Promise<FindInsuredSubjectsTemplateResult>>();
      const normalizedSubjects: DealSubjectRecord[] = Array.isArray(subjects)
        ? await Promise.all(
            subjects.map(async (subject: any, index: number) => {
              const templateResolution = await resolveSubjectTemplateForDeal({
                organizationId: resolvedOrganizationId ?? null,
                lineOfBusinessCode: subject.lineOfBusiness,
                lineOfBusinessSubTypeCode: subject.lineOfBusinessSubType,
                cache: subjectTemplateCache,
              });

              return buildDealSubjectRecord({
                subject: {
                  subjectId: subject.subjectId,
                  subjectLabel: subject.subjectLabel,
                  subjectIndex: subject.subjectIndex,
                  lineOfBusiness: normalizeText(subject.lineOfBusiness),
                  lineOfBusinessSubType: normalizeText(subject.lineOfBusinessSubType),
                  fieldValues: normalizeFieldValueMap(subject.fieldValues),
                  locationText: normalizeText(subject.locationText),
                  assetType: normalizeText(subject.assetType),
                  constructionType: normalizeText(subject.constructionType),
                  occupancyType: normalizeText(subject.occupancyType),
                  replacementCost: subject.replacementCost ?? null,
                  latitude: subject.latitude ?? null,
                  longitude: subject.longitude ?? null,
                  vulnerabilityScore: subject.vulnerabilityScore ?? null,
                },
                index,
                templateResolution,
              });
            }),
          )
        : [];

      const allSubjectIds = normalizedSubjects.map((subject) => String((subject as any).subjectId ?? '')).filter((subjectId) => subjectId.length > 0);

      const normalizeTrancheSelection = (selection: any) => {
        const mode: 'selective' | 'all' = selection?.mode === 'selective' ? 'selective' : 'all';
        const subjectIds = Array.isArray(selection?.subjectIds)
          ? selection.subjectIds.map((subjectId: unknown) => String(subjectId ?? '').trim()).filter((subjectId: string) => subjectId.length > 0)
          : [];

        return {
          mode,
          subjectIds: mode === 'all' ? allSubjectIds : subjectIds,
        };
      };

      if (!name) {
        return reply.code(400).send({ error: 'missing_required_fields' });
      }

      try {
        const sequelize = getSequelize();
        const result = await sequelize.transaction(async (tx) => {
          // If no spvId supplied, auto-create a platform SPV and entity.
          let finalSpvId = spvId ? Number(spvId) : null;
          let createdSpv: any = null;
          if (!finalSpvId) {
            const registration = `SPV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            const entity = await SPVEntity.create(
              { legalName: `${String(name)} SPV Entity`, registrationNumber: registration },
              { transaction: tx },
            );
            createdSpv = await SPV.create(
              { spvEntityId: entity.id, name: `${String(name)} SPV`, jurisdiction: 'Unknown', totalCapital: '0.00', status: 'raising' },
              { transaction: tx },
            );
            finalSpvId = createdSpv.id;
          }

          const createdDeal = await Deal.create(
            {
              spvId: Number(finalSpvId),
              name: String(name),
              status: 'draft',
              coverageLimit: String(coverageLimit ?? '0.00'),
              attachmentPoint: String(attachmentPoint ?? '0.00'),
              exhaustionPoint: String(exhaustionPoint ?? '0.00'),
              premium: String(premium ?? '0.00'),
              startDate,
              endDate,
              subjectsJson: normalizedSubjects,
            },
            { transaction: tx },
          );

          let createdTranches: any[] = [];
          if (Array.isArray(tranches) && tranches.length > 0) {
            const trancheRecords = tranches.map((t: any) => ({
              dealId: createdDeal.id,
              name: t.name,
              layerMin: String(t.layerMin ?? '0.00'),
              layerMax: String(t.layerMax ?? '0.00'),
              returnRate: String(t.returnRate ?? '0.00'),
              riskLevel: t.riskLevel ?? 'medium',
              capitalRequired: t.capitalRequired == null ? null : String(t.capitalRequired),
              subjectSelectionJson: normalizeTrancheSelection(t.subjectSelectionJson),
            }));
            createdTranches = await Tranche.bulkCreate(trancheRecords, { transaction: tx, returning: true });
          }

          return { deal: createdDeal, tranches: createdTranches, spv: createdSpv };
        });

        return reply.code(201).send(result);
      } catch (err) {
        app.log.error(err);
        return reply.code(500).send({ error: 'create_deal_failed' });
      }
    },
  );
};
