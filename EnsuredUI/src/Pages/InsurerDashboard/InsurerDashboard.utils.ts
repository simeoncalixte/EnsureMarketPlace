import React from 'react';
import type {
  DealSubmissionSeed,
  SubjectGroup,
  SubjectInput,
  SubjectTextFieldKey,
  TrancheInput,
} from './InsurerDashboard.sectionTypes';
import type {
  LineOfBusinessPageTemplate,
  LineOfBusinessPageTemplateField,
  LineOfBusinessPageTemplateSection,
  LineOfBusinessTaxonomyPrimary,
} from './lineOfBusinessTaxonomy';
import {
  UNKNOWN_LOCATION_BUCKET,
  subjectLocationFieldHints,
  subjectTemplateBaseFieldKeys,
  legacyLineOfBusinessAliases,
} from './InsurerDashboard.constants';
import type { PipelineInsuredSubjectsResult } from '../../api/pipeline';

// ── Local helper types ──────────────────────────────────────────────────────

export type GroupedSubject = {
  subject: SubjectInput;
  index: number;
};

export type SubjectLineOfBusinessSelection = {
  primary: string;
  primaryCode: string;
  subType: string;
  subTypeCode: string;
};

export type SectionLayout = NonNullable<LineOfBusinessPageTemplateSection['layout']>;

// ── Number / string helpers ─────────────────────────────────────────────────

export function formatNumberInput(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value)) : '';
}

export function createStableId(prefix: string): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

// ── Line-of-business helpers ────────────────────────────────────────────────

export function normalizeLineOfBusinessKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function resolveLineOfBusinessSelection(
  lineOfBusiness: string,
  lineOfBusinessSubType: string,
  taxonomy: LineOfBusinessTaxonomyPrimary[],
): SubjectLineOfBusinessSelection {
  const raw = lineOfBusiness.trim();
  if (!raw || taxonomy.length === 0) {
    return { primary: '', primaryCode: '', subType: '', subTypeCode: '' };
  }

  const normalized = normalizeLineOfBusinessKey(raw);
  const normalizedSubType = normalizeLineOfBusinessKey(lineOfBusinessSubType);

  const buildSelection = (
    primary: LineOfBusinessTaxonomyPrimary,
    subType?: LineOfBusinessTaxonomyPrimary['subTypes'][number],
  ): SubjectLineOfBusinessSelection => ({
    primary: primary.label,
    primaryCode: primary.code,
    subType: subType?.label ?? '',
    subTypeCode: subType?.code ?? '',
  });

  for (const primary of taxonomy) {
    if (
      normalizeLineOfBusinessKey(primary.label) === normalized ||
      normalizeLineOfBusinessKey(primary.code) === normalized
    ) {
      const matchedSubType = lineOfBusinessSubType
        ? primary.subTypes.find(
            (subType) =>
              normalizeLineOfBusinessKey(subType.label) === normalizedSubType ||
              normalizeLineOfBusinessKey(subType.code) === normalizedSubType,
          )
        : primary.subTypes[0];
      return buildSelection(primary, matchedSubType);
    }

    const matchedSubType = primary.subTypes.find(
      (subType) =>
        normalizeLineOfBusinessKey(subType.label) === normalized ||
        normalizeLineOfBusinessKey(subType.code) === normalized,
    );
    if (matchedSubType) {
      return buildSelection(primary, matchedSubType);
    }

    if (lineOfBusinessSubType) {
      const matchedSubTypeFromHint = primary.subTypes.find(
        (subType) =>
          normalizeLineOfBusinessKey(subType.label) === normalizedSubType ||
          normalizeLineOfBusinessKey(subType.code) === normalizedSubType,
      );
      if (matchedSubTypeFromHint) {
        return buildSelection(primary, matchedSubTypeFromHint);
      }
    }
  }

  for (const alias of legacyLineOfBusinessAliases) {
    if (alias.pattern.test(raw)) {
      const matchedPrimary = taxonomy.find(
        (primary) =>
          normalizeLineOfBusinessKey(primary.label) === normalizeLineOfBusinessKey(alias.primary),
      );
      const resolvedPrimary = matchedPrimary?.label ?? alias.primary;
      const resolvedPrimaryCode = matchedPrimary?.code ?? '';
      const resolvedSubType = alias.subType
        ? (matchedPrimary?.subTypes.find(
            (subType) =>
              normalizeLineOfBusinessKey(subType.label) ===
              normalizeLineOfBusinessKey(alias.subType ?? ''),
          ) ?? null)
        : (matchedPrimary?.subTypes[0] ?? null);

      return {
        primary: resolvedPrimary,
        primaryCode: resolvedPrimaryCode,
        subType: resolvedSubType?.label ?? alias.subType ?? '',
        subTypeCode: resolvedSubType?.code ?? '',
      };
    }
  }

  return { primary: '', primaryCode: '', subType: '', subTypeCode: '' };
}

