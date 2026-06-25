/**
 * Realistic insurance / reinsurance / brokerage submission packages.
 *
 * Insurance, reinsurance and the brokerage that sits between them is a
 * document-heavy business: a single submission ("the slip" plus everything a
 * reinsurer needs to quote) arrives as a bundle of PDFs, spreadsheets, scanned
 * images and the occasional data pack. A property-cat treaty looks nothing like
 * a marine facultative cert, which looks nothing like a cyber excess-of-loss
 * placement. This module captures that diversity so seeded submissions carry a
 * believable attachment set instead of a single placeholder.
 *
 * It is a **pure, dependency-free, deterministic** generator (no DB, no faker,
 * no clock/RNG globals) so it is trivially unit-testable and reproducible: the
 * same `(seed, complexity)` always yields the same package.
 *
 * Complexity is modelled on a 1..10 scale. {@link assignComplexities} hands out
 * scores whose mean is exactly the requested target (7 by default — i.e. a
 * deliberately demanding book of business), and the score then drives how many
 * attachments a submission carries and how exotic they get (cat-model output,
 * aerial imagery, bound data packs only show up on the hairier risks).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Coarse file family — drives extension, MIME type and size envelope. */
export type FileKind = 'pdf' | 'spreadsheet' | 'csv' | 'image' | 'document' | 'email' | 'archive';

/** One attachment, shaped to drop straight into `SubmissionFile.create`. */
export interface SubmissionFileSpec {
  fileName: string;
  fileType: string; // MIME type
  fileSize: number; // bytes
  storagePath: string;
  checksum: string;
  /** Stable category key (e.g. `placing_slip`) — handy for manifests/filters. */
  category: string;
  kind: FileKind;
  /**
   * Path (relative to the OCR fixture corpus, `test/fixtures/ocr-corpus`) of a
   * real, readable file of a format the OCR dispatcher can extract — so a seeded
   * attachment is backed by genuine bytes rather than the unresolvable
   * {@link storagePath} placeholder. The seed service resolves this to an
   * absolute path and uses it as the on-disk `SubmissionFile.storagePath`,
   * falling back to {@link storagePath} when the fixture is absent. See
   * {@link CORPUS_BY_KIND}.
   */
  corpusFile: string;
}

/** Structured roll-up of a package, suitable for ingestion-event metadata. */
export interface PackageManifest {
  archetype: string;
  lineOfBusiness: string;
  lineOfBusinessCode: string;
  /**
   * Every line of business bundled into this submission. For a conventional
   * single-LOB submission these are one-element arrays mirroring the singular
   * `lineOfBusiness`/`lineOfBusinessCode`/`archetype` fields; a Multi-LOB,
   * Broker-Package or Portfolio submission carries 2+ entries (the singular
   * fields then describe the primary/lead line).
   */
  lineOfBusinesses: string[];
  lineOfBusinessCodes: string[];
  archetypes: string[];
  reinsuranceType: 'treaty' | 'facultative';
  /** Distinct cedents on the package — >1 only when multiple insureds are bundled. */
  cedents: string[];
  cedent: string;
  broker: string;
  perils: string[];
  regions: string[];
  currency: string;
  complexity: number;
  fileCount: number;
  totalBytes: number;
  categories: string[];
  kinds: Record<string, number>;
  hasImagery: boolean;
}

/** A complete generated submission package. */
export interface SubmissionPackage {
  manifest: PackageManifest;
  files: SubmissionFileSpec[];
  /** Compact human summary, e.g. for an OCR `structured_data.ocr.text` placeholder. */
  summaryText: string;
}

// ---------------------------------------------------------------------------
// Deterministic RNG + small helpers (no Math.random / Date so output is stable)
// ---------------------------------------------------------------------------

type Rng = () => number;

/** mulberry32 — tiny, fast, deterministic PRNG seeded from a uint32. */
function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function intBetween(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** Deterministic 64-char hex digest (looks like a checksum, isn't a real hash). */
function hexDigest(rng: Rng, len = 64): string {
  const d = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < len; i += 1) s += d[Math.floor(rng() * 16)];
  return s;
}

function slug(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, '')
    .replace(/^_+|_+$/g, '')
    .slice(0, 28);
}

// ---------------------------------------------------------------------------
// File-kind metadata (extension, MIME, size envelope in KB)
// ---------------------------------------------------------------------------

