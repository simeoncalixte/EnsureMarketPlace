import type { PageTemplateDefinition, PageTemplateOption } from '../../db/models/pageTemplates.models';
import {
  SubmissionFormContext,
  SuggestedFieldType,
  SuggestedFormDefinition,
  SuggestedFormField,
  SuggestedFormSection,
} from './types';

// ---------------------------------------------------------------------------
// This module is PURE. It does three things, all deterministic and unit-testable
// without a network or database:
//   gatherContext      -> distill prior-stage outputs into a SubmissionFormContext
//   buildBaselineSchema -> the standard create-coverage form, tailored to context
//                          (this is BOTH the LLM's starting point AND the fallback)
//   coerceFormSchema   -> validate a raw (LLM) object into a strict, safe form,
//                          always grafting back any baseline section the model dropped
// ---------------------------------------------------------------------------

export const SCHEMA_VERSION = 1;
export const PAGE_KEY = 'create-coverage';

/** Field types the suggested form may use; anything else coerces to 'text'. */
export const ALLOWED_FIELD_TYPES: readonly SuggestedFieldType[] = [
  'text',
  'textarea',
  'number',
  'integer',
  'select',
  'boolean',
  'radio',
  'date',
  'currency',
  'percentage',
];

const ALLOWED_FIELD_TYPE_SET = new Set<string>(ALLOWED_FIELD_TYPES);