// ── Subject helpers ─────────────────────────────────────────────────────────

export function createSubjectDraft(
  index: number,
  sourceSubmission: DealSubmissionSeed | null,
  taxonomy: LineOfBusinessTaxonomyPrimary[] = [],
): SubjectInput {
  const labelPrefix = sourceSubmission?.cedent ? `${sourceSubmission.cedent} Subject` : 'Subject';
  const selection = sourceSubmission
    ? resolveLineOfBusinessSelection(sourceSubmission.lineOfBusiness, '', taxonomy)
    : { primary: '', primaryCode: '', subType: '', subTypeCode: '' };

  return {
    subjectId: createStableId('subject'),
    subjectLabel: `${labelPrefix} ${index + 1}`,
    lineOfBusiness: selection.primary,
    lineOfBusinessSubType: selection.subType,
    fieldValues: {},
  };
}

export function buildDefaultSubjects(
  sourceSubmission: DealSubmissionSeed | null,
  taxonomy: LineOfBusinessTaxonomyPrimary[] = [],
): SubjectInput[] {
  return [createSubjectDraft(0, sourceSubmission, taxonomy)];
}

/**
 * Hydrate the form's subject cards from the pipeline's extracted insured
 * subjects: each subject's OWN line of business (the LLM-assigned canonical
 * code), its extracted attributes as editable field values, and its inline
 * per-subject template. Returns [] when the result carries no subjects so the
 * caller keeps the blank default.
 */
export function subjectsFromInsuredSubjects(
  result: PipelineInsuredSubjectsResult,
  taxonomy: LineOfBusinessTaxonomyPrimary[],
): SubjectInput[] {
  return result.subjects.map((subject, index) => {
    const selection = resolveLineOfBusinessSelection(
      subject.lineOfBusinessCode ?? subject.lineOfBusinessLabel ?? '',
      '',
      taxonomy,
    );
    const fieldValues: Record<string, string> = {};
    for (const [key, value] of Object.entries(subject.attributes ?? {})) {
      if (value === null || value === undefined) continue;
      fieldValues[key] = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
    }
    return {
      subjectId: createStableId('subject'),
      subjectLabel: subject.name?.trim() || `Subject ${index + 1}`,
      lineOfBusiness: selection.primary,
      lineOfBusinessSubType: selection.subType,
      fieldValues,
      template: subject.template ?? null,
    };
  });
}

export function normalizeSubject(subject: SubjectInput, index: number) {
  const normalizedFieldValues = Object.entries(subject.fieldValues).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      const trimmedValue = value.trim();
      if (trimmedValue) {
        acc[key] = trimmedValue;
      }
      return acc;
    },
    {},
  );

  return {
    subjectId: subject.subjectId,
    subjectLabel: subject.subjectLabel.trim() || `Subject ${index + 1}`,
    subjectIndex: index + 1,
    lineOfBusiness: toOptionalText(subject.lineOfBusiness),
    lineOfBusinessSubType: toOptionalText(subject.lineOfBusinessSubType),
    fieldValues: normalizedFieldValues,
  };
}

// ── Subject location / grouping ─────────────────────────────────────────────

