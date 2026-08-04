import type { DealSubjectRecord } from '../../db/models/capital.models';
import type { SubjectTemplateResolution } from './types';
import {
  buildRenderedTemplateSnapshot,
  normalizeFieldValueMap,
  normalizeOptionalText,
} from './pageTemplates.service';

export const ACTIVE_DEAL_STATUSES = new Set(['approved', 'fundraising', 'active']);
export const OPEN_SUBSCRIPTION_STATUSES = new Set(['committed', 'pending', 'partially_filled']);

export function deriveDealLineOfBusiness(
  subjects: DealSubjectRecord[] | null | undefined,
  fallbackPerilType?: string | null,
): { lineOfBusiness?: string; lineOfBusinessSubType?: string } {
  const rows = Array.isArray(subjects) ? subjects : [];

  for (const subject of rows) {
    const lineOfBusiness =
      typeof subject.lineOfBusiness === 'string'
        ? subject.lineOfBusiness.trim()
        : '';
    const lineOfBusinessSubType =
      typeof subject.lineOfBusinessSubType === 'string'
        ? subject.lineOfBusinessSubType.trim()
        : '';

    if (lineOfBusiness || lineOfBusinessSubType) {
      return {
        lineOfBusiness: lineOfBusiness || undefined,
        lineOfBusinessSubType: lineOfBusinessSubType || undefined,
      };
    }
  }

  const peril = String(fallbackPerilType ?? '').trim().toLowerCase();
  if (!peril) {
    return {};
  }

  if (['hurricane', 'tornado', 'wind', 'windstorm'].includes(peril)) {
    return { lineOfBusiness: 'Catastrophe Property', lineOfBusinessSubType: 'Windstorm' };
  }
  if (peril === 'flood') {
    return { lineOfBusiness: 'Catastrophe Property', lineOfBusinessSubType: 'Flood' };
  }
  if (peril === 'earthquake') {
    return { lineOfBusiness: 'Catastrophe Property', lineOfBusinessSubType: 'Earthquake' };
  }
  if (peril === 'wildfire') {
    return { lineOfBusiness: 'Catastrophe Property', lineOfBusinessSubType: 'Wildfire' };
  }

  const label = peril
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((token) => token[0].toUpperCase() + token.slice(1))
    .join(' ');

  return label ? { lineOfBusiness: label } : {};
}

export function buildDealSubjectRecord(params: {
  subject: {
    subjectId?: string;
    subjectLabel?: string;
    subjectIndex?: number;
    lineOfBusiness?: string | null;
    lineOfBusinessSubType?: string | null;
    fieldValues?: Record<string, unknown>;
    locationText?: unknown;
    assetType?: unknown;
    constructionType?: unknown;
    occupancyType?: unknown;
    replacementCost?: unknown;
    latitude?: unknown;
    longitude?: unknown;
    vulnerabilityScore?: unknown;
  };
  index: number;
  templateResolution: SubjectTemplateResolution;
}): DealSubjectRecord {
  const subjectLabel = String(params.subject.subjectLabel ?? `Subject ${params.index + 1}`).trim() || `Subject ${params.index + 1}`;
  const lineOfBusiness = normalizeOptionalText(params.subject.lineOfBusiness);
  const lineOfBusinessSubType = normalizeOptionalText(params.subject.lineOfBusinessSubType);
  const normalizedFieldValues = normalizeFieldValueMap(params.subject.fieldValues);
  const renderedTemplateValues: Record<string, unknown> = {
    subjectLabel,
    lineOfBusiness: lineOfBusiness ?? null,
    lineOfBusinessSubType: lineOfBusinessSubType ?? null,
    locationText: normalizeOptionalText(typeof params.subject.locationText === 'string' ? params.subject.locationText : null),
    assetType: normalizeOptionalText(typeof params.subject.assetType === 'string' ? params.subject.assetType : null),
    constructionType: normalizeOptionalText(typeof params.subject.constructionType === 'string' ? params.subject.constructionType : null),
    occupancyType: normalizeOptionalText(typeof params.subject.occupancyType === 'string' ? params.subject.occupancyType : null),
    replacementCost: params.subject.replacementCost ?? null,
    latitude: params.subject.latitude ?? null,
    longitude: params.subject.longitude ?? null,
    vulnerabilityScore: params.subject.vulnerabilityScore ?? null,
    ...normalizedFieldValues,
  };

  return {
    subjectId: String(params.subject.subjectId ?? `subject-${params.index + 1}`),
    subjectLabel,
    subjectIndex: Number.isFinite(Number(params.subject.subjectIndex)) ? Number(params.subject.subjectIndex) : params.index + 1,
    lineOfBusiness,
    lineOfBusinessSubType,
    fieldValues: normalizedFieldValues,
    locationText: typeof renderedTemplateValues.locationText === 'string' ? normalizeOptionalText(renderedTemplateValues.locationText) : null,
    assetType: typeof renderedTemplateValues.assetType === 'string' ? normalizeOptionalText(renderedTemplateValues.assetType) : null,
    constructionType: typeof renderedTemplateValues.constructionType === 'string' ? normalizeOptionalText(renderedTemplateValues.constructionType) : null,
    occupancyType: typeof renderedTemplateValues.occupancyType === 'string' ? normalizeOptionalText(renderedTemplateValues.occupancyType) : null,
    replacementCost: renderedTemplateValues.replacementCost ?? null,
    latitude: renderedTemplateValues.latitude ?? null,
    longitude: renderedTemplateValues.longitude ?? null,
    vulnerabilityScore: renderedTemplateValues.vulnerabilityScore ?? null,
    templateSnapshot: buildRenderedTemplateSnapshot({
      definitionJson: params.templateResolution.definitionJson,
      scopeKey: params.templateResolution.scopeKey,
      organizationId: params.templateResolution.organizationId,
      lineOfBusinessCode: params.templateResolution.lineOfBusinessCode,
      lineOfBusinessSubTypeCode: params.templateResolution.lineOfBusinessSubTypeCode,
      fieldValues: renderedTemplateValues,
    }),
  };
}

export function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function monthsBetween(startDate: Date, endDate: Date): number {
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 1;
  }

  const startMonth = startDate.getFullYear() * 12 + startDate.getMonth();
  const endMonth = endDate.getFullYear() * 12 + endDate.getMonth();
  return Math.max(1, endMonth - startMonth + 1);
}
