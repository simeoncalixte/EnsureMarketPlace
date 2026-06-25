/**
 * Deterministic, derived extraction confidence.
 *
 * The Gemini provider returns field values with NO per-field confidence, and the
 * regex/NER fallback obviously has none either. Historically the service stamped
 * a hardcoded per-field constant (limit 0.9, deductible 0.88, … else 0.65) onto
 * every value regardless of where it came from or whether it parsed — so a
 * garbage value and a clean one carried the same number, and an underwriter
 * could not triage by confidence. This module replaces that with a transparent,
 * unit-tested formula so the persisted confidence actually MEANS something.
 *
 * The score is built from two independent, documented signals and clamped to
 * [0, 1]:
 *
 *   confidence = clamp(SOURCE_PRIOR + validityAdjustment, 0, 1)
 *
 * 1. SOURCE PRIOR — how much we trust the extractor that produced the value:
 *      - gemini_extraction : 0.70  (an LLM reading the whole document in context)
 *      - ocr_ner (regex)   : 0.55  (a brittle pattern match on raw text)
 *    A field is never assumed correct on source alone; the prior is the BASELINE
 *    that validity then pushes up or down.
 *
 * 2. VALIDITY ADJUSTMENT — does the VALUE itself look like the thing it claims
 *    to be? Each field has a validator that returns a bounded adjustment:
 *      +0.20  strong   — parses cleanly and lands in a plausible range
 *      +0.10  ok       — parses but is unremarkable / mildly weak
 *       0.00  neutral  — no opinion (unknown field)
 *      -0.15  weak     — present but suspicious (too short, out of range)
 *      -0.25  invalid  — fails to parse as its declared type
 *    The adjustment is intentionally smaller in magnitude than the spread
 *    between sources for the strong case, so a clean regex hit can still beat a
 *    weak LLM hit, and a clean LLM hit (0.70 + 0.20 = 0.90) tops out near the
 *    old "best" constant — but now only when the value is actually valid.
 *
 * Worked examples:
 *   - limit "$3,000,000" from gemini   -> 0.70 + 0.20 = 0.90
 *   - limit "$3,000,000" from regex    -> 0.55 + 0.20 = 0.75
 *   - limit "0" (parses, non-positive) -> 0.55 - 0.25 = 0.30 (regex)
 *   - companyDomain "acme.com" gemini  -> 0.70 + 0.20 = 0.90
 *   - companyDomain "acme" gemini      -> 0.70 - 0.25 = 0.45 (no TLD)
 *   - riskType "x" regex               -> 0.55 - 0.15 = 0.40 (too short)
 *   - effectiveDate "05/01/2026" gemini-> 0.70 + 0.20 = 0.90
 *   - effectiveDate "soon" gemini      -> 0.70 - 0.25 = 0.45 (unparseable)
 */

/** The extractor that produced a field. Mirrors the service's `source` tag. */
export type ExtractionSource = 'gemini_extraction' | 'ocr_ner' | string;

/** Source priors. Documented above; the LLM-in-context beats the regex baseline. */
const SOURCE_PRIORS: Record<string, number> = {
  gemini_extraction: 0.7,
  ocr_ner: 0.55,
};
/** Unknown/unspecified source: conservative, between the two known priors. */
const DEFAULT_SOURCE_PRIOR = 0.6;

/** Bounded validity adjustments (see module doc). */
const ADJ = {
  strong: 0.2,
  ok: 0.1,
  neutral: 0.0,
  weak: -0.15,
  invalid: -0.25,
} as const;

