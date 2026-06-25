import { Submission, SubmissionOutput } from '../../db/models';
import type {
  PageTemplateDefinition,
  PageTemplateFieldDefinition,
  PageTemplateFieldType,
  PageTemplateSectionDefinition,
} from '../../db/models/pageTemplates.models';
import { runStage } from '../stageResult';
import { autoLayoutSection } from '../templateLayout';
import { buildStandardLocationSection, isLocationAttributeKey } from './locationFields';
import { classifySubmissionLineOfBusiness } from '../classification/service';
import { lineOfBusinessTaxonomy } from '../../db/seed-data/lineOfBusinessTaxonomy';
import {
  GeminiInsuredSubjectAgent,
  InsuredSubjectAgent,
  InsuredSubjectInput,
} from './GeminiInsuredSubjectProvider';

/**
 * One thing being insured, with an open-ended bag of attributes (key-value pairs)
 * describing it — an SOV row's TIV/construction/occupancy, a vessel's hull number,
 * a vehicle's VIN, etc. Attributes are deliberately untyped: the whole point of
 * this stage is to capture EVERY pair relative to the subject, not a fixed schema.
 */
export type InsuredSubject = {
  index: number;
  name: string | null;
  subjectType: string | null;
  address: string | null;
  /** The subject's OWN line of business — a package can bundle subjects with
   * different LOBs (e.g. a Marine Cargo risk alongside a D&O risk). */
  lineOfBusinessCode: string | null;
  lineOfBusinessLabel: string | null;
  /**
   * The perils (causes of loss) this specific subject is exposed to, as canonical
   * bare codes from the peril taxonomy (e.g. `hurricane`, `storm_surge`,
   * `earthquake`). Peril is a distinct dimension from LOB and is contextual to the
   * subject — a coastal warehouse draws wind/surge/flood, a California office draws
   * quake/fire, a cyber risk draws ransomware/data_breach. The LLM agent applies
   * the subset relevant to THIS subject's nature and location; the heuristic
   * fallback abstains (leaves it undefined) rather than fabricating perils.
   */
  perilCodes?: string[];
  attributes: Record<string, string | number | boolean | null>;
  /**
   * The per-subject form template the create-coverage UI renders for this
   * subject (the `onTemplateResolved` payload of SubjectInsuranceSection). It is
   * generated alongside the subject — by the LLM (its proposed `fields`) when the
   * agent runs, otherwise synthesised from the harvested `attributes`. Stored
   * inline so the form is bespoke to THIS submission rather than a static
   * LOB-keyed template. Optional/back-compat: an older persisted set omits it.
   */
  template?: PageTemplateDefinition | null;
};

/**
 * A form field the LLM proposes for an insured subject — the meaningful part of
 * the per-subject template. The envelope (section/page) is assembled
 * deterministically by `buildSubjectTemplate` so a model can never emit a
 * malformed template.
 */
export type SubjectTemplateFieldSpec = {
  key: string;
  label?: string;
  type?: string;
  required?: boolean;
  helperText?: string | null;
};

/** A distinct line of business present in the submission, with how many subjects carry it. */
export type LineOfBusinessSummary = { code: string; label: string; subjectCount: number };

export type InsuredSubjectsResult = {
  modelVersion: string;
  subjectCount: number;
  subjects: InsuredSubject[];
  /** Submission-level record of EVERY distinct line of business across subjects. */
  linesOfBusiness: LineOfBusinessSummary[];
  source: 'gemini_insured_subjects' | 'heuristic';
};

const MODEL_VERSION = 'insured-subjects-heuristic-v1';

