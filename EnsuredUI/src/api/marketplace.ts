// Marketplace API — requests under `/api/marketplace`.
//
// Covers opportunities, the line-of-business taxonomy, insured-subject page
// templates, deals, and capital-exposure summary/metrics. Functions that the
// caller needs to normalize or whose errors it formats itself return the raw
// `Response`; the rest return parsed JSON.
import { apiRequest, getJson, type ApiFetchOptions } from './client';

// ─── Line-of-business taxonomy + page template types ───────────────────────────
export type LineOfBusinessTaxonomySubType = {
  code: string;
  label: string;
};

export type LineOfBusinessTaxonomyPrimary = {
  code: string;
  label: string;
  subTypes: LineOfBusinessTaxonomySubType[];
};

export type LineOfBusinessTaxonomyResponse = {
  primaryTypes: LineOfBusinessTaxonomyPrimary[];
};

export type LineOfBusinessPageTemplateOption = {
  label: string;
  value: string;
};

export type LineOfBusinessPageTemplateVisibility = {
  lineOfBusinessCodes?: string[];
  lineOfBusinessSubTypeCodes?: string[];
};

export type LineOfBusinessPageTemplateSectionLayout = {
  type?: 'grid';
  columns?: number;
  gap?: number;
  dense?: boolean;
  columnWidths?: number[];
  rowHeights?: number[];
};

export type LineOfBusinessPageTemplateFieldLayout = {
  columnStart?: number;
  columnSpan?: number;
  rowStart?: number;
  rowSpan?: number;
};

export type LineOfBusinessPageTemplateField = {
  key: string;
  label: string;
  type: string;
  order: number;
  required?: boolean;
  canonicalKey?: string;
  placeholder?: string;
  helperText?: string;
  dataSource?: string;
  dependsOn?: string;
  defaultValue?: string | number | boolean | null;
  options?: LineOfBusinessPageTemplateOption[];
  /**
   * Reference to a lazy-loaded option set (see `loadSchemaOptionSet`) instead of
   * inlined `options`. Generated `select`/`radio` fields carry this; the UI
   * fetches the {value,label} items on demand the first time the field renders.
   */
  optionSetKey?: string;
  visibleWhen?: LineOfBusinessPageTemplateVisibility;
  layout?: LineOfBusinessPageTemplateFieldLayout;
};

export type LineOfBusinessPageTemplateSection = {
  key: string;
  label: string;
  order: number;
  description?: string;
  fields: LineOfBusinessPageTemplateField[];
  layout?: LineOfBusinessPageTemplateSectionLayout;
};

export type LineOfBusinessPageTemplate = {
  schemaVersion: number;
  pageKey: string;
  title: string;
  description?: string;
  sections: LineOfBusinessPageTemplateSection[];
};

export type LineOfBusinessPageDataResponse = {
  primaryTypes: LineOfBusinessTaxonomyPrimary[];
  pageTemplate: LineOfBusinessPageTemplate | null;
  isOrgTemplate?: boolean;
};

const TAXONOMY_PATH = '/api/marketplace/line-of-business-taxonomy';
const PAGE_TEMPLATE_PATH = '/api/marketplace/insured-subjects/page-template';

function taxonomyPath(params: {
  organizationId?: number | null;
  lineOfBusinessCode?: string | null;
  lineOfBusinessSubTypeCode?: string | null;
} = {}): string {
  const searchParams = new URLSearchParams();
  if (params.organizationId != null) searchParams.set('organizationId', String(params.organizationId));
  if (params.lineOfBusinessCode) searchParams.set('lineOfBusinessCode', params.lineOfBusinessCode);
  if (params.lineOfBusinessSubTypeCode) searchParams.set('lineOfBusinessSubTypeCode', params.lineOfBusinessSubTypeCode);
  const queryString = searchParams.toString();
  return queryString ? `${TAXONOMY_PATH}?${queryString}` : TAXONOMY_PATH;
}

/**
 * GET taxonomy — best-effort, returns [] on any failure.
 * (Used by InsurerDashboard helpers that render an empty list on error.)
 */
export async function loadLineOfBusinessTaxonomy(): Promise<LineOfBusinessTaxonomyPrimary[]> {
  try {
    const response = await apiRequest(TAXONOMY_PATH, { method: 'GET' });
    if (!response.ok) return [];
    const data = (await response.json()) as LineOfBusinessTaxonomyResponse;
    return Array.isArray(data?.primaryTypes) ? data.primaryTypes : [];
  } catch {
    return [];
  }
}