const subjectLocationHintPattern = new RegExp(subjectLocationFieldHints.join('|'));
const subjectLocationCache = new WeakMap<SubjectInput, string>();

export function resolveSubjectLocation(subject: SubjectInput): string {
  if (subjectLocationCache.has(subject)) {
    return subjectLocationCache.get(subject) ?? '';
  }

  const entries = Object.entries(subject.fieldValues);

  for (const [key, rawValue] of entries) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const looksLikeLocation = subjectLocationHintPattern.test(normalizedKey);
    if (!looksLikeLocation) {
      continue;
    }
    const value = rawValue.trim();
    if (value) {
      subjectLocationCache.set(subject, value);
      return value;
    }
  }

  subjectLocationCache.set(subject, '');
  return '';
}

export function groupSubjectsByLocation(subjects: SubjectInput[]): SubjectGroup[] {
  const buckets = new Map<string, GroupedSubject[]>();

  for (let index = 0; index < subjects.length; index += 1) {
    const subject = subjects[index];
    const location = resolveSubjectLocation(subject);
    const bucketLabel = location || UNKNOWN_LOCATION_BUCKET;
    const existing = buckets.get(bucketLabel);
    if (existing) {
      existing.push({ subject, index });
    } else {
      buckets.set(bucketLabel, [{ subject, index }]);
    }
  }

  return Array.from(buckets.entries())
    .sort(([left], [right]) => {
      if (left === UNKNOWN_LOCATION_BUCKET) return 1;
      if (right === UNKNOWN_LOCATION_BUCKET) return -1;
      return left.localeCompare(right);
    })
    .map(([label, groupedSubjects], index) => ({
      key: `${label}-${index}`,
      label,
      subjects: groupedSubjects,
    }));
}

// ── Template section / layout helpers ──────────────────────────────────────

export function defaultSectionLayout(fieldCount: number): SectionLayout {
  const columns = fieldCount >= 6 ? 3 : fieldCount >= 3 ? 2 : 1;
  const rows = Math.max(2, Math.ceil(fieldCount / columns));
  return {
    type: 'grid',
    columns,
    gap: 12,
    dense: false,
    columnWidths: Array.from({ length: columns }, () => 1),
    rowHeights: Array.from({ length: rows }, () => 120),
  };
}

export function resolveSectionLayout(section: LineOfBusinessPageTemplateSection): SectionLayout {
  const fallback = defaultSectionLayout(section.fields.length);
  const explicitBounds = section.fields.reduce(
    (bounds, field) => {
      if (!field.layout) return bounds;
      const columnStart = field.layout.columnStart && field.layout.columnStart > 0 ? field.layout.columnStart : 1;
      const columnSpan = field.layout.columnSpan && field.layout.columnSpan > 0 ? field.layout.columnSpan : 1;
      const rowStart = field.layout.rowStart && field.layout.rowStart > 0 ? field.layout.rowStart : 1;
      const rowSpan = field.layout.rowSpan && field.layout.rowSpan > 0 ? field.layout.rowSpan : 1;
      return {
        columnEnd: Math.max(bounds.columnEnd, columnStart + columnSpan - 1),
        rowEnd: Math.max(bounds.rowEnd, rowStart + rowSpan - 1),
      };
    },
    { columnEnd: 1, rowEnd: 1 },
  );

  const configuredColumns =
    section.layout?.columns && section.layout.columns > 0 ? section.layout.columns : fallback.columns ?? 1;
  const configuredColumnCount = Math.max(
    configuredColumns,
    section.layout?.columnWidths?.length ?? 0,
    explicitBounds.columnEnd,
  );
  const columnWidths = Array.from({ length: configuredColumnCount }, (_, index) => {
    const configuredWidth = section.layout?.columnWidths?.[index];
    return typeof configuredWidth === 'number' && Number.isFinite(configuredWidth) && configuredWidth > 0
      ? configuredWidth
      : 1;
  });

  const configuredRowCount = Math.max(
    section.layout?.rowHeights?.length ?? 0,
    explicitBounds.rowEnd,
    Math.max(2, Math.ceil(section.fields.length / columnWidths.length)),
  );
  const rowHeights = Array.from({ length: configuredRowCount }, (_, index) => {
    const configuredHeight = section.layout?.rowHeights?.[index];
    return typeof configuredHeight === 'number' && Number.isFinite(configuredHeight) && configuredHeight > 0
      ? configuredHeight
      : 120;
  });

  return {
    type: 'grid',
    columns: columnWidths.length,
    gap: section.layout?.gap && section.layout.gap > 0 ? section.layout.gap : fallback.gap,
    dense: Boolean(section.layout?.dense),
    columnWidths,
    rowHeights,
  };
}

