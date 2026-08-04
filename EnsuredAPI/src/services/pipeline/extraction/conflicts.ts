/**
 * Cross-document conflict detection + field-level provenance for extraction.
 *
 * A submission arrives as a BUNDLE of documents (cover note, slip, SOV, loss
 * run, …). The OCR stage concatenates them into one text blob with explicit
 * `===== DOCUMENT n of m: filename =====` boundary markers, and extraction then
 * collapses the whole blob into one flat field set. The failure mode that hides
 * inside that collapse: when two documents disagree on a core fact (different
 * named insured, currency, effective date, TIV) the extractor silently picks one
 * value and reports it with full confidence — there is no signal that the sources
 * contradicted each other. For an AI intake product that is the single most
 * important thing to surface, because a contradiction means "a human must look".
 *
 * This module is PURE. It re-splits the merged OCR text back into per-document
 * chunks using the boundary markers OCR already inserted (so it needs nothing
 * beyond the text extraction already receives), then:
 *   - {@link buildConflictReport} flags every core field on which ≥2 documents
 *     report DIFFERENT values, listing each value and the documents that carry it;
 *   - it attributes each finally-extracted scalar to the document(s) whose text
 *     actually contains that value (field-level provenance).
 *
 * The result is advisory metadata on the extraction output — it never changes the
 * extracted values, only adds `conflicts`, `provenance` and a `needsReview` flag
 * so the board (and a later validation gate) can route contradictions to a human.
 */

/** One source document, recovered from the merged OCR text. */
export interface DocChunk {
  fileName: string;
  text: string;
}

/** A core field on which the source documents disagree. */
export interface FieldConflict {
  field: string;
  /** Each distinct value and the documents that report it. */
  values: Array<{ value: string; sources: string[] }>;
}

export interface ConflictReport {
  /** Fields ≥2 documents disagree on. Empty when every document agrees. */
  conflicts: FieldConflict[];
  /** Extracted-field → the document filenames whose text contains its value. */
  provenance: Record<string, string[]>;
}

const DOC_MARKER = /^=====\s*DOCUMENT\s+\d+\s+of\s+\d+:\s*(.+?)\s*=====\s*$/gim;

/**
 * Re-split the merged OCR text into per-document chunks using the boundary
 * markers the OCR stage inserts for multi-document packages. A single-document
 * submission (no markers) yields one chunk labelled `(submission)`.
 */
export function splitOcrDocuments(ocrText: string): DocChunk[] {
  const text = String(ocrText ?? '');
  if (!text.trim()) return [];

  const markers: Array<{ fileName: string; start: number; end: number }> = [];
  DOC_MARKER.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DOC_MARKER.exec(text)) !== null) {
    markers.push({ fileName: m[1].trim(), start: m.index, end: DOC_MARKER.lastIndex });
  }
  if (markers.length === 0) return [{ fileName: '(submission)', text }];

  const chunks: DocChunk[] = [];
  for (let i = 0; i < markers.length; i += 1) {
    const bodyStart = markers[i].end;
    const bodyEnd = i + 1 < markers.length ? markers[i + 1].start : text.length;
    chunks.push({ fileName: markers[i].fileName, text: text.slice(bodyStart, bodyEnd).trim() });
  }
  return chunks;
}

// --- value normalisation -----------------------------------------------------

