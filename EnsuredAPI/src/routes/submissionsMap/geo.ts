/**
 * Pure geo helpers for the submissions map layer.
 *
 * Every submission gets exactly one map point. If the pipeline has geocoded an
 * insured location we plot the real coordinate; otherwise we drop the submission
 * at Point Nemo (the oceanic pole of inaccessibility) — a recognizable "nowhere"
 * marker so locationless submissions are still visible and clearly not a real
 * risk. A tiny deterministic jitter (keyed off the submission id) fans out
 * overlapping points so each stays individually clickable, while the whole
 * cluster still reads as sitting at Point Nemo.
 */

export interface Coord {
  latitude: number;
  longitude: number;
}

/** A finite, in-range, non-null-island coordinate. */
export function isPlottableCoord(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  // 0,0 is the classic geocode-failure sentinel ("null island"), not a real risk.
  if (lat === 0 && lng === 0) return false;
  return true;
}

/** Read lat/lng off a subject object, tolerating both top-level and `attributes.*` shapes. */
function coordFromSubject(subject: unknown): Coord | null {
  if (!subject || typeof subject !== 'object') return null;
  const s = subject as Record<string, any>;
  const candidates: Array<[unknown, unknown]> = [
    [s.latitude, s.longitude],
    [s.attributes?.latitude, s.attributes?.longitude],
  ];
  for (const [lat, lng] of candidates) {
    if (isPlottableCoord(lat, lng)) return { latitude: lat as number, longitude: lng as number };
  }
  return null;
}

/**
 * Find the primary geocoded location for a submission from its SubmissionOutput
 * structuredData. Checks the geocoded blocks in priority order and returns the
 * first plottable subject coordinate, or null if none has been discovered yet.
 */
export function pickSubmissionLocation(structuredData: Record<string, unknown> | null | undefined): Coord | null {
  if (!structuredData || typeof structuredData !== 'object') return null;
  const data = structuredData as Record<string, any>;
  const blocks = [data.locationDiscovery, data.extraction, data.insuredSubjects];
  for (const block of blocks) {
    const subjects = block && Array.isArray(block.subjects) ? block.subjects : [];
    for (const subject of subjects) {
      const coord = coordFromSubject(subject);
      if (coord) return coord;
    }
  }
  return null;
}

// Point Nemo — the oceanic pole of inaccessibility, the most remote point from
// any land. Used as the holding marker for submissions with no discovered
// location, so they never masquerade as a real risk on land.
export const POINT_NEMO: Coord = { latitude: -48.8767, longitude: -123.3933 };

// Max jitter (degrees) applied around Point Nemo so overlapping placeholder
// points fan out enough to stay individually clickable, while still clustering
// visibly at Point Nemo.
const NEMO_JITTER_DEG = 0.4;

/** Deterministic 32-bit hash of a number id (stable placeholder placement). */
function hashId(id: number): number {
  let h = (id ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Place a locationless submission at Point Nemo, with a tiny deterministic jitter
 * (keyed off the submission id) so a batch of locationless submissions fans out
 * around the point instead of stacking on a single pixel. Stable across refreshes.
 */
export function pointNemoPlaceholder(submissionId: number): Coord {
  const h = hashId(submissionId);
  const dx = (((h >>> 1) % 1000) / 1000 - 0.5) * 2 * NEMO_JITTER_DEG;
  const dy = (((h >>> 11) % 1000) / 1000 - 0.5) * 2 * NEMO_JITTER_DEG;
  return {
    latitude: POINT_NEMO.latitude + dy,
    longitude: POINT_NEMO.longitude + dx,
  };
}

export interface SubmissionTypeInfo {
  code: string | null;
  label: string | null;
}

/**
 * Read the transaction/submission type off a submission's structuredData. The
 * submissionType stage writes both a headline scalar (`submissionTypeCode`) and a
 * nested block (`submissionType.submissionTypeCode`); prefer the scalar, fall back
 * to the block. Returns nulls when the submission hasn't been typed yet.
 */
export function pickSubmissionType(
  structuredData: Record<string, unknown> | null | undefined
): SubmissionTypeInfo {
  if (!structuredData || typeof structuredData !== 'object') return { code: null, label: null };
  const data = structuredData as Record<string, any>;
  const block = data.submissionType && typeof data.submissionType === 'object' ? data.submissionType : null;
  const str = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);
  return {
    code: str(data.submissionTypeCode) ?? str(block?.submissionTypeCode),
    label: str(data.submissionTypeLabel) ?? str(block?.submissionTypeLabel),
  };
}