/** SOV/property attribute names the heuristic harvests from `Key: Value` lines. */
const SOV_KEY_PATTERNS: Array<{ key: string; re: RegExp }> = [
  { key: 'total_insured_value', re: /\b(?:tiv|total\s+insured\s+value)\b/i },
  { key: 'building_value', re: /\bbuilding\s+(?:value|limit)\b/i },
  { key: 'contents_value', re: /\b(?:contents|personal\s+property)\s+(?:value|limit)\b/i },
  { key: 'business_interruption_value', re: /\b(?:business\s+interruption|bi)\s+(?:value|limit)\b/i },
  { key: 'construction_type', re: /\bconstruction(?:\s+type)?\b/i },
  { key: 'occupancy', re: /\boccupancy\b/i },
  { key: 'year_built', re: /\byear\s+built\b/i },
  { key: 'number_of_stories', re: /\b(?:number\s+of\s+)?stories\b/i },
  { key: 'square_footage', re: /\b(?:square\s+footage|sq\.?\s*ft|area)\b/i },
  { key: 'roof_type', re: /\broof(?:\s+type)?\b/i },
  { key: 'sprinklered', re: /\bsprinkler(?:ed|s)?\b/i },
  { key: 'protection_class', re: /\bprotection\s+class\b/i },
];

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
}

function primitive(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  const str = String(value).trim();
  return str ? str.slice(0, 240) : null;
}

/** All primitive fields of a raw subject record become attributes (minus the
 * ones promoted to name/address). */
/** Normalise an attribute key to snake_case, splitting camelCase boundaries so
 * extraction's `constructionType` and a model's `Construction Type` both land on
 * `construction_type`. */