type Adjustment = (typeof ADJ)[keyof typeof ADJ];

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** Parse a money-ish value (already a number, or a "$3,000,000"/"3.0M" string). */
function parseMoney(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const m = raw.match(/^\$?\s*([\d.,]+)\s*([kmb])?\s*$/i);
  if (!m) {
    const n = Number(raw.replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  const amount = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(amount)) return null;
  const scale = (m[2] ?? '').toLowerCase();
  if (scale === 'k') return amount * 1_000;
  if (scale === 'm') return amount * 1_000_000;
  if (scale === 'b') return amount * 1_000_000_000;
  return amount;
}

/** A positive money amount is strong; zero/negative is invalid; unparseable invalid. */
function scoreMoney(value: unknown): Adjustment {
  const n = parseMoney(value);
  if (n === null) return ADJ.invalid;
  return n > 0 ? ADJ.strong : ADJ.invalid;
}

/** Does this look like a real calendar date the rest of the stack could parse? */
function scoreDate(value: unknown): Adjustment {
  const raw = String(value ?? '').trim();
  if (!raw) return ADJ.invalid;
  // Accept ISO, US slashed, and "Month D, YYYY" forms; require Date to parse it.
  const looksDateShaped =
    /\d{4}-\d{1,2}-\d{1,2}/.test(raw) ||
    /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(raw) ||
    /[A-Za-z]{3,}\s+\d{1,2},?\s+\d{4}/.test(raw);
  if (!looksDateShaped) return ADJ.invalid;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? ADJ.strong : ADJ.invalid;
}

/**
 * Expected yield is stored as a decimal fraction (9% -> 0.09). A plausible
 * underwriting yield is (0, 0.5]; anything else is suspicious or mis-scaled.
 */
function scoreYield(value: unknown): Adjustment {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(/%\s*$/, ''));
  if (!Number.isFinite(n)) return ADJ.invalid;
  if (n > 0 && n <= 0.5) return ADJ.strong;
  if (n > 0.5 && n <= 1) return ADJ.weak; // possibly a percent that wasn't divided
  return ADJ.invalid;
}

/** A company domain must look like host.tld. */
function scoreDomain(value: unknown): Adjustment {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return ADJ.invalid;
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(raw) ? ADJ.strong : ADJ.invalid;
}

/**
 * Free-text-ish short labels (riskType, triggerType): reward a reasonable word,
 * penalize one-character noise. A long phrase is fine but unremarkable (ok).
 */
function scoreShortLabel(value: unknown): Adjustment {
  const raw = String(value ?? '').trim();
  if (raw.length < 3) return ADJ.weak;
  if (raw.length <= 40) return ADJ.strong;
  return ADJ.ok;
}

/** A location should have some substance (street/city); very short is weak. */
function scoreLocation(value: unknown): Adjustment {
  const raw = String(value ?? '').trim();
  if (raw.length < 6) return ADJ.weak;
  return ADJ.ok;
}

/**
 * A named insured / subject-of-insurance descriptor should carry real substance:
 * a one-character fragment is noise, a normal name or phrase is strong, and an
 * unusually long blob is accepted but unremarkable (the model may have over-quoted).
 */
function scoreEntityText(value: unknown): Adjustment {
  const raw = String(value ?? '').trim();
  if (raw.length < 3) return ADJ.weak;
  if (raw.length <= 160) return ADJ.strong;
  return ADJ.ok;
}

/** subjectCount is a positive integer count of insured items. */
function scoreCount(value: unknown): Adjustment {
  const n = Number(value);
  if (!Number.isFinite(n)) return ADJ.invalid;
  return Number.isInteger(n) && n > 0 ? ADJ.strong : ADJ.weak;
}

/**
 * Field -> validator. Fields not listed get a neutral (0) adjustment, so the
 * confidence collapses to the source prior — no magic per-field constants.
 */
const VALIDATORS: Record<string, (value: unknown) => Adjustment> = {
  namedInsured: scoreEntityText,
  insuredSubject: scoreEntityText,
  limit: scoreMoney,
  deductible: scoreMoney,
  insuredValue: scoreMoney,
  effectiveDate: scoreDate,
  expectedYield: scoreYield,
  companyDomain: scoreDomain,
  riskType: scoreShortLabel,
  triggerType: scoreShortLabel,
  propertyLocation: scoreLocation,
  oracleDataSource: scoreLocation,
  subjectCount: scoreCount,
};

/**
 * Derive a [0,1] confidence for one extracted field from its name, value and
 * the extractor that produced it. Pure and deterministic — same inputs always
 * yield the same score. See the module doc for the formula and worked examples.
 */
export function scoreFieldConfidence(fieldName: string, value: unknown, source: ExtractionSource): number {
  const prior = SOURCE_PRIORS[source] ?? DEFAULT_SOURCE_PRIOR;

  // An empty value carries no information regardless of source.
  if (value === null || value === undefined || String(value).trim().length === 0) {
    return clamp01(prior + ADJ.invalid);
  }

  const validator = VALIDATORS[fieldName];
  const adjustment = validator ? validator(value) : ADJ.neutral;
  return clamp01(prior + adjustment);
}

/** Exposed for tests/inspection. */
export const __testing = { SOURCE_PRIORS, DEFAULT_SOURCE_PRIOR, ADJ, parseMoney };