// --- coercion helpers --------------------------------------------------------

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(/[$,%\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function slugify(value: unknown, fallback: string): string {
  const s = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return s || fallback;
}

function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// --- 1. context gathering ----------------------------------------------------

/**
 * Distill the accumulated pipeline payload (classification + extraction +
 * validation outputs, each keyed by stage name) into the flat context the form
 * builder and the LLM reason about. Defensive: every read tolerates a missing or
 * differently-shaped prior stage.
 */
export function gatherContext(payload: unknown): SubmissionFormContext {
  const p = toRecord(payload);
  const submission = toRecord(p.submission);
  const classification = toRecord(p.classification);
  const extractionStage = toRecord(p.extraction);
  // Extraction nests its entities under structuredData; tolerate a flat shape too.
  const entities = { ...toRecord(extractionStage.structuredData), ...stripEnvelope(extractionStage) };
  const validation = toRecord(p.validation);
  const schemaValidation = toRecord(validation.schemaValidation);

  const rawSubjects = Array.isArray(entities.subjects) ? (entities.subjects as unknown[]) : [];
  const subjects = rawSubjects.map((s) => toRecord(s)).filter((s) => Object.keys(s).length > 0);

  return {
    submissionId: asNumber(submission.id),
    tenantId: asNumber(submission.tenantId),
    lineOfBusinessCode: asString(classification.lineOfBusinessCode),
    lineOfBusinessLabel: asString(classification.lineOfBusinessLabel),
    lineOfBusinessSubTypeCode: asString(classification.lineOfBusinessSubTypeCode),
    lineOfBusinessSubTypeLabel: asString(classification.lineOfBusinessSubTypeLabel),
    riskType: asString(entities.riskType),
    triggerType: asString(entities.triggerType),
    limit: asNumber(entities.limit),
    deductible: asNumber(entities.deductible),
    expectedYield: asNumber(entities.expectedYield),
    effectiveDate: asString(entities.effectiveDate),
    jurisdiction: asString(entities.jurisdiction ?? entities.propertyLocation),
    propertyLocation: asString(entities.propertyLocation),
    subjectCount: asNumber(entities.subjectCount) ?? (subjects.length > 0 ? subjects.length : null),
    subjects,
    validationDecision: asString(validation.decision),
    missingRequired: Array.isArray(schemaValidation.missingRequired)
      ? (schemaValidation.missingRequired as unknown[]).map((v) => String(v)).filter(Boolean)
      : [],
  };
}

/** Drop the stage envelope keys so they don't masquerade as entity fields. */
function stripEnvelope(stage: Record<string, unknown>): Record<string, unknown> {
  const { ok, service, structuredData, persistedFields, ...rest } = stage;
  void ok;
  void service;
  void structuredData;
  void persistedFields;
  return rest;
}

// --- 2. baseline (base template) form ---------------------------------------

/** The seven canonical create-coverage sections, in page order. */
export const BASE_SECTION_KEYS = [
  'deal-parameters',
  'financials',
  'insured-subjects',
  'tranche-structure',
  'validation',
  'submission',
  'signing',
] as const;

/**
 * The standardized base template — the ENTIRE create-coverage page structure,
 * always present and never overridden. Data-entry sections (Deal Parameters,
 * Financials) carry dynamic fields the AI may extend; the rich workflow sections
 * (Subjects, Tranche Structure, Validation, Submission, Signing) are rendered by
 * their existing components (marked via `component`). The AI extends this base —
 * adding line-of-business-specific fields and, when needed, new sections.
 *
 * When an organization already has a published create-coverage template for the
 * line of business, the service substitutes that as the base (see service.ts);
 * this hardcoded structure is the fallback.
 */
export function buildBaselineSchema(context: SubmissionFormContext): SuggestedFormDefinition {
  const sections: SuggestedFormSection[] = [
    dealParametersSection(),
    financialsSection(),
    componentSection('insured-subjects', 'Insured Subjects', 3, 'subjects', subjectsDescription(context)),
    componentSection('tranche-structure', 'Tranche Structure', 4, 'tranches', 'Layered capacity structure for the coverage.'),
    componentSection('validation', 'Validation', 5, 'validation', 'Automated checks and live exposure for the submission.'),
    componentSection('submission', 'Submission', 6, 'submission', 'Review and submit the structured deal.'),
    componentSection('signing', 'Signing', 7, 'signing', 'Signing and execution checklist.'),
  ];

  const lobLabel = context.lineOfBusinessLabel ?? context.lineOfBusinessCode;
  return {
    schemaVersion: SCHEMA_VERSION,
    pageKey: PAGE_KEY,
    title: lobLabel ? `Create Coverage — ${lobLabel}` : 'Create Coverage',
    description: 'Standardized create-coverage form, extended for this submission.',
    sections: sections.map(reindexSection),
  };
}

/**
 * Adopt an organization's existing create-coverage template as the base, instead
 * of the hardcoded one — so a tenant's customized line-of-business structure is
 * reused. The org sections become the base (tagged 'base'); any workflow
 * component sections missing from the org template are appended from the
 * hardcoded base so the full page structure is always present. (pure)
 */
export function adoptOrgTemplateAsBase(
  orgDefinition: PageTemplateDefinition,
  context: SubmissionFormContext,
): SuggestedFormDefinition {
  const hardcoded = buildBaselineSchema(context);
  const orgSections: SuggestedFormSection[] = (orgDefinition.sections ?? []).map((section) => ({
    ...section,
    origin: 'base' as const,
    fields: (section.fields ?? []).map((field) => ({ ...field, origin: 'base' as const })),
  }));
  const present = new Set(orgSections.map((section) => section.key));
  const missingComponents = hardcoded.sections.filter((section) => section.component && !present.has(section.key));

  return {
    schemaVersion: SCHEMA_VERSION,
    pageKey: PAGE_KEY,
    title: orgDefinition.title ?? hardcoded.title,
    description: orgDefinition.description ?? hardcoded.description,
    sections: [...orgSections, ...missingComponents].map(reindexSection),
  };
}

/** Tag a section and its fields as base scaffold. */
function asBase(section: Omit<SuggestedFormSection, 'origin'>): SuggestedFormSection {
  return {
    ...section,
    origin: 'base',
    fields: section.fields.map((field) => ({ ...field, origin: 'base' as const })),
  };
}

/** A base section rendered by an existing rich component rather than dynamic fields. */
function componentSection(
  key: string,
  label: string,
  order: number,
  component: string,
  description: string,
): SuggestedFormSection {
  return { key, label, order, description, component, origin: 'base', fields: [] };
}

function subjectsDescription(context: SubmissionFormContext): string {
  const count = context.subjectCount ?? context.subjects.length;
  return count > 1
    ? `Portfolio of ${count} insured objects — one card per subject of insurance.`
    : 'The object(s) of insurance covered by this submission.';
}

function dealParametersSection(): SuggestedFormSection {
  return asBase({
    key: 'deal-parameters',
    label: 'Deal Parameters',
    order: 1,
    description: 'Core identifiers and coverage period for the submission.',
    fields: [
      { key: 'dealName', label: 'Deal Name / ID', type: 'text', order: 1, required: true },
      { key: 'cedingEntity', label: 'Ceding Entity', type: 'text', order: 2, canonicalKey: 'cedent' },
      { key: 'effectiveDate', label: 'Effective Date', type: 'date', order: 3, required: true, canonicalKey: 'effectiveDate' },
      { key: 'expirationDate', label: 'Expiration Date', type: 'date', order: 4 },
      { key: 'perilType', label: 'Peril / Risk Type', type: 'text', order: 5, canonicalKey: 'riskType' },
      { key: 'jurisdiction', label: 'Jurisdiction', type: 'text', order: 6, canonicalKey: 'jurisdiction' },
    ],
  });
}

function financialsSection(): SuggestedFormSection {
  return asBase({
    key: 'financials',
    label: 'Financials',
    order: 2,
    description: 'Limit structure and economics for the coverage.',
    fields: [
      { key: 'coverageLimit', label: 'Coverage Limit', type: 'currency', order: 1, required: true, canonicalKey: 'limit' },
      { key: 'attachmentPoint', label: 'Attachment Point', type: 'currency', order: 2 },
      { key: 'exhaustionPoint', label: 'Exhaustion Point', type: 'currency', order: 3 },
      { key: 'deductible', label: 'Deductible', type: 'currency', order: 4, canonicalKey: 'deductible' },
      { key: 'premium', label: 'Premium', type: 'currency', order: 5 },
      { key: 'expectedYield', label: 'Expected Yield', type: 'percentage', order: 6, canonicalKey: 'expectedYield' },
    ],
  });
}

// --- 2b. value prefill -------------------------------------------------------

/** Map a field's canonical key to the matching value from the submission context. */
function canonicalValues(context: SubmissionFormContext): Record<string, string | number | null> {
  return {
    effectiveDate: context.effectiveDate,
    riskType: context.riskType,
    triggerType: context.triggerType,
    limit: context.limit,
    deductible: context.deductible,
    expectedYield: context.expectedYield,
    jurisdiction: context.jurisdiction,
    propertyLocation: context.propertyLocation,
  };
}

/**
 * Populate each field's `value` from the submission's extracted data, matched by
 * `canonicalKey` (falling back to the field key). Pure — returns a new schema so
 * the form opens pre-filled with what the pipeline already knows.
 */
export function prefillSchema(schema: SuggestedFormDefinition, context: SubmissionFormContext): SuggestedFormDefinition {
  const values = canonicalValues(context);
  return {
    ...schema,
    sections: schema.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field) => {
        const key = field.canonicalKey ?? field.key;
        const value = values[key];
        return value === undefined || value === null ? field : { ...field, value };
      }),
    })),
  };
}