export function normalizeTemplateSections(
  sections?: LineOfBusinessPageTemplateSection[],
): LineOfBusinessPageTemplateSection[] {
  return [...(sections ?? [])]
    .sort((left, right) => left.order - right.order)
    .map((section) => ({
      ...section,
      layout: resolveSectionLayout(section),
      fields: [...(section.fields ?? [])].sort((left, right) => left.order - right.order),
    }));
}

export function serializeTemplateDefaultValue(
  value: LineOfBusinessPageTemplateField['defaultValue'],
): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export function fieldMatchesSelection(
  field: LineOfBusinessPageTemplateField,
  selection: SubjectLineOfBusinessSelection,
): boolean {
  const visibility = field.visibleWhen;
  if (!visibility) return true;
  const matchesLineOfBusiness =
    !visibility.lineOfBusinessCodes?.length ||
    Boolean(selection.primaryCode && visibility.lineOfBusinessCodes.includes(selection.primaryCode));
  const matchesSubType =
    !visibility.lineOfBusinessSubTypeCodes?.length ||
    Boolean(selection.subTypeCode && visibility.lineOfBusinessSubTypeCodes.includes(selection.subTypeCode));
  return matchesLineOfBusiness && matchesSubType;
}

export function getRenderableTemplateSections(
  template: LineOfBusinessPageTemplate | null,
  selection: SubjectLineOfBusinessSelection,
): LineOfBusinessPageTemplateSection[] {
  if (!template) return [];
  return normalizeTemplateSections(template.sections ?? [])
    .map((section) => ({
      ...section,
      fields: section.fields.filter(
        (field) =>
          !subjectTemplateBaseFieldKeys.has(field.canonicalKey as SubjectTextFieldKey) &&
          !subjectTemplateBaseFieldKeys.has(field.key as SubjectTextFieldKey) &&
          fieldMatchesSelection(field, selection),
      ),
    }))
    .filter((section) => section.fields.length > 0);
}

export function getRenderableTemplateFields(
  template: LineOfBusinessPageTemplate | null,
  selection: SubjectLineOfBusinessSelection,
): LineOfBusinessPageTemplateField[] {
  return getRenderableTemplateSections(template, selection).flatMap((section) => section.fields);
}

// ── Section grid layout helpers ─────────────────────────────────────────────

export function resolveSectionGridColumns(fieldCount: number): number {
  if (fieldCount >= 6) return 3;
  if (fieldCount >= 3) return 2;
  return 1;
}

export function getExplicitGridBounds(
  fields: LineOfBusinessPageTemplateField[],
): { columnEnd: number; rowEnd: number } {
  return fields.reduce(
    (bounds, field) => {
      if (!field.layout) return bounds;
      const columnStart = field.layout.columnStart && field.layout.columnStart > 0 ? field.layout.columnStart : 1;
      const columnSpan = field.layout.columnSpan && field.layout.columnSpan > 0 ? field.layout.columnSpan : 1;
      const rowStart = field.layout.rowStart && field.layout.rowStart > 0 ? field.layout.rowStart : 1;
      const rowSpan = field.layout.rowSpan && field.layout.rowSpan > 0 ? field.layout.rowSpan : 1;
      return {
        columnEnd: Math.max(bounds.columnEnd, columnStart + columnSpan - 1),
        rowEnd: Math.max(bounds.rowEnd, rowStart + rowSpan - 1),
      };
    },
    { columnEnd: 1, rowEnd: 1 },
  );
}