const KIND_META: Record<FileKind, { ext: string[]; mime: string[]; sizeKb: [number, number] }> = {
  pdf: { ext: ['pdf'], mime: ['application/pdf'], sizeKb: [120, 4200] },
  spreadsheet: {
    ext: ['xlsx', 'xlsm'],
    mime: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    sizeKb: [60, 8200],
  },
  csv: { ext: ['csv'], mime: ['text/csv'], sizeKb: [40, 6400] },
  image: {
    ext: ['jpg', 'png', 'tif'],
    mime: ['image/jpeg', 'image/png', 'image/tiff'],
    sizeKb: [320, 7200],
  },
  document: {
    ext: ['docx'],
    mime: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    sizeKb: [40, 900],
  },
  email: { ext: ['eml'], mime: ['message/rfc822'], sizeKb: [8, 140] },
  archive: { ext: ['zip'], mime: ['application/zip'], sizeKb: [2400, 78000] },
};

// ---------------------------------------------------------------------------
// Real on-disk fixture corpus (test/fixtures/ocr-corpus)
// ---------------------------------------------------------------------------
//
// Every generated attachment is backed by an ACTUAL readable file so the OCR
// stage extracts genuine text from a seeded submission instead of warning
// "Unable to read <file>". The OCR dispatcher sniffs magic bytes (not the
// extension), so a fixture only has to be a format it can read — which lets a
// display-only `.xlsm` "spreadsheet" be backed by a real `.csv` the plain-text
// extractor reads cleanly.
//
// Keep these names in sync with the corpus generator in
// `test/helpers/ocrCorpus.ts` (CORPUS_PLAN / SLUG / EXT — run `npm run
// corpus:generate` to (re)create the files). The seed service degrades
// gracefully (falls back to the logical `storagePath`) when a referenced
// fixture is missing, so drift or a fixture-less deploy is non-fatal.

/** Expand a sequential corpus filename range, e.g. `0001-acord-application.pdf`. */
function corpusRange(start: number, end: number, fileSlug: string, ext: string): string[] {
  const out: string[] = [];
  for (let n = start; n <= end; n += 1) {
    out.push(`${String(n).padStart(4, '0')}-${fileSlug}.${ext}`);
  }
  return out;
}

const CORPUS_PDF = [
  ...corpusRange(1, 30, 'acord-application', 'pdf'),
  ...corpusRange(31, 48, 'quote-confirmation', 'pdf'),
];
const CORPUS_DOCX = corpusRange(49, 68, 'broker-cover-letter', 'docx');
const CORPUS_CSV = corpusRange(81, 90, 'statement-of-values', 'csv');
const CORPUS_EML = corpusRange(100, 105, 'broker-email', 'eml');
const CORPUS_IMAGE = ['images/scan-acord-application.png', 'images/scan-loss-run.png'];

/**
 * Backing fixtures per file family. Spreadsheets and CSVs share the
 * statement-of-values CSVs (read by the plain-text extractor); archives (rare,
 * complexity >= 9) fall back to a readable PDF — the corpus carries no real
 * `.zip`/`.xlsx`, and the OCR dispatcher would reject those anyway.
 */
const CORPUS_BY_KIND: Record<FileKind, string[]> = {
  pdf: CORPUS_PDF,
  spreadsheet: CORPUS_CSV,
  csv: CORPUS_CSV,
  image: CORPUS_IMAGE,
  document: CORPUS_DOCX,
  email: CORPUS_EML,
  archive: CORPUS_PDF,
};

// ---------------------------------------------------------------------------
// Document blueprints — the artefacts a real submission is built from
// ---------------------------------------------------------------------------

interface DocBlueprint {
  category: string;
  label: string;
  kind: FileKind;
  /** When this artefact starts appearing on the risk (1..10). */
  minComplexity: number;
  /** Multi-file artefacts (photos, hazard maps) scale their count with complexity. */
  multiple?: boolean;
}