// --- 2c. reusable-template write-back ----------------------------------------

/**
 * Strip per-submission state so a generated form can be stored as a reusable,
 * line-of-business-keyed PageTemplate. Today that means dropping each field's
 * prefilled `value` (which belongs to one submission); the structural definition
 * — sections, fields, types, origin tags — is what's reusable. Pure.
 */
export function toStorableTemplate(schema: SuggestedFormDefinition): SuggestedFormDefinition {
  return {
    ...schema,
    sections: schema.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field) => {
        const { value, ...rest } = field;
        void value;
        return rest;
      }),
    })),
  };
}

/**
 * Append-only union of an existing stored template with a freshly generated one.
 * Everything already in `existing` is preserved exactly — sections keep their
 * label/description/order and every field stays put. Sections present only in
 * `incoming` are appended; for sections that overlap by key, only brand-new
 * fields (deduped by key) are added to the existing section. Nothing is ever
 * removed or overwritten.
 *
 * This is how repeated submissions for the same line of business ACCUMULATE into
 * one reusable template instead of replacing it: each new AI suggestion extends
 * the template that already exists. Pure.
 */
export function mergeTemplateDefinitions(
  existing: SuggestedFormDefinition,
  incoming: SuggestedFormDefinition,
): SuggestedFormDefinition {
  const existingSections = existing.sections ?? [];
  const incomingByKey = new Map((incoming.sections ?? []).map((section) => [section.key, section]));
  const existingKeys = new Set(existingSections.map((section) => section.key));

  const mergedExisting = existingSections.map((section) => {
    const match = incomingByKey.get(section.key);
    if (!match) return section;
    const haveFieldKeys = new Set(section.fields.map((field) => field.key));
    const additions = (match.fields ?? []).filter((field) => !haveFieldKeys.has(field.key));
    return additions.length ? { ...section, fields: [...section.fields, ...additions] } : section;
  });

  const newSections = (incoming.sections ?? []).filter((section) => !existingKeys.has(section.key));

  return {
    schemaVersion: existing.schemaVersion ?? incoming.schemaVersion ?? SCHEMA_VERSION,
    pageKey: existing.pageKey ?? incoming.pageKey ?? PAGE_KEY,
    title: existing.title ?? incoming.title,
    description: existing.description ?? incoming.description,
    sections: [...mergedExisting, ...newSections].map(reindexSection),
  };
}

