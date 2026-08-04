/**
 * Extraction versioning helpers.
 *
 * Reruns of the extraction stage must APPEND a new generation of ExtractedField
 * rows (tagged with an incrementing `extractionVersion`) rather than clobbering
 * or silently duplicating prior rows — so improvements are auditable and the
 * pipeline's replay story holds. The next version is (max existing version) + 1,
 * with the very first run = 1.
 */

import { Op } from 'sequelize';
import { ExtractedField } from '../../../db/models';

/**
 * Pure helper: given the existing versions for a document, return the version to
 * stamp on the next run. Empty/absent history -> 1; otherwise max + 1.
 */
export function nextExtractionVersion(existingVersions: Array<number | null | undefined>): number {
  let max = 0;
  for (const v of existingVersions) {
    const n = Number(v);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

/**
 * Compute the next extraction version for a document by reading the current max
 * `extractionVersion` across its ExtractedField rows. First run yields 1.
 */
export async function computeNextExtractionVersion(documentId: number): Promise<number> {
  const current = (await ExtractedField.max('extractionVersion', {
    where: { documentId },
  })) as number | null;
  return nextExtractionVersion([current]);
}

/**
 * Read the LATEST generation of extracted fields for a document — i.e. the rows
 * carrying the maximum `extractionVersion`. Prior versions are preserved in the
 * table for audit but are not returned here. Returns [] when none exist.
 */
export async function getLatestExtractedFields(documentId: number): Promise<ExtractedField[]> {
  const max = (await ExtractedField.max('extractionVersion', { where: { documentId } })) as number | null;
  if (max === null || max === undefined) {
    // No versioned rows at all — return whatever exists (legacy/unversioned).
    return ExtractedField.findAll({ where: { documentId } });
  }
  return ExtractedField.findAll({
    where: { documentId, extractionVersion: { [Op.eq]: max } },
    order: [['id', 'ASC']],
  });
}