const DOC_LIBRARY: Record<string, DocBlueprint> = {
  cover_letter: { category: 'cover_letter', label: 'Submission Cover Note', kind: 'email', minComplexity: 1 },
  placing_slip: { category: 'placing_slip', label: 'Placing Slip', kind: 'pdf', minComplexity: 1 },
  firm_order: { category: 'firm_order', label: 'Firm Order Confirmation', kind: 'pdf', minComplexity: 6 },
  statement_of_values: { category: 'statement_of_values', label: 'Statement of Values (SOV)', kind: 'spreadsheet', minComplexity: 1 },
  schedule_of_locations: { category: 'schedule_of_locations', label: 'Schedule of Insured Locations', kind: 'spreadsheet', minComplexity: 3 },
  loss_run: { category: 'loss_run', label: 'Loss Run', kind: 'spreadsheet', minComplexity: 2 },
  claims_bordereau: { category: 'claims_bordereau', label: 'Claims Bordereau', kind: 'spreadsheet', minComplexity: 6 },
  premium_bordereau: { category: 'premium_bordereau', label: 'Premium Bordereau', kind: 'spreadsheet', minComplexity: 5 },
  exposure_data: { category: 'exposure_data', label: 'Exposure Data Extract', kind: 'csv', minComplexity: 5 },
  cat_model_report: { category: 'cat_model_report', label: 'Cat Model Report (RMS / Verisk)', kind: 'pdf', minComplexity: 5 },
  actuarial_report: { category: 'actuarial_report', label: 'Actuarial Pricing Report', kind: 'pdf', minComplexity: 8 },
  treaty_wording: { category: 'treaty_wording', label: 'Reinsurance Treaty Wording', kind: 'pdf', minComplexity: 4 },
  program_structure: { category: 'program_structure', label: 'Reinsurance Program Structure', kind: 'pdf', minComplexity: 6 },
  cedent_financials: { category: 'cedent_financials', label: 'Cedent Audited Financials', kind: 'pdf', minComplexity: 6 },
  rating_agency_report: { category: 'rating_agency_report', label: 'AM Best / S&P Rating Report', kind: 'pdf', minComplexity: 7 },
  risk_engineering_survey: { category: 'risk_engineering_survey', label: 'Risk Engineering Survey', kind: 'pdf', minComplexity: 5 },
  reinsurance_questionnaire: { category: 'reinsurance_questionnaire', label: 'Underwriting Questionnaire', kind: 'document', minComplexity: 3 },
  broker_deck: { category: 'broker_deck', label: 'Broker Submission Presentation', kind: 'pdf', minComplexity: 4 },
  certificate_of_insurance: { category: 'certificate_of_insurance', label: 'Certificate of Insurance', kind: 'pdf', minComplexity: 3 },
  endorsements: { category: 'endorsements', label: 'Policy Endorsements', kind: 'pdf', minComplexity: 5 },
  property_photos: { category: 'property_photos', label: 'Site Photograph', kind: 'image', minComplexity: 4, multiple: true },
  hazard_map: { category: 'hazard_map', label: 'Wind / Flood Hazard Map', kind: 'image', minComplexity: 6, multiple: true },
  aerial_imagery: { category: 'aerial_imagery', label: 'Aerial / Satellite Imagery', kind: 'image', minComplexity: 8, multiple: true },
  data_pack: { category: 'data_pack', label: 'Bound Data Pack', kind: 'archive', minComplexity: 9 },
};

// ---------------------------------------------------------------------------
// Archetypes — the breadth of lines of business a marketplace really sees
// ---------------------------------------------------------------------------

interface Archetype {
  name: string;
  lineOfBusiness: string;
  code: string;
  reinsuranceType: 'treaty' | 'facultative';
  perils: string[];
  regions: string[];
  currencies: string[];
  /** Always present (subject to the overall file budget). */
  core: string[];
  /** Unlocked as complexity rises; filled in ascending-threshold order. */
  optional: string[];
}