function normText(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function parseScaledMoney(raw: string, scaleRaw: string | undefined): number | null {
  const amount = Number(String(raw).replace(/[, ]/g, ''));
  if (!Number.isFinite(amount)) return null;
  const scale = String(scaleRaw ?? '').trim().toLowerCase();
  if (scale === 'm') return amount * 1_000_000;
  if (scale === 'b') return amount * 1_000_000_000;
  if (scale === 'k') return amount * 1_000;
  return amount;
}

/**
 * A per-document probe for one core field: how to pull a candidate value out of a
 * single document's text, and how to normalise it so equal facts compare equal.
 */
interface Probe {
  field: string;
  extract: (text: string) => string | null;
  /** Canonical form used to decide whether two documents agree. */
  normalize: (value: string) => string;
}

function matchGroup(text: string, pattern: RegExp): string | null {
  const m = text.match(pattern);
  return m && m[1] ? m[1].trim() : null;
}

const PROBES: Probe[] = [
  {
    field: 'namedInsured',
    extract: (t) =>
      matchGroup(
        t,
        /(?:named\s+insured|insured\s+name|name\s+of\s+(?:the\s+)?insured|policyholder|applicant|cedent\s*\(reinsured\)|cedent\s*\(?reinsured\)?|cedent)\s*[:\-]\s*([^\n\r,;]{2,120})/i,
      ),
    normalize: normText,
  },
  {
    field: 'currency',
    extract: (t) => matchGroup(t, /currency\s*[:\-]?\s*([A-Za-z]{3})\b/i) ?? matchGroup(t, /\b(USD|EUR|GBP|JPY|CHF|CAD|AUD|SGD|HKD)\b/),
    normalize: (v) => v.trim().toUpperCase(),
  },
  {
    field: 'effectiveDate',
    extract: (t) =>
      matchGroup(
        t,
        /(?:effective\s+date|inception\s+date)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      ),
    normalize: (v) => v.trim().toLowerCase(),
  },
  {
    field: 'totalInsuredValue',
    extract: (t) => {
      const m = t.match(/(?:total\s+insured\s+value|tiv)\s*[:\-]?\s*[A-Za-z]{0,3}\s*\$?\s*([\d.,]+)\s*([kmb])?/i);
      if (!m) return null;
      const value = parseScaledMoney(m[1], m[2]);
      return value === null ? null : String(value);
    },
    normalize: (v) => v.trim(),
  },
];

/**
 * Detect cross-document conflicts and build field-level provenance from the
 * merged OCR text and the finally-extracted entities. Pure and side-effect free.
 */
export function buildConflictReport(
  ocrText: string,
  entities: Record<string, unknown>,
): ConflictReport {
  const docs = splitOcrDocuments(ocrText);

  // --- conflicts: ≥2 documents reporting different values for one field --------
  const conflicts: FieldConflict[] = [];
  // Conflict detection needs at least two distinct source documents to compare.
  if (docs.length > 1) {
    for (const probe of PROBES) {
      // normalized value -> { display value, source filenames }
      const byValue = new Map<string, { value: string; sources: string[] }>();
      for (const doc of docs) {
        const raw = probe.extract(doc.text);
        if (!raw) continue;
        const key = probe.normalize(raw);
        if (!key) continue;
        const entry = byValue.get(key);
        if (entry) {
          if (!entry.sources.includes(doc.fileName)) entry.sources.push(doc.fileName);
        } else {
          byValue.set(key, { value: raw, sources: [doc.fileName] });
        }
      }
      if (byValue.size > 1) {
        conflicts.push({ field: probe.field, values: Array.from(byValue.values()) });
      }
    }
  }

  // --- provenance: which documents contain each extracted scalar's value -------
  const provenance: Record<string, string[]> = {};
  for (const [field, value] of Object.entries(entities)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'object' || typeof value === 'boolean') continue;
    const needles = valueNeedles(value);
    if (needles.length === 0) continue;
    const sources = docs
      .filter((doc) => {
        const hay = doc.text.toLowerCase();
        return needles.some((n) => hay.includes(n));
      })
      .map((doc) => doc.fileName);
    if (sources.length > 0) provenance[field] = sources;
  }

  return { conflicts, provenance };
}

/**
 * Candidate string forms of an extracted value to search document text for. A
 * number is searched both raw and thousands-grouped (e.g. `15000000` and
 * `15,000,000`); a string is searched as its lowercased self.
 */
function valueNeedles(value: unknown): string[] {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const raw = String(value);
    const grouped = value.toLocaleString('en-US');
    return Array.from(new Set([raw, grouped.toLowerCase()]));
  }
  const s = String(value).trim().toLowerCase();
  // Skip trivially-short tokens that would match almost anything.
  return s.length >= 3 ? [s] : [];
}
