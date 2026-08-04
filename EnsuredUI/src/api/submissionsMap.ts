// Submissions map layer API — every submission as a GeoJSON point under `/api`.
import { getJson } from './client';

export type SubmissionsMapFiltersQuery = {
  lob?: string[];
  sub?: string[];
  peril?: string[];
  geography?: string[];
  tivMin?: number;
  tivMax?: number;
  limitMin?: number;
  limitMax?: number;
  attachmentMin?: number;
  attachmentMax?: number;
  broker?: string[];
  carrier?: string[];
  submissionStatus?: string[];
  catPeril?: string[];
  catBand?: string[];
  catModelVersion?: string[];
  catRecommendedAction?: string[];
  catScoreMin?: number;
  catScoreMax?: number;
};

function toCsv(values: string[] | undefined): string | null {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }
  const normalized = values.map((entry) => String(entry).trim()).filter(Boolean);
  return normalized.length > 0 ? normalized.join(',') : null;
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildSubmissionsMapPath(filters?: SubmissionsMapFiltersQuery): string {
  if (!filters) {
    return '/api/submissions-map';
  }

  const params = new URLSearchParams();
  const appendCsv = (key: string, values?: string[]) => {
    const csv = toCsv(values);
    if (csv) {
      params.set(key, csv);
    }
  };

  appendCsv('broker', filters.broker);
  appendCsv('carrier', filters.carrier);
  appendCsv('submissionStatus', filters.submissionStatus);
  appendCsv('lob', filters.lob);
  appendCsv('sub', filters.sub);
  appendCsv('peril', filters.peril);
  appendCsv('geography', filters.geography);
  appendCsv('catPeril', filters.catPeril);
  appendCsv('catBand', filters.catBand);
  appendCsv('catModelVersion', filters.catModelVersion);
  appendCsv('catRecommendedAction', filters.catRecommendedAction);

  const catScoreMin = toFiniteNumber(filters.catScoreMin);
  const catScoreMax = toFiniteNumber(filters.catScoreMax);
  if (catScoreMin !== null) {
    params.set('catScoreMin', String(catScoreMin));
  }
  if (catScoreMax !== null) {
    params.set('catScoreMax', String(catScoreMax));
  }
  for (const key of ['tivMin', 'tivMax', 'limitMin', 'limitMax', 'attachmentMin', 'attachmentMax'] as const) {
    const value = toFiniteNumber(filters[key]);
    if (value !== null) {
      params.set(key, String(value));
    }
  }

  const queryString = params.toString();
  return queryString ? `/api/submissions-map?${queryString}` : '/api/submissions-map';
}

/**
 * GET /api/submissions-map — all submissions for the current organization as a GeoJSON
 * FeatureCollection of Points (one per submission, any status). Each feature's `properties`
 * carries `submissionNumber`, `status`, `cedent`, `lineOfBusiness`, `region`, `owner`,
 * `assigned`, `located`, `placeholderOcean` and `receivedLabel`. Submissions without a
 * geocoded location are placed in open ocean (`located: false`).
 */
export function getSubmissionsMap<T = unknown>(filters?: SubmissionsMapFiltersQuery): Promise<T> {
  return getJson<T>(buildSubmissionsMapPath(filters));
}