function normalizeKey(rawKey: string): string {
  return rawKey
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Title-case a snake_case attribute key for a human-facing field label. */
function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// --- per-subject template assembly -------------------------------------------

const SUBJECT_TEMPLATE_PAGE_KEY = 'insured-subject-detail';
const SUBJECT_TEMPLATE_SECTION_KEY = 'insured-subject-details';
const SUBJECT_TEMPLATE_SCHEMA_VERSION = 1;
/** Defensive cap so a runaway model response can't bloat the persisted template. */
const MAX_TEMPLATE_FIELDS = 60;

const ALLOWED_FIELD_TYPES = new Set<PageTemplateFieldType>([
  'text', 'textarea', 'number', 'integer', 'select', 'boolean', 'radio', 'date',
]);

/**
 * Coerce a model-proposed (or inferred) field type onto the renderer's allowed
 * set. Money/rate hints collapse to `number`; a checkbox hint to `boolean`; an
 * unknown type infers from the sample value, defaulting to `text`.
 */
function normalizeFieldType(raw: unknown, sampleValue?: unknown): PageTemplateFieldType {
  const t = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (t === 'currency' || t === 'percentage' || t === 'percent' || t === 'money' || t === 'decimal') return 'number';
  if (t === 'checkbox' || t === 'bool') return 'boolean';
  if (ALLOWED_FIELD_TYPES.has(t as PageTemplateFieldType)) return t as PageTemplateFieldType;
  if (typeof sampleValue === 'number') return 'number';
  if (typeof sampleValue === 'boolean') return 'boolean';
  return 'text';
}

/**
 * Assemble the per-subject form template the create-coverage UI renders. Location
 * is always captured in the ONE standard structure (`buildStandardLocationSection`)
 * — the subject's address and any location-component attributes are folded into a
 * dedicated, canonical Location section regardless of what ad-hoc address/city/zip
 * fields the model emitted. The remaining LLM-proposed `fieldSpecs` (when present)
 * drive the Subject Details labels/types/order; any harvested `attributes` not
 * covered by a spec (and not already in the Location block) are folded in so no
 * extracted datum is dropped. Each field is prefilled from `attributes` by matching
 * key. Always returns at least the Subject Details section (possibly empty — the UI
 * then shows its empty-state).
 */
export function buildSubjectTemplate(
  subject: Pick<InsuredSubject, 'name' | 'subjectType' | 'address' | 'lineOfBusinessLabel' | 'attributes'>,
  fieldSpecs?: SubjectTemplateFieldSpec[] | null,
): PageTemplateDefinition {
  const attributes = subject.attributes ?? {};
  // Standardize all location info into one canonical block, and remember which
  // attribute keys it consumed so they are not re-emitted as ad-hoc fields.
  const location = buildStandardLocationSection({
    address: subject.address,
    subjectType: subject.subjectType,
    attributes,
    order: 5,
  });
  const seen = new Set<string>(location.consumedKeys);
  const fields: PageTemplateFieldDefinition[] = [];
  let order = 10;

  const pushField = (
    rawKey: string,
    label: string | undefined,
    type: PageTemplateFieldType,
    required?: boolean,
    helperText?: string | null,
  ): void => {
    const key = normalizeKey(rawKey);
    if (!key || seen.has(key) || fields.length >= MAX_TEMPLATE_FIELDS) return;
    seen.add(key);
    const sample = attributes[key];
    const field: PageTemplateFieldDefinition = {
      key,
      label: label?.trim() || humanizeKey(key),
      type,
      order,
      canonicalKey: key,
      defaultValue: sample === undefined ? null : sample,
    };
    if (required === true) field.required = true;
    if (helperText) field.helperText = helperText;
    fields.push(field);
    order += 10;
  };

  if (fieldSpecs) {
    for (const spec of fieldSpecs.slice(0, MAX_TEMPLATE_FIELDS)) {
      if (!spec || typeof spec.key !== 'string') continue;
      // Location fields are owned by the standard Location section — never let a
      // model's ad-hoc address/city/zip spec spawn a duplicate, non-standard one.
      if (isLocationAttributeKey(normalizeKey(spec.key))) continue;
      pushField(
        spec.key,
        spec.label,
        normalizeFieldType(spec.type, attributes[normalizeKey(spec.key)]),
        spec.required,
        spec.helperText ?? null,
      );
    }
  }
  // Fold in every extracted attribute the specs didn't already cover (location
  // attributes are in `seen`, already folded into the standard Location section).
  for (const [rawKey, value] of Object.entries(attributes)) {
    pushField(rawKey, humanizeKey(normalizeKey(rawKey)), normalizeFieldType(undefined, value));
  }

  const lobLabel = subject.lineOfBusinessLabel ?? null;
  // Lay the dynamic detail fields out on a clean grid (the Location section is
  // already hand-tuned). A well-laid-out schema is a layout decision, not an LLM one.
  const detailsSection: PageTemplateSectionDefinition = autoLayoutSection({
    key: SUBJECT_TEMPLATE_SECTION_KEY,
    label: 'Subject Details',
    order: 10,
    ...(subject.name ? { description: `Captured details for ${subject.name}.` } : {}),
    fields,
  });
  return {
    schemaVersion: SUBJECT_TEMPLATE_SCHEMA_VERSION,
    pageKey: SUBJECT_TEMPLATE_PAGE_KEY,
    title: lobLabel ? `${lobLabel} — Insured Subject Details` : 'Insured Subject Details',
    // The standardized Location section (when present) leads, then Subject Details.
    sections: location.section ? [location.section, detailsSection] : [detailsSection],
  };
}

function attributesFrom(rec: Record<string, unknown>, skip: Set<string>): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [rawKey, rawValue] of Object.entries(rec)) {
    const key = normalizeKey(rawKey);
    if (!key || skip.has(key)) continue;
    const value = primitive(rawValue);
    if (value !== null) out[key] = value;
  }
  return out;
}

function buildSubject(index: number, rec: Record<string, unknown>): InsuredSubject {
  const name =
    primitive(rec.name) ?? primitive(rec.description) ?? primitive(rec.insuredSubject) ?? primitive(rec.label);
  const address = primitive(rec.address) ?? primitive(rec.location) ?? primitive(rec.propertyLocation);
  const subjectType = primitive(rec.subjectType) ?? (address ? 'property_location' : null);
  return {
    index,
    name: name == null ? null : String(name),
    subjectType: subjectType == null ? null : String(subjectType),
    address: address == null ? null : String(address),
    lineOfBusinessCode: null,
    lineOfBusinessLabel: null,
    attributes: attributesFrom(rec, new Set(['name', 'description', 'label', 'address', 'location', 'property_location', 'subject_type', 'insured_subject'])),
  };
}