export function normalizeTrackSizes(
  values: number[] | undefined,
  count: number,
  fallback: number,
): number[] {
  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const candidate = values?.[index];
    return typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0
      ? candidate
      : fallback;
  });
}

export function resolveSectionGridLayout(section: LineOfBusinessPageTemplateSection): {
  columns: number;
  gap: number;
  dense: boolean;
  columnWidths: number[];
  rowHeights: number[];
} {
  const layout = section.layout;
  const explicitBounds = getExplicitGridBounds(section.fields);
  const fallbackColumns = resolveSectionGridColumns(section.fields.length);
  const configuredColumns = layout?.columns && layout.columns > 0 ? layout.columns : fallbackColumns;
  const columnWidths = normalizeTrackSizes(
    layout?.columnWidths,
    Math.max(configuredColumns, layout?.columnWidths?.length ?? 0, explicitBounds.columnEnd),
    1,
  );
  const rowHeights = normalizeTrackSizes(
    layout?.rowHeights,
    Math.max(
      layout?.rowHeights?.length ?? 0,
      explicitBounds.rowEnd,
      Math.max(2, Math.ceil(section.fields.length / columnWidths.length)),
    ),
    120,
  );
  return {
    columns: columnWidths.length,
    gap: layout?.gap && layout.gap > 0 ? layout.gap : 12,
    dense: Boolean(layout?.dense),
    columnWidths,
    rowHeights,
  };
}

export function resolveFieldPlacementStyle(
  field: LineOfBusinessPageTemplateField,
): React.CSSProperties {
  const layout = field.layout;
  const style: React.CSSProperties = { minWidth: 0 };

  if (layout?.columnStart && layout?.columnSpan) {
    style.gridColumn = `${layout.columnStart} / span ${layout.columnSpan}`;
  } else if (layout?.columnStart) {
    style.gridColumn = String(layout.columnStart);
  } else if (layout?.columnSpan) {
    style.gridColumn = `span ${layout.columnSpan}`;
  }

  if (layout?.rowStart && layout?.rowSpan) {
    style.gridRow = `${layout.rowStart} / span ${layout.rowSpan}`;
  } else if (layout?.rowStart) {
    style.gridRow = String(layout.rowStart);
  } else if (layout?.rowSpan) {
    style.gridRow = `span ${layout.rowSpan}`;
  }

  return style;
}

export function mergeTemplateFieldValues(
  existingValues: Record<string, string>,
  fields: LineOfBusinessPageTemplateField[],
): Record<string, string> {
  return fields.reduce<Record<string, string>>((acc, field) => {
    const currentValue = existingValues[field.key];
    if (typeof currentValue === 'string' && currentValue.trim().length > 0) {
      acc[field.key] = currentValue;
      return acc;
    }
    const defaultValue = serializeTemplateDefaultValue(field.defaultValue);
    if (defaultValue) {
      acc[field.key] = defaultValue;
    }
    return acc;
  }, {});
}

// ── Tranche helpers ─────────────────────────────────────────────────────────

export function buildDefaultTranches(exposure: number): TrancheInput[] {
  const baseExposure = exposure > 0 ? exposure : 950000000;
  return [
    {
      trancheId: createStableId('tranche'),
      name: 'Senior Capital',
      layerMin: formatNumberInput(baseExposure * 0.5),
      layerMax: formatNumberInput(baseExposure * 1.2),
      returnRate: '0',
      riskLevel: 'low',
      capitalRequired: formatNumberInput(baseExposure * 0.7),
      subjectSelectionMode: 'all',
      selectedSubjectIds: [],
    },
    {
      trancheId: createStableId('tranche'),
      name: 'Mezzanine',
      layerMin: formatNumberInput(baseExposure * 0.25),
      layerMax: formatNumberInput(baseExposure * 0.5),
      returnRate: '0',
      riskLevel: 'medium',
      capitalRequired: formatNumberInput(baseExposure * 0.25),
      subjectSelectionMode: 'all',
      selectedSubjectIds: [],
    },
  ];
}
