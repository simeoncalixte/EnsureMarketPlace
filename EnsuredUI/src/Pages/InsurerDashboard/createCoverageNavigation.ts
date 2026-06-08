import type { DealSubmissionSeed } from './InsurerDashboard.sectionTypes';

/**
 * The "Create Coverage" route. Both the incoming-submissions page and the
 * pipeline board navigate here, passing the clicked submission as router state
 * (`{ sourceSubmission }`) so the form pre-fills and the schema-generated
 * suggested form loads for that submission.
 */
export const CREATE_COVERAGE_PATH = '/insurer/coverage/create';

/** Router state shape consumed by the create-coverage page (InsurerDashboard). */
export type CreateCoverageNavState = { sourceSubmission: DealSubmissionSeed };

/** Minimal shape shared by the pipeline board and incoming-submission board items. */
type BoardItemLike = {
  id: number;
  values: Record<string, string | number | null>;
};

function asString(value: unknown, fallback = ''): string {
  return value === null || value === undefined ? fallback : String(value);
}

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Map a board item (pipeline or incoming-submissions) into the seed the
 * create-coverage page expects. Tolerant of either board's value keys — both
 * expose submissionNumber/cedent/lineOfBusiness/region/premium/exposure/etc.
 */
export function createDealSubmissionSeed(item: BoardItemLike): DealSubmissionSeed {
  const v = item.values;
  return {
    submissionId: asNumber(v.submissionId ?? item.id),
    submissionNumber: asString(v.submissionNumber, `SUB-${String(item.id).padStart(4, '0')}`),
    cedent: asString(v.cedent),
    lineOfBusiness: asString(v.lineOfBusiness),
    locationText: asString(v.locationText ?? v.location ?? v.address ?? v.region),
    region: asString(v.region),
    premium: asNumber(v.premium),
    exposure: asNumber(v.exposure),
    receivedLabel: asString(v.receivedLabel),
    owner: asString(v.owner),
    source: asString(v.source),
    notes: asString(v.notes ?? v.lastWarning),
  };
}