/** Normalize an LOB phrase for direct taxonomy matching ('D&O' → 'd and o'). */
function normalizeLob(value: string): string {
  return value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Exact taxonomy lookup by normalized primary/sub-type label or code. */
const LOB_BY_NORMALIZED = new Map<string, { code: string; label: string }>();
for (const primary of lineOfBusinessTaxonomy) {
  const entry = { code: primary.code, label: primary.label };
  LOB_BY_NORMALIZED.set(normalizeLob(primary.label), entry);
  LOB_BY_NORMALIZED.set(normalizeLob(primary.code), entry);
  for (const subType of primary.subTypes) LOB_BY_NORMALIZED.set(normalizeLob(subType.label), entry);
}

/**
 * Classify ONE subject's line of business. When the subject EXPLICITLY states its
 * LOB (a `line_of_business` attribute, common on placing slips), match that string
 * directly against the taxonomy — more reliable than fuzzy keyword scoring (which
 * e.g. mis-scores "Directors and Officers" because "officers" contains "office").
 * Otherwise fall back to the shared keyword classifier over the subject's text.
 * Returns null code when nothing classifies (never fabricates an LOB).
 */
function lineOfBusinessForSubject(subject: InsuredSubject): { code: string | null; label: string | null } {
  const explicit =
    subject.attributes.line_of_business ?? subject.attributes.lob ?? subject.attributes.lines_of_business;
  if (explicit != null && String(explicit).trim()) {
    const direct = LOB_BY_NORMALIZED.get(normalizeLob(String(explicit)));
    if (direct) return direct;
  }
  const text = explicit
    ? String(explicit)
    : [subject.name, subject.subjectType, subject.address, ...Object.entries(subject.attributes).map(([k, v]) => `${k} ${v}`)]
        .filter(Boolean)
        .join(' ');
  const lob = classifySubmissionLineOfBusiness({ text, existingHints: subject.attributes });
  if (!lob.lineOfBusinessCode || lob.lineOfBusinessCode === 'unclassified') return { code: null, label: null };
  return { code: lob.lineOfBusinessCode, label: lob.lineOfBusinessLabel };
}

/** Roll subjects' LOBs up into the distinct set the submission carries. (shared with the agent provider) */
export function summarizeLinesOfBusiness(subjects: InsuredSubject[]): LineOfBusinessSummary[] {
  const byCode = new Map<string, LineOfBusinessSummary>();
  for (const subject of subjects) {
    if (!subject.lineOfBusinessCode) continue;
    const entry =
      byCode.get(subject.lineOfBusinessCode) ??
      { code: subject.lineOfBusinessCode, label: subject.lineOfBusinessLabel ?? subject.lineOfBusinessCode, subjectCount: 0 };
    entry.subjectCount += 1;
    byCode.set(subject.lineOfBusinessCode, entry);
  }
  return [...byCode.values()].sort((a, b) => b.subjectCount - a.subjectCount || a.code.localeCompare(b.code));
}

/** Harvest SOV-style `Key: Value` lines from the raw text onto a subject. */
function harvestSovAttributes(text: string): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  const lines = text.split(/\r?\n/).slice(0, 4000);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z][A-Za-z0-9 ./&-]{2,40})\s*[:\-]\s*(.+?)\s*$/);
    if (!match) continue;
    const label = match[1];
    const value = primitive(match[2]);
    if (value === null) continue;
    for (const { key, re } of SOV_KEY_PATTERNS) {
      if (re.test(label) && out[key] === undefined) out[key] = value;
    }
  }
  return out;
}