const ARCHETYPES: Archetype[] = [
  {
    name: 'Property Catastrophe Treaty',
    lineOfBusiness: 'Property Catastrophe',
    code: 'property_cat',
    reinsuranceType: 'treaty',
    perils: ['hurricane', 'storm_surge', 'flood', 'earthquake'],
    regions: ['US-Gulf', 'US-Southeast', 'Caribbean', 'US-Northeast'],
    currencies: ['USD', 'USD', 'BMD'],
    core: ['cover_letter', 'placing_slip', 'statement_of_values', 'loss_run'],
    optional: ['schedule_of_locations', 'cat_model_report', 'risk_engineering_survey', 'program_structure', 'hazard_map', 'cedent_financials', 'rating_agency_report', 'property_photos', 'actuarial_report', 'aerial_imagery', 'data_pack'],
  },
  {
    name: 'Casualty Quota Share',
    lineOfBusiness: 'General Liability',
    code: 'casualty_qs',
    reinsuranceType: 'treaty',
    perils: ['bodily_injury', 'property_damage', 'products_liability'],
    regions: ['US-Nationwide', 'Western-Europe', 'UK'],
    currencies: ['USD', 'GBP', 'EUR'],
    core: ['cover_letter', 'placing_slip', 'loss_run', 'reinsurance_questionnaire'],
    optional: ['premium_bordereau', 'broker_deck', 'exposure_data', 'claims_bordereau', 'program_structure', 'cedent_financials', 'rating_agency_report', 'actuarial_report'],
  },
  {
    name: 'Marine Cargo & Hull Facultative',
    lineOfBusiness: 'Marine',
    code: 'marine_fac',
    reinsuranceType: 'facultative',
    perils: ['marine_cargo', 'hull', 'piracy', 'collision'],
    regions: ['North-Sea', 'Southeast-Asia', 'Mediterranean', 'Global'],
    currencies: ['USD', 'GBP', 'EUR'],
    core: ['cover_letter', 'placing_slip', 'statement_of_values', 'certificate_of_insurance'],
    optional: ['schedule_of_locations', 'loss_run', 'risk_engineering_survey', 'broker_deck', 'property_photos', 'exposure_data', 'hazard_map', 'data_pack'],
  },
  {
    name: 'Aviation Hull & Liability',
    lineOfBusiness: 'Aviation',
    code: 'aviation',
    reinsuranceType: 'facultative',
    perils: ['hull_all_risk', 'passenger_liability', 'war_risk'],
    regions: ['Global', 'North-America', 'Middle-East'],
    currencies: ['USD', 'USD', 'EUR'],
    core: ['cover_letter', 'placing_slip', 'loss_run', 'schedule_of_locations'],
    optional: ['risk_engineering_survey', 'broker_deck', 'property_photos', 'endorsements', 'cedent_financials', 'program_structure', 'actuarial_report'],
  },
  {
    name: 'Energy & Offshore Facultative',
    lineOfBusiness: 'Energy',
    code: 'energy_offshore',
    reinsuranceType: 'facultative',
    perils: ['windstorm', 'blowout', 'business_interruption', 'fire'],
    regions: ['US-Gulf', 'North-Sea', 'West-Africa'],
    currencies: ['USD', 'GBP'],
    core: ['cover_letter', 'placing_slip', 'statement_of_values', 'risk_engineering_survey'],
    optional: ['property_photos', 'cat_model_report', 'loss_run', 'hazard_map', 'program_structure', 'cedent_financials', 'actuarial_report', 'aerial_imagery', 'data_pack'],
  },
  {
    name: 'Cyber Excess of Loss',
    lineOfBusiness: 'Cyber',
    code: 'cyber_xol',
    reinsuranceType: 'treaty',
    perils: ['data_breach', 'ransomware', 'business_interruption', 'systemic_cyber'],
    regions: ['US-Nationwide', 'Western-Europe', 'Global'],
    currencies: ['USD', 'EUR', 'GBP'],
    core: ['cover_letter', 'placing_slip', 'reinsurance_questionnaire', 'loss_run'],
    optional: ['exposure_data', 'broker_deck', 'claims_bordereau', 'program_structure', 'cedent_financials', 'rating_agency_report', 'actuarial_report'],
  },
  {
    name: 'Financial Lines / D&O Treaty',
    lineOfBusiness: 'Directors & Officers',
    code: 'financial_lines',
    reinsuranceType: 'treaty',
    perils: ['securities_claim', 'management_liability', 'regulatory'],
    regions: ['US-Nationwide', 'UK', 'Western-Europe'],
    currencies: ['USD', 'GBP', 'EUR'],
    core: ['cover_letter', 'placing_slip', 'reinsurance_questionnaire', 'loss_run'],
    optional: ['cedent_financials', 'premium_bordereau', 'broker_deck', 'claims_bordereau', 'rating_agency_report', 'program_structure', 'actuarial_report'],
  },
  {
    name: "Workers' Compensation Treaty",
    lineOfBusiness: "Workers' Compensation",
    code: 'workers_comp',
    reinsuranceType: 'treaty',
    perils: ['occupational_injury', 'occupational_disease'],
    regions: ['US-California', 'US-Nationwide', 'Canada'],
    currencies: ['USD', 'CAD'],
    core: ['cover_letter', 'placing_slip', 'loss_run', 'premium_bordereau'],
    optional: ['schedule_of_locations', 'exposure_data', 'claims_bordereau', 'risk_engineering_survey', 'cedent_financials', 'actuarial_report'],
  },
  {
    name: 'Agriculture / Crop Treaty',
    lineOfBusiness: 'Agriculture',
    code: 'agriculture',
    reinsuranceType: 'treaty',
    perils: ['drought', 'hail', 'flood', 'frost'],
    regions: ['US-Midwest', 'LatAm', 'Eastern-Europe'],
    currencies: ['USD', 'EUR', 'BRL'],
    core: ['cover_letter', 'placing_slip', 'statement_of_values', 'loss_run'],
    optional: ['schedule_of_locations', 'exposure_data', 'hazard_map', 'program_structure', 'property_photos', 'actuarial_report', 'aerial_imagery'],
  },
  {
    name: 'Political Violence & Terrorism',
    lineOfBusiness: 'Political Violence',
    code: 'political_violence',
    reinsuranceType: 'facultative',
    perils: ['terrorism', 'sabotage', 'riot', 'war'],
    regions: ['Middle-East', 'LatAm', 'Sub-Saharan-Africa', 'Global'],
    currencies: ['USD', 'GBP', 'EUR'],
    core: ['cover_letter', 'placing_slip', 'statement_of_values', 'schedule_of_locations'],
    optional: ['risk_engineering_survey', 'property_photos', 'hazard_map', 'broker_deck', 'program_structure', 'cedent_financials', 'data_pack'],
  },
  {
    name: 'Construction & Engineering (CAR/EAR)',
    lineOfBusiness: 'Engineering',
    code: 'engineering_car',
    reinsuranceType: 'facultative',
    perils: ['construction_all_risk', 'erection_all_risk', 'machinery_breakdown'],
    regions: ['Middle-East', 'Southeast-Asia', 'Western-Europe'],
    currencies: ['USD', 'EUR', 'AED'],
    core: ['cover_letter', 'placing_slip', 'statement_of_values', 'risk_engineering_survey'],
    optional: ['schedule_of_locations', 'property_photos', 'program_structure', 'loss_run', 'broker_deck', 'endorsements', 'aerial_imagery', 'data_pack'],
  },
];