/**
 * The risk + pricing models connected to a line of business via the Risk Class
 * Registry. `resolvedFrom` says where the connection came from; `generic_default`
 * means NO real model is connected (it is only the fallback).
 */
export type RiskClassResolution = {
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
  schemaVersionId: number | null;
  riskModelingMethod: string | null;
  ratingMethod: string | null;
  resolvedFrom: 'org_subtype' | 'org_primary' | 'platform_subtype' | 'platform_primary' | 'generic_default';
};

export type RiskClassRegistryResponse = {
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
  hasOrgDeclaration: boolean;
  declaration: Record<string, unknown> | null;
  resolution: RiskClassResolution;
};

/**
 * GET the registry resolution (connected risk + pricing models) for a line of
 * business. Best-effort: returns null on any failure so callers can simply render
 * nothing when the connection data isn't available.
 */
export async function loadRiskClassRegistry(params: {
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode?: string | null;
  organizationId?: number | null;
}): Promise<RiskClassRegistryResponse | null> {
  const lob = params.lineOfBusinessSubTypeCode
    ? `${encodeURIComponent(params.lineOfBusinessCode)}/${encodeURIComponent(params.lineOfBusinessSubTypeCode)}`
    : encodeURIComponent(params.lineOfBusinessCode);
  const qs = params.organizationId != null ? `?organizationId=${params.organizationId}` : '';
  try {
    const response = await apiRequest(`/api/marketplace/risk-classes/${lob}/registry${qs}`, { method: 'GET' });
    if (!response.ok) return null;
    return (await response.json()) as RiskClassRegistryResponse;
  } catch {
    return null;
  }
}

/** GET taxonomy + org page template — best-effort, returns empty payload on failure. */
export async function loadLineOfBusinessPageData(
  params: { organizationId?: number | null } = {},
): Promise<LineOfBusinessPageDataResponse> {
  try {
    const response = await apiRequest(taxonomyPath(params), { method: 'GET' });
    if (!response.ok) return { primaryTypes: [], pageTemplate: null };
    const data = (await response.json()) as Partial<LineOfBusinessPageDataResponse>;
    return {
      primaryTypes: Array.isArray(data?.primaryTypes) ? data.primaryTypes : [],
      pageTemplate: data?.pageTemplate ?? null,
    };
  } catch {
    return { primaryTypes: [], pageTemplate: null };
  }
}

export type LoadInsuredSubjectPageTemplateResult = {
  template: LineOfBusinessPageTemplate;
  isOrgTemplate: boolean;
};

/** GET the insured-subject page template; throws when none is available. */
export async function loadInsuredSubjectPageTemplate(params: {
  organizationId?: number | null;
  lineOfBusinessCode?: string | null;
  lineOfBusinessSubTypeCode?: string | null;
}): Promise<LoadInsuredSubjectPageTemplateResult> {
  const res = await apiRequest(taxonomyPath(params), { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Failed to load insured subject template (${res.status})`);
  }
  const json = (await res.json()) as Partial<LineOfBusinessPageDataResponse>;
  if (!json.pageTemplate) {
    throw new Error('Failed to load insured subject template');
  }
  return { template: json.pageTemplate, isOrgTemplate: json.isOrgTemplate === true };
}

/** PUT a custom page template. Parses the API's `{ error }` body on failure. */
export async function saveLineOfBusinessPageTemplate(params: {
  definition: LineOfBusinessPageTemplate;
  organizationId?: number | null;
  lineOfBusinessCode?: string | null;
  lineOfBusinessSubTypeCode?: string | null;
}): Promise<LineOfBusinessPageTemplate> {
  const res = await apiRequest(PAGE_TEMPLATE_PATH, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationId: params.organizationId ?? null,
      lineOfBusinessCode: params.lineOfBusinessCode ?? '',
      lineOfBusinessSubTypeCode: params.lineOfBusinessSubTypeCode ?? '',
      definitionJson: params.definition,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ?? `Failed to save template (${res.status})`);
  }
  const json = await res.json();
  return json.pageTemplate as LineOfBusinessPageTemplate;
}

/** POST a new field onto a page-template section. */
export async function addLineOfBusinessTemplateField(params: {
  organizationId?: number | null;
  lineOfBusinessCode?: string | null;
  lineOfBusinessSubTypeCode?: string | null;
  sectionKey: string;
  field: {
    key: string;
    label: string;
    type?: string;
    required?: boolean;
  };
}): Promise<LineOfBusinessPageTemplate> {
  const res = await apiRequest(`${PAGE_TEMPLATE_PATH}/fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationId: params.organizationId ?? null,
      lineOfBusinessCode: params.lineOfBusinessCode ?? '',
      lineOfBusinessSubTypeCode: params.lineOfBusinessSubTypeCode ?? '',
      sectionKey: params.sectionKey,
      field: params.field,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ?? `Failed to add template field (${res.status})`);
  }
  const json = await res.json();
  return json.pageTemplate as LineOfBusinessPageTemplate;
}