/**
 * Free heuristic for the insured subject(s). Prefers the prior extraction stage's
 * `subjects` array (one InsuredSubject each), otherwise synthesises a single
 * subject from the top-level extraction fields, then enriches the first subject
 * with any SOV attributes harvested from the raw text. Abstains to an empty set
 * rather than fabricating a subject when there's nothing to anchor on.
 */
export function extractInsuredSubjects(input: { text?: string; hints?: Record<string, unknown> | null }): InsuredSubjectsResult {
  const hints = toRecord(input.hints);
  const text = String(input.text ?? '');
  const rawSubjects = Array.isArray(hints.subjects) ? (hints.subjects as unknown[]) : [];

  const subjects: InsuredSubject[] = [];
  if (rawSubjects.length > 0) {
    rawSubjects.forEach((raw, index) => subjects.push(buildSubject(index, toRecord(raw))));
  } else {
    const single = buildSubject(0, {
      name: hints.insuredSubject ?? hints.namedInsured ?? null,
      address: hints.propertyLocation ?? null,
      total_insured_value: hints.limit ?? null,
      deductible: hints.deductible ?? null,
    });
    if (single.name || single.address || Object.keys(single.attributes).length > 0) subjects.push(single);
  }

  // Enrich the first subject with SOV attributes pulled from the text (only keys
  // it doesn't already carry), so single-location submissions get a fuller bag.
  if (subjects.length > 0 && text) {
    const harvested = harvestSovAttributes(text);
    const first = subjects[0];
    for (const [key, value] of Object.entries(harvested)) {
      if (first.attributes[key] === undefined) first.attributes[key] = value;
    }
  }

  // Classify each subject's OWN line of business so a multi-LOB package records
  // every line, not just one submission-level primary.
  for (const subject of subjects) {
    const lob = lineOfBusinessForSubject(subject);
    subject.lineOfBusinessCode = lob.code;
    subject.lineOfBusinessLabel = lob.label;
    // Synthesise the per-subject template from the harvested attributes (no LLM
    // fields available in the heuristic path).
    subject.template = buildSubjectTemplate(subject);
  }

  return {
    modelVersion: MODEL_VERSION,
    subjectCount: subjects.length,
    subjects,
    linesOfBusiness: summarizeLinesOfBusiness(subjects),
    source: 'heuristic',
  };
}

/**
 * Read the insured subjects previously persisted for a submission (by
 * `extractOne`). Returns null when the submission has no document or the stage
 * has not run — the caller renders a blank subject in that case. Mirrors
 * schema-generation's `loadSuggestedForm`.
 */
export async function loadInsuredSubjects(submissionId: number): Promise<InsuredSubjectsResult | null> {
  if (!Number.isFinite(submissionId)) return null;
  const doc = await SubmissionOutput.findOne({ where: { submissionId } });
  const record = (doc?.structuredData as Record<string, unknown> | undefined)?.insuredSubjects;
  if (!record || typeof record !== 'object') return null;
  const result = record as Partial<InsuredSubjectsResult>;
  if (!Array.isArray(result.subjects)) return null;
  return result as InsuredSubjectsResult;
}

/** OCR text lives under `structured_data.ocr.text`. */
function ocrTextOf(document: SubmissionOutput | null | undefined): string {
  const ocr = toRecord(toRecord(document?.structuredData).ocr);
  return typeof ocr.text === 'string' ? ocr.text : '';
}

/**
 * Pipeline stage that determines the insured SUBJECT(S) and extracts every
 * key-value pair relative to each (SOV rows, address, TIV, construction …). Runs
 * after extraction (whose `subjects` it builds on) and before location discovery
 * (which geocodes each subject's address). LLM-primary (Gemini) with the free
 * heuristic as the fallback — the convention the other judgment stages use.
 *
 * Additive: it writes `structured_data.insuredSubjects` and does NOT mutate the
 * extraction output other stages read.
 */