/** Lightweight, public view of an archetype — lets callers (e.g. the scenario
 *  layer) restrict/select lines of business without re-declaring the catalog. */
export interface ArchetypeInfo {
  code: string;
  name: string;
  lineOfBusiness: string;
  reinsuranceType: 'treaty' | 'facultative';
}

export const ARCHETYPE_INFO: ReadonlyArray<ArchetypeInfo> = ARCHETYPES.map((a) => ({
  code: a.code,
  name: a.name,
  lineOfBusiness: a.lineOfBusiness,
  reinsuranceType: a.reinsuranceType,
}));

/** Every archetype code, in catalog order. */
export const ARCHETYPE_CODES: ReadonlyArray<string> = ARCHETYPES.map((a) => a.code);

const ARCHETYPE_BY_CODE = new Map<string, Archetype>(ARCHETYPES.map((a) => [a.code, a]));

// ---------------------------------------------------------------------------
// Cedents / brokers / vault hosts
// ---------------------------------------------------------------------------

const CEDENTS = [
  'Gulf Coast Mutual Insurance',
  'Lloyd’s Syndicate 2488',
  'Meridian Specialty Insurance',
  'Cascadia Mutual',
  'Atlantic Surety & Casualty',
  'Pacific Rim Marine Insurers',
  'Sentinel National Insurance',
  'Britannia Underwriting PLC',
  'Nordic Cedant Forsikring AS',
  'Lone Star Property & Casualty',
  'Helvetia Specialty AG',
  'Sakura Marine & Fire',
  'Andes Seguros Generales',
  'Savannah Re Cedant Co',
];

const BROKERS = [
  'Aon Reinsurance Solutions',
  'Guy Carpenter & Co',
  'Gallagher Re',
  'Howden Re',
  'Lockton Re',
  'BMS Re',
  'McGill and Partners',
];

const VAULT_HOSTS = ['object-store.us-east-1.amazonaws.com', 'submissions.blob.core.windows.net', 'storage.googleapis.com'];

// ---------------------------------------------------------------------------
// Complexity assignment
// ---------------------------------------------------------------------------

/**
 * Hand out `count` complexity scores in 1..10 whose arithmetic mean is exactly
 * `target` (default 7). A symmetric spread gives organic variety; a final
 * correction pass nudges values (staying in range) until the sum lands on
 * `target * count`, so the average is exact rather than approximate — which is
 * the headline guarantee callers rely on.
 */
export function assignComplexities(count: number, target = 7): number[] {
  if (count <= 0) return [];
  const spread = [0, 2, -2, 1, -1, 3, -3];
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(clamp(target + spread[i % spread.length], 1, 10));
  }

  // Correct any residual drift so the mean is exactly `target`.
  const desired = target * count;
  let sum = out.reduce((a, b) => a + b, 0);
  let guard = 0;
  while (sum !== desired && guard < count * 40) {
    const dir = desired > sum ? 1 : -1;
    let moved = false;
    for (let i = 0; i < count; i += 1) {
      const next = out[i] + dir;
      if (next >= 1 && next <= 10) {
        out[i] = next;
        sum += dir;
        moved = true;
        break;
      }
    }
    if (!moved) break;
    guard += 1;
  }
  return out;
}