// --- 3. coercion / merge of an LLM-produced form -----------------------------

/**
 * Merge a raw (LLM) object into the base template: the base sections and their
 * fields are ALWAYS preserved; the AI may only EXTEND a base data section with
 * new fields, or add wholly new sections. Component (workflow) base sections are
 * never field-extended. AI fields/sections are tagged `origin: 'ai'`. This makes
 * the output a standardized base that the AI tailored — never an override.
 */
export function coerceFormSchema(raw: unknown, baseline: SuggestedFormDefinition): SuggestedFormDefinition {
  const r = toRecord(raw);
  const rawSections = Array.isArray(r.sections) ? (r.sections as unknown[]) : [];

  const baseByKey = new Map(baseline.sections.map((section) => [section.key, section]));
  const extensionsByBaseKey = new Map<string, SuggestedFormField[]>();
  const newSections: SuggestedFormSection[] = [];
  const seenNewKeys = new Set<string>(baseByKey.keys());

  for (let i = 0; i < rawSections.length; i++) {
    const s = toRecord(rawSections[i]);
    const label = asString(s.label) ?? asString(s.key);
    if (!label) continue;
    const slug = slugify(s.key ?? label, `section-${i + 1}`);

    const aiFields = coerceFields(s.fields).map((field) => ({ ...field, origin: 'ai' as const }));

    const base = baseByKey.get(slug);
    if (base) {
      // Extension of a base section — append only brand-new fields, never override.
      if (base.component || aiFields.length === 0) continue;
      const existing = new Set(base.fields.map((field) => field.key));
      const additions = aiFields.filter((field) => !existing.has(field.key));
      if (additions.length) {
        extensionsByBaseKey.set(slug, [...(extensionsByBaseKey.get(slug) ?? []), ...additions]);
      }
      continue;
    }

    // A wholly new, AI-suggested section.
    if (aiFields.length === 0) continue;
    let key = slug;
    while (seenNewKeys.has(key)) key = `${key}-${i + 1}`;
    seenNewKeys.add(key);
    newSections.push({
      key,
      label,
      order: 0,
      description: asString(s.description) ?? undefined,
      repeatable: s.repeatable === true ? true : undefined,
      origin: 'ai',
      fields: aiFields,
    });
  }

  const mergedBase = baseline.sections.map((base) => {
    const additions = extensionsByBaseKey.get(base.key);
    if (!additions || base.component) return base;
    return { ...base, fields: [...base.fields, ...additions] };
  });

  const sections = [...mergedBase, ...newSections].map(reindexSection);

  return {
    schemaVersion: SCHEMA_VERSION,
    pageKey: PAGE_KEY,
    title: asString(r.title) ?? baseline.title,
    description: baseline.description,
    sections,
  };
}