/** DELETE a field from a page-template section. */
export async function removeLineOfBusinessTemplateField(params: {
  organizationId?: number | null;
  lineOfBusinessCode?: string | null;
  lineOfBusinessSubTypeCode?: string | null;
  sectionKey: string;
  fieldKey: string;
}): Promise<LineOfBusinessPageTemplate> {
  const res = await apiRequest(`${PAGE_TEMPLATE_PATH}/fields`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationId: params.organizationId ?? null,
      lineOfBusinessCode: params.lineOfBusinessCode ?? '',
      lineOfBusinessSubTypeCode: params.lineOfBusinessSubTypeCode ?? '',
      sectionKey: params.sectionKey,
      fieldKey: params.fieldKey,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ?? `Failed to remove template field (${res.status})`);
  }
  const json = await res.json();
  return json.pageTemplate as LineOfBusinessPageTemplate;
}

// ─── Opportunities ─────────────────────────────────────────────────────────────
/** Path constant exposed so callers can keep their diagnostic error suffixes. */
export const OPPORTUNITIES_ACTIVE_PENDING_FUNDING_PATH =
  '/api/marketplace/opportunities/active-pending-funding';

/**
 * GET active / partially-funded opportunities. Optional `dealId` / `dealName`
 * filters. Raw Response: callers normalize the payload and format errors.
 */
export function getActivePendingFunding(params?: { dealId?: string | number; dealName?: string | number }): Promise<Response> {
  const searchParams = new URLSearchParams();
  if (params?.dealId != null && params.dealId !== '') searchParams.set('dealId', String(params.dealId));
  if (params?.dealName != null && params.dealName !== '') searchParams.set('dealName', String(params.dealName));
  const queryString = searchParams.toString();
  const path = queryString
    ? `${OPPORTUNITIES_ACTIVE_PENDING_FUNDING_PATH}?${queryString}`
    : OPPORTUNITIES_ACTIVE_PENDING_FUNDING_PATH;
  return apiRequest(path, { method: 'GET' });
}

/** GET the line-of-business taxonomy as a raw Response (caller normalizes). */
export function getLineOfBusinessTaxonomyResponse(params?: {
  organizationId?: number | null;
  lineOfBusinessCode?: string | null;
  lineOfBusinessSubTypeCode?: string | null;
}): Promise<Response> {
  return apiRequest(taxonomyPath(params), { method: 'GET' });
}

// ─── Deals ─────────────────────────────────────────────────────────────────────
/** POST /api/marketplace/deals — create a deal. Raw Response (caller reads res.text()). */
export function createDeal(payload: unknown): Promise<Response> {
  return apiRequest('/api/marketplace/deals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ─── Capital exposure ──────────────────────────────────────────────────────────
/** GET /api/marketplace/summary/capital-exposure — live exposure summary. Raw Response. */
export function getCapitalExposureSummary(): Promise<Response> {
  return apiRequest('/api/marketplace/summary/capital-exposure', { method: 'GET' });
}

export type CapitalExposurePoint = { calculatedAt: string; value: number };

/** GET /api/marketplace/metrics/capital-exposure?start&end — exposure time series. */
export function getCapitalExposureMetrics(start: Date | string, end: Date | string, init?: ApiFetchOptions): Promise<CapitalExposurePoint[]> {
  const startIso = typeof start === 'string' ? start : start.toISOString();
  const endIso = typeof end === 'string' ? end : end.toISOString();
  const path = `/api/marketplace/metrics/capital-exposure?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
  return getJson<CapitalExposurePoint[]>(path, init);
}