/** Descriptive stats for a set of complexity scores. */
export function summarizeComplexity(values: number[]): {
  average: number;
  min: number;
  max: number;
  count: number;
} {
  if (values.length === 0) return { average: 0, min: 0, max: 0, count: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    average: Math.round((sum / values.length) * 100) / 100,
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
  };
}

// ---------------------------------------------------------------------------
// Package construction
// ---------------------------------------------------------------------------

/** How many attachments a submission of a given complexity should carry. */
function attachmentBudget(rng: Rng, complexity: number): number {
  // Centre the count on the complexity score (so the average attachment count
  // tracks the average complexity ~7) with a touch of jitter, then bound it.
  const jitter = pick(rng, [-1, 0, 0, 1]);
  return clamp(complexity + jitter, 2, 16);
}

function buildFileSpec(
  rng: Rng,
  blueprint: DocBlueprint,
  ctx: {
    cedentSlug: string;
    brokerSlug: string;
    org: number;
    submissionId: number;
    year: number;
    copy?: number;
    /** Archetype code injected into the file name to keep multi-LOB bundles distinct. */
    lobTag?: string;
  },
  complexity: number,
): SubmissionFileSpec {
  const meta = KIND_META[blueprint.kind];
  const extIdx = Math.floor(rng() * meta.ext.length);
  const ext = meta.ext[extIdx];
  const mime = meta.mime[Math.min(extIdx, meta.mime.length - 1)];

  // Size scales mildly with complexity within the kind's envelope.
  const [loKb, hiKb] = meta.sizeKb;
  const span = hiKb - loKb;
  const sizeKb = Math.round(loKb + span * (0.25 + 0.6 * (complexity / 10)) * (0.6 + 0.8 * rng()));
  const fileSize = clamp(sizeKb, loKb, hiKb) * 1024;

  const copySuffix = blueprint.multiple ? `_${String(ctx.copy ?? 1).padStart(3, '0')}` : '';
  const labelSlug = slug(blueprint.label.replace(/\s*\(.*\)\s*/g, ''));
  // A `lobTag` is only present for multi-LOB bundles; single-LOB file names are
  // unchanged, so the default generator output stays byte-identical.
  const lobPart = ctx.lobTag ? `${slug(ctx.lobTag)}_` : '';
  const fileName = `${ctx.cedentSlug}_${lobPart}${labelSlug}${copySuffix}_${ctx.year}.${ext}`;

  const checksum = `sha256:${hexDigest(rng)}`;

  // Logical/remote location, kept for display + as the fallback when the backing
  // fixture is unavailable. Deliberately avoids the literal `s3://` scheme: the
  // OCR stage hard-fails on unresolvable `s3://` keys but degrades gracefully (a
  // warning) on every other scheme, so seeded submissions still advance cleanly.
  const host = pick(rng, VAULT_HOSTS);
  const storagePath = `https://${host}/ingest/org-${ctx.org}/submission-${ctx.submissionId}/${fileName}`;

  // Back the attachment with a real, OCR-readable fixture of a compatible format
  // so the seeded submission yields genuine extracted text (no "Unable to read").
  const corpusPool = CORPUS_BY_KIND[blueprint.kind];
  const corpusFile = corpusPool[Math.floor(rng() * corpusPool.length)];

  return {
    fileName,
    fileType: mime,
    fileSize,
    storagePath,
    checksum,
    category: blueprint.category,
    kind: blueprint.kind,
    corpusFile,
  };
}

/** Optional knobs a scenario layer uses to shape a package. */
export interface BuildPackageOptions {
  organizationId?: number;
  submissionId?: number;
  /**
   * Explicit archetype codes to bundle. One code = a conventional single-LOB
   * submission; 2+ codes = a true multi-LOB / broker-package / portfolio
   * submission that carries every bundled line's documents under one proposal.
   * When omitted the archetype is chosen from `seed` exactly as before.
   */
  archetypeCodes?: string[];
  /**
   * Restrict the seed-chosen archetype to treaty or facultative. Ignored when
   * `archetypeCodes` is supplied (those carry their own reinsurance type).
   */
  reinsuranceType?: 'treaty' | 'facultative';
  /**
   * Keep only perils in this set when sampling the primary line's perils (e.g. a
   * catastrophe-exposed submission → hurricane/earthquake/flood/wildfire). Falls
   * back to the archetype's full peril list when the filter excludes everything.
   */
  perilFilter?: string[];
  /**
   * Document categories to strip after assembly (e.g. an Incomplete submission →
   * drop `loss_run`/`statement_of_values`/`cedent_financials`). The ">= 1 PDF"
   * and imagery invariants still run afterwards, so a stripped package stays
   * advanceable.
   */
  dropCategories?: string[];
  /** Give each bundled archetype its own cedent (broker package / portfolio). */
  multipleInsureds?: boolean;
}