export class InsuredSubjectService {
  private readonly agent: InsuredSubjectAgent;

  constructor(deps: { insuredSubjectAgent?: InsuredSubjectAgent } = {}) {
    this.agent = deps.insuredSubjectAgent ?? new GeminiInsuredSubjectAgent();
  }

  async process(payload: any = {}): Promise<Record<string, unknown>> {
    return runStage('insuredSubject', () => this.runInsuredSubject(payload));
  }

  private async extractWithPolicy(
    input: InsuredSubjectInput,
  ): Promise<{ result: InsuredSubjectsResult; warning: string | null }> {
    if (this.agent.isAvailable()) {
      try {
        return { result: await this.agent.extract(input), warning: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.warn('insuredSubject: agent failed, falling back to heuristic:', message);
        return {
          result: extractInsuredSubjects(input),
          warning: `insured-subject agent failed; heuristic used: ${message}`,
        };
      }
    }
    return { result: extractInsuredSubjects(input), warning: null };
  }

  private async runInsuredSubject(payload: any = {}): Promise<Record<string, unknown>> {
    const hints = payload?.extraction?.structuredData ?? payload?.normalization?.normalized ?? null;
    const text = String(payload?.ocr?.text ?? payload?.text ?? '').trim();

    if (payload?.submission?.id) {
      const outcome = await this.extractOne(payload.submission, { text, hints });
      const warnings = typeof outcome.warning === 'string' ? [outcome.warning] : [];
      return { ok: true, service: 'insuredSubject', ...outcome, warnings };
    }

    // Ad-hoc invocation (route/test): extract without persistence.
    const { result, warning } = await this.extractWithPolicy({ text, hints });
    return {
      ok: true,
      service: 'insuredSubject',
      submissionId: null,
      documentId: null,
      warning,
      ...result,
      warnings: typeof warning === 'string' ? [warning] : [],
    };
  }

  private async extractOne(
    submission: Submission | Record<string, any>,
    input: { document?: SubmissionOutput | null; text?: string; hints?: Record<string, unknown> | null },
  ): Promise<Record<string, unknown>> {
    const submissionId = Number((submission as any).id ?? 0);
    const organizationId = Number((submission as any).organizationId ?? 0) || null;
    let document = input.document ?? null;

    if (!document && submissionId > 0) {
      document = await SubmissionOutput.findOne({ where: { submissionId }, order: [['id', 'ASC']] });
    }

    const persisted = toRecord(document?.structuredData);
    const text = String(input.text ?? ocrTextOf(document) ?? '').trim();
    const hints = {
      ...toRecord(persisted.extraction),
      ...toRecord(input.hints),
    };
    const { result, warning } = await this.extractWithPolicy({ text, hints });

    if (submissionId > 0) {
      if (!document) {
        document = await SubmissionOutput.create({
          submissionId,
          organizationId,
          structuredData: text ? { ocr: { text } } : null,
        });
      }
      const existing = document.structuredData ?? {};
      document.structuredData = {
        ...existing,
        insuredSubjects: result,
        insuredSubjectCount: result.subjectCount,
        // Submission-level record of every distinct LOB across the subjects.
        linesOfBusiness: result.linesOfBusiness,
        lineOfBusinessCodes: result.linesOfBusiness.map((lob) => lob.code),
        // Reconcile the multi-LOB flag with the classification stage's early
        // signal (OR), so the headline LOB and the per-subject set agree on
        // whether the package is multi-line.
        multiLineOfBusiness:
          (existing as { multiLineOfBusiness?: unknown }).multiLineOfBusiness === true ||
          result.linesOfBusiness.length > 1,
      };
      await document.save();
    }

    return {
      submissionId,
      documentId: document?.id ?? null,
      warning,
      ...result,
    };
  }
}
