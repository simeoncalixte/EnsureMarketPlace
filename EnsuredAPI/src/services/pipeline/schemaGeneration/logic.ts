import type { PageTemplateDefinition, PageTemplateOption } from '../../../db/models/pageTemplates.models';
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

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const s = asString(value);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function partyCandidates(entities: Record<string, unknown>): Array<{ role: string; name: string; source: string }> {
  const candidates: Array<{ role: string; name: string; source: string }> = [];
  const add = (role: string, value: unknown, source: string) => {
    const name = asString(value);
    if (name) candidates.push({ role, name, source });
  };
  add('broker', entities.brokerName ?? entities.broker, 'extraction');
  add('carrier', entities.carrierName ?? entities.insurerCarrier, 'extraction');
  add('cedent', entities.cedentName ?? entities.cedingEntity, 'extraction');
  add('insured', entities.namedInsured, 'extraction');
  return candidates;
}

function subjectPerilInventory(subjects: Record<string, unknown>[], entities: Record<string, unknown>): string[] {
  return uniqueStrings([
    ...subjects.flatMap((subject) => {
      const attrs = toRecord(subject.attributes);
      const raw = subject.perilCodes ?? attrs.perilCodes ?? attrs.perils;
      return Array.isArray(raw) ? raw.map((value) => asString(value)) : [asString(raw)];
    }),
    asString(entities.riskType),
    asString(entities.perilType),
  ]);
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
  const insuredSubjects = toRecord(p.insuredSubjects);
  const canonicalSubmission = toRecord(p.canonicalSubmission);
  const canonicalData = toRecord(canonicalSubmission.data);
  const canonicalSubmissionView = toRecord(p.canonical ?? canonicalData.canonical);
  const filterIndex = toRecord(canonicalData.filterIndex);

  const rawSubjects = Array.isArray(insuredSubjects.subjects)
    ? (insuredSubjects.subjects as unknown[])
    : Array.isArray(entities.subjects)
      ? (entities.subjects as unknown[])
      : [];
  const subjects = rawSubjects.map((s) => toRecord(s)).filter((s) => Object.keys(s).length > 0);
  const filterableCanonicalKeys = [
    'brokerName',
    'carrierName',
    'cedentName',
    'subjectPerils',
    'subjectTiv',
    'subjectLimit',
    'subjectAttachment',
    'lineOfBusinessCode',
    'lineOfBusinessSubTypeCode',
    'submissionTypeCode',
    'locationText',
    'latitude',
    'longitude',
  ];

  return {
    submissionId: asNumber(submission.id),
    organizationId: asNumber(submission.organizationId),
    lineOfBusinessCode: asString(classification.lineOfBusinessCode),
    lineOfBusinessLabel: asString(classification.lineOfBusinessLabel),
    lineOfBusinessSubTypeCode: asString(classification.lineOfBusinessSubTypeCode),
    lineOfBusinessSubTypeLabel: asString(classification.lineOfBusinessSubTypeLabel),
    namedInsured: asString(entities.namedInsured),
    insuredSubject: asString(entities.insuredSubject),
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
    canonicalSubmissionView,
    extractedPartyCandidates: partyCandidates(entities),
    resolvedOrganizations: {
      broker: {
        id: asNumber(filterIndex.brokerOrganizationId),
        name: asString(filterIndex.brokerOrganizationName),
        status: asString(filterIndex.brokerOrganizationStatus),
      },
      carrier: {
        id: asNumber(filterIndex.carrierOrganizationId),
        name: asString(filterIndex.carrierOrganizationName),
        status: asString(filterIndex.carrierOrganizationStatus),
      },
    },
    unresolvedPartyCandidates: Array.isArray(canonicalData.unresolvedPartyCandidates)
      ? (canonicalData.unresolvedPartyCandidates as unknown[]).map(toRecord)
      : [],
    subjectPerils: subjectPerilInventory(subjects, entities),
    subjectFinancials: subjects.map((subject) => {
      const attrs = toRecord(subject.attributes);
      return {
        tiv: asNumber(subject.tiv ?? attrs.tiv ?? attrs.total_insured_value),
        limit: asNumber(subject.limit ?? subject.coverageLimit ?? attrs.limit ?? attrs.coverage_limit),
        attachment: asNumber(subject.attachment ?? subject.attachmentPoint ?? attrs.attachment ?? attrs.attachment_point),
      };
    }),
    filterableCanonicalKeys,
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

/** The canonical create-coverage sections, in page order. */
export const BASE_SECTION_KEYS = [
  'general-information',
  'financials',
  'insured-subjects',
  'documents',
  'tranche-structure',
  'validation',
  'submission',
  'signing',
] as const;

/**
 * The schema-generation stage owns only submission-level details and placement
 * economics. Risk-specific fields belong to the reusable insured-subject
 * templates, which render inside each subject card rather than as page tabs.
 */
export const AI_EXTENSIBLE_SECTION_KEYS = ['general-information', 'financials'] as const;
const AI_EXTENSIBLE_SECTION_KEY_SET = new Set<string>(AI_EXTENSIBLE_SECTION_KEYS);

/**
 * Legacy section keys mapped to their current base key, so templates stored (or
 * model output produced) before a rename keep landing in the right section
 * instead of spawning a duplicate.
 */
export const LEGACY_SECTION_KEY_ALIASES: Readonly<Record<string, string>> = {
  'deal-parameters': 'general-information',
};

/** Resolve a section key through the legacy aliases. */
function canonicalSectionKey(key: string): string {
  return LEGACY_SECTION_KEY_ALIASES[key] ?? key;
}

/**
 * Detect specialist tabs created by the former schema-generation policy. The
 * label/key fallback covers snapshots produced after an old AI section was
 * adopted into an org template and consequently relabelled as a base section.
 */
function isDeprecatedSpecialistSection(section: SuggestedFormSection): boolean {
  if (BASE_SECTION_KEYS.includes(canonicalSectionKey(section.key) as typeof BASE_SECTION_KEYS[number])) return false;
  if (section.origin === 'ai') return true;
  return /(?:risk[-_\s]?characteristics|marine|cargo|property[-_\s]?details)/i.test(`${section.key} ${section.label}`);
}

/** Drop deprecated AI-created specialist tabs while preserving human sections. */
export function stripAiSpecialistSections(schema: SuggestedFormDefinition): SuggestedFormDefinition {
  return {
    ...schema,
    sections: (schema.sections ?? []).filter((section) => !isDeprecatedSpecialistSection(section)),
  };
}

/**
 * Former platform-default labels per base section. A stored template still
 * carrying one of these gets the current label — the old name was the platform
 * default, not an org customization.
 */
const LEGACY_SECTION_LABELS: Readonly<Record<string, readonly string[]>> = {
  'general-information': ['Deal Parameters', 'Deal Information'],
};

/**
 * The standardized base template — the ENTIRE create-coverage page structure,
 * always present and never overridden. Data-entry sections (General Information,
 * Financials) carry dynamic fields the AI may extend; the rich workflow sections
 * (Subjects, Documents, Tranche Structure, Validation, Submission, Signing) are
 * rendered by their existing components (marked via `component`). The AI extends
 * this base — adding line-of-business-specific fields and, only when a cohesive
 * theme fits nowhere else, new sections.
 *
 * When an organization already has a published create-coverage template for the
 * line of business, the service substitutes that as the base (see service.ts);
 * this hardcoded structure is the fallback.
 */
export function buildBaselineSchema(context: SubmissionFormContext): SuggestedFormDefinition {
  const sections: SuggestedFormSection[] = [
    generalInformationSection(),
    financialsSection(),
    componentSection('insured-subjects', 'Insured Subjects', 3, 'subjects', subjectsDescription(context)),
    componentSection('documents', 'Documents', 4, 'documents', 'Files attached to the submission, with previews.'),
    componentSection('tranche-structure', 'Tranche Structure', 5, 'tranches', 'Layered capacity structure for the coverage.'),
    componentSection('validation', 'Validation', 6, 'validation', 'Automated checks and live exposure for the submission.'),
    componentSection('submission', 'Submission', 7, 'submission', 'Review and submit the structured deal.'),
    componentSection('signing', 'Signing', 8, 'signing', 'Signing and execution checklist.'),
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
  const hardcodedByKey = new Map(hardcoded.sections.map((section) => [section.key, section]));
  const orgSections: SuggestedFormSection[] = stripAiSpecialistSections(orgDefinition as SuggestedFormDefinition).sections.map((section) => {
    const key = canonicalSectionKey(section.key);
    // A section stored under a legacy key OR still carrying a former default
    // label takes the successor's label/description — those were platform
    // defaults, not org customizations.
    const legacyNamed = key !== section.key || (LEGACY_SECTION_LABELS[key] ?? []).includes(section.label);
    const renamed = legacyNamed ? hardcodedByKey.get(key) : undefined;
    return {
      ...section,
      key,
      label: renamed?.label ?? section.label,
      description: renamed?.description ?? section.description,
      origin: 'base' as const,
      fields: (section.fields ?? []).map((field) => ({ ...field, origin: 'base' as const })),
    };
  });

  // Append-only graft of the platform defaults: an org data section that
  // overlaps a hardcoded base section gains any base fields it is missing (so
  // templates stored before a defaults change still carry the expected
  // defaults), while every org customization is preserved exactly.
  const grafted = orgSections.map((section) => {
    const counterpart = hardcodedByKey.get(section.key);
    if (!counterpart || counterpart.component || section.component) return section;
    const have = new Set(section.fields.map((field) => field.key));
    const additions = counterpart.fields.filter((field) => !have.has(field.key));
    return additions.length ? { ...section, fields: [...section.fields, ...additions] } : section;
  });

  // Every hardcoded base section missing from the org template is appended —
  // component (workflow) sections AND data sections — so the full standardized
  // page structure (including Documents) is always present.
  const present = new Set(grafted.map((section) => section.key));
  const missingSections = hardcoded.sections.filter((section) => !present.has(section.key));

  return {
    schemaVersion: SCHEMA_VERSION,
    pageKey: PAGE_KEY,
    title: orgDefinition.title ?? hardcoded.title,
    description: orgDefinition.description ?? hardcoded.description,
    sections: [...grafted, ...missingSections].map(reindexSection),
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

/**
 * The first section holds HIGH-LEVEL details ABOUT THE SUBMISSION ITSELF —
 * submission-level metadata that is the same regardless of the specific risk or
 * insured object: identifiers, parties (insurer/cedent/broker), broker notes,
 * coverage period, territory, currency. Line-of-business-specific and
 * subject-specific detail is deliberately kept OUT — the schema agent delegates
 * those to specialist sections and repeatable subject schedules (see the prompt
 * in GeminiSchemaProvider, rules 4/4a/4b). This section still carries the common
 * submission fields so the agent extends it instead of spawning near-duplicate
 * "deal info" / "general details" sections.
 *
 * `namedInsured` carries `canonicalKey: 'namedInsured'`, the insured party the
 * extraction stage already resolves — so the most fundamental field of any
 * submission is in the default schema and prefilled (see `canonicalValues`).
 */
function generalInformationSection(): SuggestedFormSection {
  return asBase({
    key: 'general-information',
    label: 'General Information',
    order: 1,
    description: 'Identifiers, parties, coverage period, and general context for the submission.',
    fields: [
      { key: 'dealName', label: 'Deal Name / ID', type: 'text', order: 1, required: true },
      { key: 'namedInsured', label: 'Named Insured / Policyholder', type: 'text', order: 2, required: true, canonicalKey: 'namedInsured' },
      { key: 'insurerCarrier', label: 'Insurer / Carrier', type: 'text', order: 3 },
      { key: 'cedingEntity', label: 'Ceding Entity', type: 'text', order: 4, canonicalKey: 'cedent' },
      { key: 'broker', label: 'Broker / Intermediary', type: 'text', order: 5, canonicalKey: 'broker' },
      { key: 'effectiveDate', label: 'Effective Date', type: 'date', order: 6, required: true, canonicalKey: 'effectiveDate' },
      { key: 'expirationDate', label: 'Expiration Date', type: 'date', order: 7 },
      { key: 'jurisdiction', label: 'Jurisdiction / Territory', type: 'text', order: 8, canonicalKey: 'jurisdiction' },
      { key: 'currency', label: 'Currency', type: 'text', order: 9, canonicalKey: 'currency' },
      { key: 'description', label: 'Description / Notes', type: 'textarea', order: 10 },
    ],
  });
}

/**
 * Limit structure plus the placement economics common to every line of business:
 * not just the loss-side terms (limit/attachment/exhaustion/deductible) but the
 * pricing and share terms (premium, rate-on-line, signed participation,
 * brokerage, expected yield) an underwriter needs to evaluate any deal — so the
 * agent extends a complete economic baseline rather than re-deriving it per LOB.
 */
function financialsSection(): SuggestedFormSection {
  return asBase({
    key: 'financials',
    label: 'Financials',
    order: 2,
    description: 'Limit structure and placement economics for the coverage.',
    fields: [
      { key: 'coverageLimit', label: 'Coverage Limit', type: 'currency', order: 1, required: true, canonicalKey: 'limit' },
      { key: 'attachmentPoint', label: 'Attachment Point', type: 'currency', order: 2 },
      { key: 'exhaustionPoint', label: 'Exhaustion Point', type: 'currency', order: 3 },
      { key: 'deductible', label: 'Deductible', type: 'currency', order: 4, canonicalKey: 'deductible' },
      { key: 'premium', label: 'Premium', type: 'currency', order: 5 },
      { key: 'rateOnLine', label: 'Rate on Line', type: 'percentage', order: 6 },
      { key: 'participationPct', label: 'Participation / Signed Share', type: 'percentage', order: 7 },
      { key: 'brokeragePct', label: 'Brokerage / Commission', type: 'percentage', order: 8 },
      { key: 'expectedYield', label: 'Expected Yield', type: 'percentage', order: 9, canonicalKey: 'expectedYield' },
    ],
  });
}

// --- 2b. value prefill -------------------------------------------------------

/** Map a field's canonical key to the matching value from the submission context. */
function canonicalValues(context: SubmissionFormContext): Record<string, string | number | null> {
  return {
    namedInsured: context.namedInsured,
    insuredSubject: context.insuredSubject,
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

// --- 2b2. option-set extraction (lazy-loaded selection options) --------------

/**
 * One choice field's options, lifted out of the form so they can be stored in the
 * `schema_option_sets` table and lazy-loaded by the UI. `items` is, at minimum,
 * the {value,label} pairs the field offered.
 */
export type ExtractedOptionSet = {
  optionSetKey: string;
  label: string;
  fieldKey: string;
  sectionKey: string;
  items: PageTemplateOption[];
};

/**
 * Lift the inline `options` off every `select`/`radio` field into standalone
 * option sets, leaving the field with only an `optionSetKey` reference. Returns
 * the rewritten schema plus the extracted sets (which the service persists to the
 * option-set table). The key is deterministic — `<lob>.<section>.<field>` — so
 * the same field across repeated submissions of one line of business maps to (and
 * refreshes) the same set rather than spawning duplicates. Pure.
 */
export function extractOptionSets(
  schema: SuggestedFormDefinition,
  context: SubmissionFormContext,
): { schema: SuggestedFormDefinition; optionSets: ExtractedOptionSet[] } {
  const lob = slugify(context.lineOfBusinessCode ?? 'default', 'default');
  const optionSets: ExtractedOptionSet[] = [];

  const sections = schema.sections.map((section) => ({
    ...section,
    fields: section.fields.map((field) => {
      const opts = field.options;
      const isChoice = field.type === 'select' || field.type === 'radio';
      if (!isChoice || !Array.isArray(opts) || opts.length === 0) return field;

      const optionSetKey = `${lob}.${section.key}.${field.key}`;
      optionSets.push({
        optionSetKey,
        label: field.label,
        fieldKey: field.key,
        sectionKey: section.key,
        items: opts,
      });

      // Preserve the option VALUES as an enum constraint so the publish path
      // (compileToJsonSchema) keeps validating the field even though the human-
      // facing labels now live only in the lazy-loaded set. Existing enumValues win.
      const { options, ...rest } = field;
      void options;
      const constraints = rest.constraints?.enumValues?.length
        ? rest.constraints
        : { ...(rest.constraints ?? {}), enumValues: opts.map((o) => o.value) };
      return { ...rest, optionSetKey, constraints };
    }),
  }));

  return { schema: { ...schema, sections }, optionSets };
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
  // Keys are alias-normalized on both sides so a template stored under a legacy
  // section key merges with (not alongside) its renamed successor.
  const existingSections = stripAiSpecialistSections(existing).sections.map((section) => ({
    ...section,
    key: canonicalSectionKey(section.key),
  }));
  const incomingByKey = new Map(
    stripAiSpecialistSections(incoming).sections
      .map((section) => [canonicalSectionKey(section.key), { ...section, key: canonicalSectionKey(section.key) }]),
  );
  const existingKeys = new Set(existingSections.map((section) => section.key));

  const mergedExisting = existingSections.map((section) => {
    const match = incomingByKey.get(section.key);
    if (!match) return section;
    const haveFieldKeys = new Set(section.fields.map((field) => field.key));
    const additions = (match.fields ?? []).filter((field) => !haveFieldKeys.has(field.key));
    return additions.length ? { ...section, fields: [...section.fields, ...additions] } : section;
  });

  const newSections = [...incomingByKey.values()].filter((section) => !existingKeys.has(section.key));

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
 * fields are ALWAYS preserved; the AI may EXTEND any base section with new fields,
 * or add wholly new sections. Component-backed base sections retain their fixed
 * UI and render extensions beneath it. AI fields/sections are tagged `origin:
 * 'ai'`. This makes the output a standardized base that the AI tailored — never
 * an override.
 */
export function coerceFormSchema(raw: unknown, baseline: SuggestedFormDefinition): SuggestedFormDefinition {
  const r = toRecord(raw);
  const rawSections = Array.isArray(r.sections) ? (r.sections as unknown[]) : [];

  const baseByKey = new Map(baseline.sections.map((section) => [section.key, section]));
  const extensionsByBaseKey = new Map<string, SuggestedFormField[]>();
  for (let i = 0; i < rawSections.length; i++) {
    const s = toRecord(rawSections[i]);
    const rawLabel = asString(s.label) ?? asString(s.key);
    if (!rawLabel) continue;
    const slug = canonicalSectionKey(slugify(s.key ?? rawLabel, `section-${i + 1}`));

    // The AI cannot create new top-level tabs or extend a component section:
    // risk/object detail is owned by the insured-subject template pipeline.
    // This also rejects legacy specialist tabs such as Cargo Details before they
    // reach a submission snapshot or reusable create-coverage template.
    if (!AI_EXTENSIBLE_SECTION_KEY_SET.has(slug)) continue;

    // Only AI fields backed by an extracted value survive — the generator must not
    // propose empty scaffold; base fields are exempt (added from the baseline below).
    const aiFields = coerceFields(s.fields)
      .map((field) => ({ ...field, origin: 'ai' as const }))
      .filter(fieldHasValue);

    const base = baseByKey.get(slug);
    if (base) {
      // Extension of a base section — append only brand-new fields, never override.
      // Component-backed sections render these extensions beneath their fixed UI.
      if (aiFields.length === 0) continue;
      const existing = new Set(base.fields.map((field) => field.key));
      const additions = aiFields.filter((field) => !existing.has(field.key));
      if (additions.length) {
        extensionsByBaseKey.set(slug, [...(extensionsByBaseKey.get(slug) ?? []), ...additions]);
      }
      continue;
    }

    // The allow-list above guarantees this is unreachable, but retain the
    // defensive branch-free loop shape for untrusted model output.
  }

  const mergedBase = baseline.sections.map((base) => {
    const additions = extensionsByBaseKey.get(base.key);
    if (!additions) return base;
    return { ...base, fields: [...base.fields, ...additions] };
  });

  const sections = mergedBase.map(reindexSection);

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

  const value = coerceValue(f.value);
  if (value !== undefined) field.value = value;

  if (type === 'select' || type === 'radio') {
    const opts = coerceOptions(f.options);
    if (opts.length > 0) field.options = opts;
  }
  return field;
}

/**
 * Coerce a raw field `value` to a primitive the form can prefill. `0` and `false`
 * are real values and kept; null/undefined/blank become `undefined` (unset).
 */
function coerceValue(raw: unknown): string | number | boolean | null | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    const s = raw.trim();
    return s.length ? s : undefined;
  }
  return undefined;
}

/**
 * An AI-suggested field is only kept when it carries a concrete value — the
 * generator must back every field it adds with extracted evidence rather than
 * proposing empty scaffold (base/default fields are exempt; they are the standard
 * structure and may be empty). `0` and `false` count as values.
 */
function fieldHasValue(field: SuggestedFormField): boolean {
  const v = field.value;
  return v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '');
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