/** Resolve the archetype(s) a package should carry from its options/seed. */
function selectArchetypes(seed: number, opts: BuildPackageOptions): Archetype[] {
  if (opts.archetypeCodes && opts.archetypeCodes.length > 0) {
    const list = opts.archetypeCodes
      .map((code) => ARCHETYPE_BY_CODE.get(code))
      .filter((a): a is Archetype => Boolean(a));
    if (list.length > 0) return list;
  }
  let pool: readonly Archetype[] = ARCHETYPES;
  if (opts.reinsuranceType) {
    const filtered = ARCHETYPES.filter((a) => a.reinsuranceType === opts.reinsuranceType);
    if (filtered.length > 0) pool = filtered;
  }
  return [pool[((seed % pool.length) + pool.length) % pool.length]];
}

/** Pick an archetype's doc blueprints within a budget (core then optionals). */
function chooseBlueprints(archetype: Archetype, cx: number, budget: number): DocBlueprint[] {
  const chosen: DocBlueprint[] = [];
  for (const key of archetype.core) {
    if (chosen.length >= budget) break;
    chosen.push(DOC_LIBRARY[key]);
  }
  const unlocked = archetype.optional
    .map((k) => DOC_LIBRARY[k])
    .filter((d) => cx >= d.minComplexity)
    .sort((a, b) => a.minComplexity - b.minComplexity);
  for (const blueprint of unlocked) {
    if (chosen.length >= budget) break;
    chosen.push(blueprint);
  }
  return chosen;
}

type FileCtx = {
  cedentSlug: string;
  brokerSlug: string;
  org: number;
  submissionId: number;
  year: number;
  copy?: number;
  lobTag?: string;
};

/** Materialise one archetype's chosen blueprints into file specs. */
function assembleArchetypeFiles(
  rng: Rng,
  archetype: Archetype,
  cx: number,
  budget: number,
  ctx: FileCtx,
): SubmissionFileSpec[] {
  const chosen = chooseBlueprints(archetype, cx, budget);
  const files: SubmissionFileSpec[] = [];
  for (const blueprint of chosen) {
    if (blueprint.multiple) {
      // Imagery/maps arrive as small sets that grow with complexity.
      const copies = clamp(Math.floor(cx / 3) + intBetween(rng, 0, 1), 1, 6);
      for (let c = 1; c <= copies && files.length < budget + 4; c += 1) {
        files.push(buildFileSpec(rng, blueprint, { ...ctx, copy: c }, cx));
      }
    } else {
      files.push(buildFileSpec(rng, blueprint, ctx, cx));
    }
  }
  return files;
}

/**
 * Build a deterministic submission package for `(seed, complexity)`.
 *
 * With no options the archetype is chosen from `seed` (so sequential ids fan out
 * across every line of business) and `complexity` governs the attachment budget
 * plus which optional artefacts are unlocked — behaviour is byte-identical to the
 * original single-archetype generator. Options let the scenario layer bundle
 * multiple lines of business, pin treaty/facultative, filter perils, drop
 * documents (Incomplete submissions) and spread the bundle across multiple
 * insureds. Invariants: at least one PDF is always present, and risks of
 * complexity >= 4 carry at least one image.
 */