/** Coerce a raw `fields` array into clean, de-duplicated fields. */
function coerceFields(raw: unknown): SuggestedFormField[] {
  const rawFields = Array.isArray(raw) ? (raw as unknown[]) : [];
  const fieldKeys = new Set<string>();
  const fields: SuggestedFormField[] = [];
  for (let i = 0; i < rawFields.length; i++) {
    const field = coerceField(rawFields[i], i, fieldKeys);
    if (field) fields.push(field);
  }
  return fields;
}

function coerceField(raw: unknown, index: number, seenKeys: Set<string>): SuggestedFormField | null {
  const f = toRecord(raw);
  const label = asString(f.label) ?? asString(f.key);
  if (!label) return null;

  let key = slugifyCamel(f.key ?? label, `field-${index + 1}`);
  while (seenKeys.has(key)) key = `${key}${index + 1}`;
  seenKeys.add(key);

  const typeRaw = String(f.type ?? '').trim().toLowerCase();
  const type: SuggestedFieldType = ALLOWED_FIELD_TYPE_SET.has(typeRaw) ? (typeRaw as SuggestedFieldType) : 'text';

  const field: SuggestedFormField = {
    key,
    label,
    type,
    order: asNumber(f.order) ?? index + 1,
  };
  if (f.required === true) field.required = true;
  const placeholder = asString(f.placeholder);
  if (placeholder) field.placeholder = placeholder;
  const helperText = asString(f.helperText);
  if (helperText) field.helperText = helperText;
  const canonicalKey = asString(f.canonicalKey);
  if (canonicalKey) field.canonicalKey = canonicalKey;

  if (type === 'select' || type === 'radio') {
    const opts = coerceOptions(f.options);
    if (opts.length > 0) field.options = opts;
  }
  return field;
}

function coerceOptions(raw: unknown): PageTemplateOption[] {
  if (!Array.isArray(raw)) return [];
  const out: PageTemplateOption[] = [];
  for (const entry of raw) {
    if (typeof entry === 'string') {
      const v = entry.trim();
      if (v) out.push({ value: slugify(v, v), label: humanize(v) });
      continue;
    }
    const o = toRecord(entry);
    const value = asString(o.value) ?? asString(o.label);
    const label = asString(o.label) ?? asString(o.value);
    if (value && label) out.push({ value, label });
  }
  return out.slice(0, 50);
}

/**
 * Normalize a field key to a camelCase identifier. An input that is already a
 * valid identifier (e.g. "coverageLimit") is preserved as-is — crucial so AI
 * fields dedupe correctly against base field keys — while multi-word labels
 * ("Index / Oracle Source") become camelCase ("indexOracleSource").
 */
function slugifyCamel(value: unknown, fallback: string): string {
  const raw = String(value ?? '').trim();
  if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(raw)) return raw.slice(0, 60);

  const parts = raw.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  const [head, ...tail] = parts;
  const camel = head.charAt(0).toLowerCase() + head.slice(1) + tail.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  return camel.slice(0, 60) || fallback;
}

/** Re-number sections and their fields to a clean 1..n order. */
function reindexSection(section: SuggestedFormSection, index: number): SuggestedFormSection {
  return {
    ...section,
    order: index + 1,
    fields: section.fields
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((field, i) => ({ ...field, order: i + 1 })),
  };
}