export function buildSubmissionPackage(
  seed: number,
  complexity: number,
  opts: BuildPackageOptions = {},
): SubmissionPackage {
  const cx = clamp(Math.round(complexity), 1, 10);
  const rng = mulberry32(Math.imul(seed >>> 0, 2654435761) ^ (cx * 0x9e3779b1));

  const archetypes = selectArchetypes(seed, opts);
  const primary = archetypes[0];
  const multi = archetypes.length > 1;
  const org = opts.organizationId ?? 0;
  const submissionId = opts.submissionId ?? seed;

  // NB: the rng draws below (cedent → broker → currency → year → perils →
  // regions → budget → primary files → invariants) preserve the original call
  // order, so a single-archetype package with no options is unchanged.
  const cedent = pick(rng, CEDENTS);
  const broker = pick(rng, BROKERS);
  const currency = pick(rng, primary.currencies);
  const year = 2024 + intBetween(rng, 0, 2);

  // Perils / regions sampled per submission (1..3 of each), preserving order.
  // A peril filter (cat-exposed scenarios) narrows the source list first.
  const perilSource =
    opts.perilFilter && opts.perilFilter.length > 0
      ? primary.perils.filter((p) => opts.perilFilter!.includes(p))
      : primary.perils;
  const perilPool = perilSource.length > 0 ? perilSource : primary.perils;
  const perils = sampleSubset(rng, perilPool, 1, Math.min(3, perilPool.length));
  const regions = sampleSubset(rng, primary.regions, 1, Math.min(2, primary.regions.length));

  const budget = attachmentBudget(rng, cx);
  // Split the budget across bundled lines so a multi-LOB package stays sane;
  // single-LOB keeps the full budget (and thus identical output).
  const perArchBudget = multi ? clamp(Math.round(budget / archetypes.length) + 1, 3, 12) : budget;

  const baseCtx: FileCtx = { cedentSlug: slug(cedent), brokerSlug: slug(broker), org, submissionId, year };
  let files: SubmissionFileSpec[] = assembleArchetypeFiles(
    rng,
    primary,
    cx,
    perArchBudget,
    multi ? { ...baseCtx, lobTag: primary.code } : baseCtx,
  );

  // Additional bundled lines (Multi-LOB / Broker Package / Portfolio). Each gets
  // its own cedent when `multipleInsureds` is set, otherwise shares the primary's.
  const cedents = [cedent];
  for (const arch of archetypes.slice(1)) {
    const lineCedent = opts.multipleInsureds ? pick(rng, CEDENTS) : cedent;
    if (!cedents.includes(lineCedent)) cedents.push(lineCedent);
    const lineCtx: FileCtx = { ...baseCtx, cedentSlug: slug(lineCedent), lobTag: arch.code };
    files.push(...assembleArchetypeFiles(rng, arch, cx, perArchBudget, lineCtx));
  }

  // Drop requested document categories (Incomplete / Declined-incomplete). Runs
  // before the invariants so the package still satisfies them.
  if (opts.dropCategories && opts.dropCategories.length > 0) {
    const dropped = new Set(opts.dropCategories);
    files = files.filter((f) => !dropped.has(f.category));
  }

  // Invariant: always at least one PDF (the slip is one, but guard anyway).
  if (!files.some((f) => f.kind === 'pdf')) {
    files.push(buildFileSpec(rng, DOC_LIBRARY.placing_slip, baseCtx, cx));
  }
  // Invariant: meaningful risks (>=4) carry imagery.
  if (cx >= 4 && !files.some((f) => f.kind === 'image')) {
    files.push(buildFileSpec(rng, DOC_LIBRARY.property_photos, { ...baseCtx, copy: 1 }, cx));
  }

  const kinds: Record<string, number> = {};
  let totalBytes = 0;
  for (const f of files) {
    kinds[f.kind] = (kinds[f.kind] ?? 0) + 1;
    totalBytes += f.fileSize;
  }
  const categories = Array.from(new Set(files.map((f) => f.category)));

  const lineOfBusinesses = archetypes.map((a) => a.lineOfBusiness);
  const lineOfBusinessCodes = archetypes.map((a) => a.code);

  const manifest: PackageManifest = {
    archetype: primary.name,
    lineOfBusiness: primary.lineOfBusiness,
    lineOfBusinessCode: primary.code,
    lineOfBusinesses,
    lineOfBusinessCodes,
    archetypes: archetypes.map((a) => a.name),
    reinsuranceType: primary.reinsuranceType,
    cedents,
    cedent,
    broker,
    perils,
    regions,
    currency,
    complexity: cx,
    fileCount: files.length,
    totalBytes,
    categories,
    kinds,
    hasImagery: Boolean(kinds.image),
  };

  const lobLabel = multi ? lineOfBusinesses.join(' + ') : primary.lineOfBusiness;
  const summaryText =
    `${primary.reinsuranceType === 'treaty' ? 'Treaty' : 'Facultative'} submission — ${lobLabel}. ` +
    `Cedent: ${cedents.join(', ')}; broker: ${broker}. Perils: ${perils.join(', ')}. ` +
    `Regions: ${regions.join(', ')}. Currency: ${currency}. ` +
    `${files.length} attachment(s) across ${categories.length} document type(s); complexity ${cx}/10.`;

  return { manifest, files, summaryText };
}

/** Sample between `min` and `max` items from `arr`, preserving original order. */
function sampleSubset<T>(rng: Rng, arr: readonly T[], min: number, max: number): T[] {
  const n = clamp(intBetween(rng, min, max), 0, arr.length);
  const idx = arr.map((_, i) => i);
  // Fisher–Yates partial shuffle for the first `n` picks.
  for (let i = 0; i < n; i += 1) {
    const j = i + Math.floor(rng() * (idx.length - i));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx
    .slice(0, n)
    .sort((a, b) => a - b)
    .map((i) => arr[i]);
}
