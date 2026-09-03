import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useNavigate, useOutletContext } from 'react-router';
import styled from 'styled-components';
import * as S from './InsurerDashboard.styles';
import {
  addLineOfBusinessTemplateField,
  loadLineOfBusinessPageData,
  loadInsuredSubjectPageTemplate,
  removeLineOfBusinessTemplateField,
  saveLineOfBusinessPageTemplate,
  type LineOfBusinessPageTemplate,
  type LineOfBusinessPageTemplateField,
  type LineOfBusinessPageTemplateFieldLayout,
  type LineOfBusinessPageTemplateSectionLayout,
  type LineOfBusinessPageTemplateSection,
  type LineOfBusinessTaxonomySubType,
  type LineOfBusinessTaxonomyPrimary,
} from './lineOfBusinessTaxonomy';
import LineOfBusinessSectionGrid from './LineOfBusinessSectionGrid';
import { useAuthMe } from '../../lib/useAuthMe';
import Modal from '../../xds/components/Modal';
import SegmentedSwitch from '../../xds/components/SegmentedSwitch';
import StatCard from '../../xds/components/StatCard';
import { colors, withAlpha } from '../../xds/colors';

const PageActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const TableCard = styled.div`
  background: ${colors.surfaceRaised};
  border: 1px solid ${withAlpha(colors.primary, 0.08)};
  border-radius: 12px;
  overflow: hidden;
`;

const TableWrap = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;

  thead th {
    padding: 0.875rem 1.125rem;
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: ${colors.neutral[400]};
    background: ${withAlpha(colors.surfaceLow, 0.75)};
  }

  tbody td {
    padding: 1rem 1.125rem;
    border-top: 1px solid ${withAlpha(colors.border, 0.12)};
    vertical-align: top;
  }

  tbody tr[data-kind='primary'][data-active='true'] {
    background: ${withAlpha(colors.primary, 0.08)};
  }

  tbody tr[data-kind='primary']:hover {
    background: ${withAlpha(colors.onSurface, 0.03)};
  }

  tbody tr[data-kind='subtype'] td {
    background: ${withAlpha(colors.surfaceLow, 0.88)};
  }
`;

const RowButton = styled.button`
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
`;

const Chevron = styled.span<{ $expanded: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  flex: 0 0 auto;
  border-radius: 999px;
  background: ${withAlpha(colors.primary, 0.12)};
  color: ${colors.primary};
  transform: ${({ $expanded }) => ($expanded ? 'rotate(90deg)' : 'rotate(0deg)')};
  transition: transform 160ms ease;
`;

const RowTitle = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: ${colors.onSurfaceStrong};
`;

const RowMeta = styled.div`
  margin-top: 0.25rem;
  color: ${colors.neutral[400]};
  font-size: 12px;
  line-height: 1.45;
`;

const CodePill = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.55rem;
  border-radius: 999px;
  font-size: 11px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Menlo, monospace;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${colors.accent};
  background: ${withAlpha(colors.accentStrong, 0.12)};
`;

const TemplatePill = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.55rem;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${colors.primary};
  background: ${withAlpha(colors.primary, 0.12)};
`;

const ChildCell = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding-left: 1.75rem;
`;

const ChildDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  margin-top: 0.4rem;
  background: ${colors.accent};
  box-shadow: 0 0 0 4px ${withAlpha(colors.accent, 0.08)};
  flex: 0 0 auto;
`;

const EmptyState = styled.div`
  padding: 1.5rem 1.125rem;
  color: ${colors.neutral[400]};
  font-size: 13px;
`;

const BlueprintList = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const BlueprintSection = styled.div`
  display: grid;
  gap: 0.75rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${withAlpha(colors.border, 0.12)};

  &:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }
`;

const BlueprintSectionHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
`;

const BlueprintSectionTitle = styled.div`
  font-size: 12px;
  font-weight: 800;
  color: ${colors.accent};
  text-transform: uppercase;
  letter-spacing: 0.12em;
`;

const BlueprintSectionDetail = styled.div`
  margin-top: 0.25rem;
  color: ${colors.neutral[400]};
  font-size: 12px;
  line-height: 1.5;
`;

const BlueprintItem = styled.div`
  padding-bottom: 0.75rem;
  border-bottom: 1px solid ${withAlpha(colors.border, 0.08)};
`;

const BlueprintHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`;

const TemplateActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${withAlpha(colors.primary, 0.2)};
  background: ${withAlpha(colors.primary, 0.12)};
  color: ${colors.onSurfaceStrong};
  border-radius: 8px;
  padding: 0.35rem 0.6rem;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const BlueprintLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${colors.onSurfaceStrong};
`;

const BlueprintDetail = styled.div`
  margin-top: 0.25rem;
  color: ${colors.neutral[400]};
  font-size: 12px;
  line-height: 1.5;
`;

const BlueprintOrder = styled.ol`
  margin: 0;
  padding-left: 1.15rem;
  color: ${colors.onSurfaceStrong};
  line-height: 1.7;
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  border: 1px solid ${withAlpha(colors.primary, 0.16)};
  background: ${withAlpha(colors.primary, 0.08)};
  color: ${colors.primaryContainer};
  font-size: 11px;
  font-weight: 700;
`;

const ActionLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  padding: 0.6rem 1rem;
  border-radius: 10px;
  border: 1px solid ${withAlpha(colors.primary, 0.24)};
  background: ${withAlpha(colors.primary, 0.14)};
  color: ${colors.onSurfaceStrong};
  font-weight: 700;
  text-decoration: none;
`;

const ContentStack = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const WideColumn = styled(S.LeftColumn)`
  max-width: none;
`;

const IntroText = styled.div`
  margin-bottom: 1rem;
  color: ${colors.onSurfaceVariant};
  font-size: 13px;
  line-height: 1.6;
`;

const SummaryLabel = styled.div`
  font-size: 12px;
  color: ${colors.onSurfaceVariant};
  text-transform: uppercase;
  font-weight: 700;
`;

const SummaryHeadline = styled.div`
  font-size: 20px;
  font-weight: 800;
  margin-top: 8px;
`;

const SegmentBlock = styled.div`
  margin-top: 16px;
`;

const SegmentLabel = styled(SummaryLabel)`
  margin-bottom: 8px;
`;

const SummaryDescription = styled.div`
  margin-top: 8px;
  color: ${colors.onSurfaceVariant};
  font-size: 13px;
  line-height: 1.5;
`;

const SummaryPad = styled.div`
  padding: 16px;
`;

const StatGridCompact = styled(StatGrid)`
  margin-bottom: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
`;

const SummaryHeadingBlock = styled.div`
  font-size: 12px;
  color: ${colors.onSurfaceVariant};
  text-transform: uppercase;
  font-weight: 700;
  margin-bottom: 12px;
`;

const AccentStatusBadge = styled(S.StatusBadge)`
  border-left-color: ${colors.accent};
`;

const AccentStatusText = styled(S.StatusText)`
  color: ${colors.accent};
`;

export const lineOfBusinessRoutePaths = {
  base: '/insurer/coverage/line-of-business',
  activeTemplate: '/insurer/coverage/line-of-business/active-template',
} as const;

type LineOfBusinessPageOutletContext = {
  selectedPrimary: LineOfBusinessTaxonomyPrimary | null;
  selectedSubtype: LineOfBusinessTaxonomySubType | null;
  activeTemplateScopeLabel: string;
  primaryTypeCount: number;
  totalSubTypes: number;
  templateFieldCount: number;
  templateSections: LineOfBusinessPageTemplateSection[];
  templateLoading: boolean;
  templateError: string | null;
  sectionEditorDisabled: boolean;
  editingJson: string;
  saving: boolean;
  setEditingJson: React.Dispatch<React.SetStateAction<string>>;
  setActiveSubtypeCode: React.Dispatch<React.SetStateAction<string | null>>;
  replaceSection: (nextSection: LineOfBusinessPageTemplateSection) => void;
  handleSave: () => Promise<void>;
  handleAddField: (section: LineOfBusinessPageTemplateSection) => Promise<void>;
  handleRemoveField: (section: LineOfBusinessPageTemplateSection, field: LineOfBusinessPageTemplateField) => Promise<void>;
};

function formatSubtypeCount(count: number): string {
  return `${count} subtype${count === 1 ? '' : 's'}`;
}

function formatTemplateFieldDetail(
  field: LineOfBusinessPageTemplateField,
  primaryTypeCount: number,
  subtypeCount: number,
): string {
  if (field.dataSource === 'lineOfBusiness.primaryTypes') {
    return `${primaryTypeCount} primary values loaded from the backend taxonomy.`;
  }

  if (field.dataSource === 'lineOfBusiness.subTypes') {
    return `${subtypeCount} subtype values loaded from the backend taxonomy.`;
  }

  if (field.options?.length) {
    return `${field.options.length} backend values available for this field.`;
  }

  if (field.helperText) {
    return field.helperText;
  }

  if (field.placeholder) {
    return `Example: ${field.placeholder}`;
  }

  return 'Loaded from the backend template definition.';
}

function fieldValueChips(field: LineOfBusinessPageTemplateField): string[] {
  if (field.options?.length) {
    return field.options.map((option) => option.label);
  }

  const chips: string[] = [];

  if (field.dataSource) {
    chips.push(field.dataSource);
  }

  if (field.dependsOn) {
    chips.push(`Depends on ${field.dependsOn}`);
  }

  return chips;
}

function normalizeTemplateSections(sections: LineOfBusinessPageTemplateSection[]): LineOfBusinessPageTemplateSection[] {
  return [...sections]
    .sort((left, right) => left.order - right.order)
    .map((section) => ({
      ...section,
      layout: resolveSectionLayout(section),
      fields: [...section.fields].sort((left, right) => left.order - right.order),
    }));
}

function normalizeFieldKey(value: string): string {
  return value
    .trim()
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function defaultSectionLayout(fieldCount: number): LineOfBusinessPageTemplateSectionLayout {
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

function resolveSectionLayout(section: LineOfBusinessPageTemplateSection): LineOfBusinessPageTemplateSectionLayout {
  const fallback = defaultSectionLayout(section.fields.length);
  const explicitBounds = section.fields.reduce(
    (bounds, field) => {
      if (!field.layout) {
        return bounds;
      }

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

  const configuredColumns = section.layout?.columns && section.layout.columns > 0 ? section.layout.columns : fallback.columns ?? 1;
  const configuredColumnCount = Math.max(configuredColumns, section.layout?.columnWidths?.length ?? 0, explicitBounds.columnEnd);
  const columnWidths = Array.from({ length: configuredColumnCount }, (_, index) => {
    const configuredWidth = section.layout?.columnWidths?.[index];
    return typeof configuredWidth === 'number' && Number.isFinite(configuredWidth) && configuredWidth > 0 ? configuredWidth : 1;
  });

  const configuredRowCount = Math.max(section.layout?.rowHeights?.length ?? 0, explicitBounds.rowEnd, Math.max(2, Math.ceil(section.fields.length / columnWidths.length)));
  const rowHeights = Array.from({ length: configuredRowCount }, (_, index) => {
    const configuredHeight = section.layout?.rowHeights?.[index];
    return typeof configuredHeight === 'number' && Number.isFinite(configuredHeight) && configuredHeight > 0 ? configuredHeight : 120;
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

function resolveFieldLayout(field: LineOfBusinessPageTemplateField): LineOfBusinessPageTemplateFieldLayout | null {
  return field.layout ? { ...field.layout } : null;
}

function parsePositiveInteger(value: string): number | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined;
}

function formatLayoutNumber(value?: number): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(Math.round(value)) : '';
}

function getExplicitGridBounds(fields: LineOfBusinessPageTemplateField[]): { columnEnd: number; rowEnd: number } {
  return fields.reduce(
    (bounds, field) => {
      if (!field.layout) {
        return bounds;
      }

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

function addGridTrack<T>(tracks: T[], nextTrack: T): T[] {
  return [...tracks, nextTrack];
}

function removeGridTrack<T>(tracks: T[]): T[] {
  return tracks.length > 1 ? tracks.slice(0, -1) : tracks;
}

function resizeGridColumnWidths(columnWidths: number[], boundaryIndex: number, deltaPx: number, containerWidthPx: number): number[] {
  if (boundaryIndex < 0 || boundaryIndex >= columnWidths.length - 1 || containerWidthPx <= 0) {
    return columnWidths;
  }

  const totalWeight = columnWidths.reduce((sum, width) => sum + width, 0) || columnWidths.length;
  const deltaWeight = (deltaPx / containerWidthPx) * totalWeight;
  const minWeight = 0.5;
  const next = [...columnWidths];
  const boundedDelta = Math.min(Math.max(deltaWeight, -(next[boundaryIndex] - minWeight)), next[boundaryIndex + 1] - minWeight);

  next[boundaryIndex] = next[boundaryIndex] + boundedDelta;
  next[boundaryIndex + 1] = next[boundaryIndex + 1] - boundedDelta;

  return next;
}

function resizeGridRowHeights(rowHeights: number[], boundaryIndex: number, deltaPx: number): number[] {
  if (boundaryIndex < 0 || boundaryIndex >= rowHeights.length - 1) {
    return rowHeights;
  }

  const minHeight = 72;
  const next = [...rowHeights];
  const boundedDelta = Math.min(Math.max(deltaPx, -(next[boundaryIndex] - minHeight)), next[boundaryIndex + 1] - minHeight);

  next[boundaryIndex] = next[boundaryIndex] + boundedDelta;
  next[boundaryIndex + 1] = next[boundaryIndex + 1] - boundedDelta;

  return next;
}

export default function LineOfBusinessPage() {
  const navigate = useNavigate();
  const [primaryTypes, setPrimaryTypes] = useState<LineOfBusinessTaxonomyPrimary[]>([]);
  const [templateSections, setTemplateSections] = useState<LineOfBusinessPageTemplateSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [activePrimaryCode, setActivePrimaryCode] = useState<string | null>(null);
  const [pageTemplate, setPageTemplate] = useState<LineOfBusinessPageTemplate | null>(null);
  const [activeSubtypeCode, setActiveSubtypeCode] = useState<string | null>(null);
  const [editingJson, setEditingJson] = useState<string>('');
  const { user, loading: authLoading } = useAuthMe();
  const [saving, setSaving] = useState(false);
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [fieldMutationLoading, setFieldMutationLoading] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let active = true;

    setLoading(true);
    void loadLineOfBusinessPageData({ organizationId: user?.organizationId ?? null }).then(({ primaryTypes: taxonomy, pageTemplate }) => {
      if (!active) {
        return;
      }

      setPrimaryTypes(taxonomy);
      setPageTemplate(pageTemplate);
      setTemplateSections(normalizeTemplateSections(pageTemplate?.sections ?? []));
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [authLoading, user?.organizationId]);

  useEffect(() => {
    if (primaryTypes.length === 0) {
      setActivePrimaryCode(null);
      return;
    }

    setActivePrimaryCode((current) => {
      if (current && primaryTypes.some((primary) => primary.code === current)) {
        return current;
      }

      return primaryTypes[0].code;
    });
  }, [primaryTypes]);

  const selectedPrimary = useMemo(
    () => primaryTypes.find((primary) => primary.code === activePrimaryCode) ?? null,
    [activePrimaryCode, primaryTypes],
  );

  const selectedSubtype = useMemo<LineOfBusinessTaxonomySubType | null>(() => {
    if (!selectedPrimary || !activeSubtypeCode) {
      return null;
    }

    return selectedPrimary.subTypes.find((subType) => subType.code === activeSubtypeCode) ?? null;
  }, [selectedPrimary, activeSubtypeCode]);

  useEffect(() => {
    if (!selectedPrimary) {
      setActiveSubtypeCode(null);
      return;
    }

    if (activeSubtypeCode && selectedPrimary.subTypes.some((subType) => subType.code === activeSubtypeCode)) {
      return;
    }

    setActiveSubtypeCode(null);
  }, [selectedPrimary?.code]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!selectedPrimary) {
      setPageTemplate(null);
      setTemplateSections([]);
      setTemplateError(null);
      return;
    }

    let active = true;
    setTemplateLoading(true);
    setTemplateError(null);

    void loadInsuredSubjectPageTemplate({
      organizationId: user?.organizationId ?? null,
      lineOfBusinessCode: selectedPrimary.code,
      lineOfBusinessSubTypeCode: selectedSubtype?.code ?? null,
    })
      .then(({ template, isOrgTemplate }) => {
        if (!active) {
          return;
        }

        setPageTemplate(template);
        const normalized = normalizeTemplateSections(template.sections ?? []);
        setTemplateSections(normalized);

        // Auto-persist an org-scoped copy on first load if one doesn't already exist
        if (!isOrgTemplate && user?.organizationId != null && selectedPrimary) {
          void saveLineOfBusinessPageTemplate({
            definition: { ...template, sections: normalized },
            organizationId: user.organizationId,
            lineOfBusinessCode: selectedPrimary.code,
            lineOfBusinessSubTypeCode: selectedSubtype?.code ?? null,
          });
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setTemplateError(error instanceof Error ? error.message : 'Failed to load active template');
        setPageTemplate(null);
        setTemplateSections([]);
      })
      .finally(() => {
        if (!active) {
          return;
        }

        setTemplateLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, selectedPrimary?.code, selectedSubtype?.code, user?.organizationId]);

  useEffect(() => {
    const base = pageTemplate ?? { schemaVersion: 1, pageKey: 'insured-subjects', title: 'Insured Subjects', sections: templateSections };
    setEditingJson(JSON.stringify({ ...base, sections: templateSections }, null, 2));
  }, [pageTemplate, templateSections]);

  const totalSubTypes = useMemo(
    () => primaryTypes.reduce((count, primary) => count + primary.subTypes.length, 0),
    [primaryTypes],
  );

  const templateFieldCount = useMemo(
    () => templateSections.reduce((count, section) => count + section.fields.length, 0),
    [templateSections],
  );

  const activeSubtypeCount = selectedPrimary?.subTypes.length ?? 0;

  const activeTemplateScopeLabel = selectedPrimary
    ? selectedSubtype
      ? `${selectedPrimary.label} / ${selectedSubtype.label}`
      : `${selectedPrimary.label} / Parent`
    : 'None';

  const sectionEditorDisabled = !selectedPrimary || templateLoading || fieldMutationLoading || layoutSaving;

  function openTemplatePopup(primary: LineOfBusinessTaxonomyPrimary, subtype: LineOfBusinessTaxonomySubType | null) {
    setActivePrimaryCode(primary.code);
    setActiveSubtypeCode(subtype?.code ?? null);
    navigate(lineOfBusinessRoutePaths.activeTemplate);
  }

  const outletContext: LineOfBusinessPageOutletContext = {
    selectedPrimary,
    selectedSubtype,
    activeTemplateScopeLabel,
    primaryTypeCount: primaryTypes.length,
    totalSubTypes,
    templateFieldCount,
    templateSections,
    templateLoading,
    templateError,
    sectionEditorDisabled,
    editingJson,
    saving,
    setEditingJson,
    setActiveSubtypeCode,
    replaceSection,
    handleSave,
    handleAddField,
    handleRemoveField,
  };

  async function persistSectionLayout(nextSections: LineOfBusinessPageTemplateSection[]) {
    if (!selectedPrimary) {
      return;
    }

    try {
      setLayoutSaving(true);
      setTemplateError(null);

      const baseDefinition = pageTemplate ?? {
        schemaVersion: 1,
        pageKey: 'insured-subjects',
        title: 'Insured Subjects',
        sections: nextSections,
      };

      const saved = await saveLineOfBusinessPageTemplate({
        definition: {
          ...baseDefinition,
          sections: nextSections,
        },
        organizationId: user?.organizationId ?? null,
        lineOfBusinessCode: selectedPrimary.code,
        lineOfBusinessSubTypeCode: selectedSubtype?.code ?? '',
      });

      setPageTemplate(saved);
      setTemplateSections(normalizeTemplateSections(saved.sections ?? []));
      setEditingJson(JSON.stringify(saved, null, 2));
    } catch (error) {
      setTemplateError(error instanceof Error ? error.message : 'Failed to persist section layout');
    } finally {
      setLayoutSaving(false);
    }
  }

  function replaceSection(nextSection: LineOfBusinessPageTemplateSection) {
    let nextSectionsSnapshot: LineOfBusinessPageTemplateSection[] = [];

    setTemplateSections((current) => {
      const nextSections = current.map((section) => (section.key === nextSection.key ? nextSection : section));
      nextSectionsSnapshot = nextSections;
      return nextSections;
    });

    if (nextSectionsSnapshot.length > 0) {
      void persistSectionLayout(nextSectionsSnapshot);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      const parsed = JSON.parse(editingJson) as LineOfBusinessPageTemplate;
      const saved = await saveLineOfBusinessPageTemplate({
        definition: parsed,
        organizationId: user?.organizationId ?? null,
        lineOfBusinessCode: selectedPrimary?.code ?? '',
        lineOfBusinessSubTypeCode: activeSubtypeCode ?? '',
      });

      setPageTemplate(saved);
      setTemplateSections(normalizeTemplateSections(saved.sections ?? []));
      setEditingJson(JSON.stringify(saved, null, 2));
      // minimal success feedback
      // eslint-disable-next-line no-alert
      alert('Template saved');
    } catch (err: any) {
      // eslint-disable-next-line no-alert
      alert('Save failed: ' + String(err?.message ?? err));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddField(section: LineOfBusinessPageTemplateSection) {
    const labelInput = window.prompt(`Add field to ${section.label}\nField label:`);
    const label = String(labelInput ?? '').trim();
    if (!label) {
      return;
    }

    const defaultKey = normalizeFieldKey(label);
    const keyInput = window.prompt('Field key:', defaultKey);
    const key = normalizeFieldKey(String(keyInput ?? defaultKey));
    if (!key) {
      // eslint-disable-next-line no-alert
      alert('Field key is required.');
      return;
    }

    const typeInput = window.prompt('Field type (text, number, select, textarea, date):', 'text');
    const type = String(typeInput ?? 'text').trim() || 'text';
    const required = window.confirm('Should this field be required?');

    try {
      setFieldMutationLoading(true);
      setTemplateError(null);
      const updatedTemplate = await addLineOfBusinessTemplateField({
        organizationId: user?.organizationId ?? null,
        lineOfBusinessCode: selectedPrimary?.code ?? '',
        lineOfBusinessSubTypeCode: selectedSubtype?.code ?? '',
        sectionKey: section.key,
        field: {
          key,
          label,
          type,
          required,
        },
      });

      setPageTemplate(updatedTemplate);
      setTemplateSections(normalizeTemplateSections(updatedTemplate.sections ?? []));
    } catch (error) {
      setTemplateError(error instanceof Error ? error.message : 'Failed to add field');
    } finally {
      setFieldMutationLoading(false);
    }
  }

  async function handleRemoveField(section: LineOfBusinessPageTemplateSection, field: LineOfBusinessPageTemplateField) {
    const confirmed = window.confirm(`Remove field '${field.label}' from ${section.label}?`);
    if (!confirmed) {
      return;
    }

    try {
      setFieldMutationLoading(true);
      setTemplateError(null);
      const updatedTemplate = await removeLineOfBusinessTemplateField({
        organizationId: user?.organizationId ?? null,
        lineOfBusinessCode: selectedPrimary?.code ?? '',
        lineOfBusinessSubTypeCode: selectedSubtype?.code ?? '',
        sectionKey: section.key,
        fieldKey: field.key,
      });

      setPageTemplate(updatedTemplate);
      setTemplateSections(normalizeTemplateSections(updatedTemplate.sections ?? []));
    } catch (error) {
      setTemplateError(error instanceof Error ? error.message : 'Failed to remove field');
    } finally {
      setFieldMutationLoading(false);
    }
  }

  return (
    <S.PageShell>
      <S.HeaderRow>
        <div>
          <S.PageTitle>Line of Business Templates</S.PageTitle>
          <S.PageSubtitle>
            Primary lines expand into subtype children so the insured subject builder can inherit a dynamic field template from a single source of truth.
          </S.PageSubtitle>
        </div>

        <PageActions>
          <AccentStatusBadge>
            <AccentStatusText>
              {loading ? 'Loading backend values' : `${primaryTypes.length} primary lines`}
            </AccentStatusText>
          </AccentStatusBadge>
          <ActionLink to="/insurer/coverage/create">Open Coverage Builder</ActionLink>
        </PageActions>
      </S.HeaderRow>

      <StatGrid>
        <StatCard
          label="Primary Lines"
          value={loading ? '…' : String(primaryTypes.length)}
          note="Top-level classes available for insured subject templates."
        />
        <StatCard
          label="Subtype Nodes"
          value={loading ? '…' : String(totalSubTypes)}
          note="Child templates that inherit the selected primary line."
        />
        <StatCard
          label="Field Slots"
          value={loading ? '…' : String(templateFieldCount)}
          note="Template fields loaded from the backend insured-subject definition."
        />
        <StatCard
          label="Active Template"
          value={activeTemplateScopeLabel}
          note={
            selectedPrimary
              ? selectedSubtype
                ? 'Subtype-specific template loaded. Open the popup to edit the fields.'
                : 'Parent template loaded. Open the popup to edit the baseline fields.'
              : 'Select a primary line to inspect its popup template branch.'
          }
        />
      </StatGrid>

      <ContentStack>
        <WideColumn>
          <S.Section>
            <S.SectionHeader>
              <S.SectionTitle>Taxonomy Table</S.SectionTitle>
              <S.SectionRule />
            </S.SectionHeader>

            <IntroText>
              Click a primary line to reveal its subtype children. Those children are the branch nodes the insured subject builder can use when shaping template fields.
            </IntroText>

            <TableCard>
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <th>Line of Business</th>
                      <th>Code</th>
                      <th>Status</th>
                      <th>Template Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5}>
                          <EmptyState>Loading line of business taxonomy…</EmptyState>
                        </td>
                      </tr>
                    ) : primaryTypes.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <EmptyState>There is no line of business taxonomy available yet.</EmptyState>
                        </td>
                      </tr>
                    ) : (
                      primaryTypes.map((primary) => {
                        const expanded = activePrimaryCode === primary.code;

                        return (
                          <React.Fragment key={primary.code}>
                            <tr data-kind="primary" data-active={expanded ? 'true' : 'false'}>
                              <td>
                                <RowButton
                                  type="button"
                                  aria-expanded={expanded}
                                  onClick={() => {
                                    setActivePrimaryCode(primary.code);
                                    setActiveSubtypeCode(null);
                                  }}
                                >
                                  <Chevron $expanded={expanded}>▸</Chevron>
                                  <div>
                                    <RowTitle>{primary.label}</RowTitle>
                                    <RowMeta>{formatSubtypeCount(primary.subTypes.length)} available</RowMeta>
                                  </div>
                                </RowButton>
                              </td>
                              <td>
                                <CodePill>{primary.code}</CodePill>
                              </td>
                              <td>
                                <TemplatePill>{expanded ? 'Active' : 'Available'}</TemplatePill>
                              </td>
                              <td>
                                <RowMeta>Parent template for insured subject construction</RowMeta>
                              </td>
                              <td>
                                <TemplateActionButton
                                  type="button"
                                  aria-label={`Edit ${primary.label} template`}
                                  onClick={() => openTemplatePopup(primary, null)}
                                >
                                  Edit
                                </TemplateActionButton>
                              </td>
                            </tr>

                            {expanded &&
                              primary.subTypes.map((subType) => {
                                const isSelected = activeSubtypeCode === subType.code;

                                return (
                                  <tr key={subType.code} data-kind="subtype">
                                    <td>
                                      <ChildCell>
                                        <RowButton type="button" onClick={() => setActiveSubtypeCode(subType.code)}>
                                          <ChildDot aria-hidden="true" />
                                          <div>
                                            <RowTitle>{subType.label}{isSelected ? ' — Selected' : ''}</RowTitle>
                                            <RowMeta>Subtype template inherits the parent field blueprint</RowMeta>
                                          </div>
                                        </RowButton>
                                      </ChildCell>
                                    </td>
                                    <td>
                                      <CodePill>{subType.code}</CodePill>
                                    </td>
                                    <td>
                                      <TemplatePill>Child template</TemplatePill>
                                    </td>
                                    <td>
                                      <RowMeta>Use the base subject fields plus subtype overrides.</RowMeta>
                                    </td>
                                    <td>
                                      <TemplateActionButton
                                        type="button"
                                        aria-label={`Edit ${subType.label} template`}
                                        onClick={() => openTemplatePopup(primary, subType)}
                                      >
                                        Edit
                                      </TemplateActionButton>
                                    </td>
                                  </tr>
                                );
                              })}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              </TableWrap>
            </TableCard>
          </S.Section>
        </WideColumn>
        <Outlet context={outletContext} />
      </ContentStack>
    </S.PageShell>
  );
}

export function LineOfBusinessActiveTemplatePage() {
  const navigate = useNavigate();
  const {
    selectedPrimary,
    selectedSubtype,
    setActiveSubtypeCode,
    activeTemplateScopeLabel,
    primaryTypeCount,
    totalSubTypes,
    templateFieldCount,
    templateLoading,
    templateError,
    templateSections,
    sectionEditorDisabled,
    editingJson,
    saving,
    setEditingJson,
    replaceSection,
    handleSave,
    handleAddField,
    handleRemoveField,
  } = useOutletContext<LineOfBusinessPageOutletContext>();

  const templateSegments = useMemo(() => {
    if (!selectedPrimary) {
      return [];
    }

    return [
      { label: 'Parent', code: null as string | null },
      ...selectedPrimary.subTypes.map((subType) => ({ label: subType.label, code: subType.code })),
    ];
  }, [selectedPrimary]);

  const activeSegmentIndex = useMemo(() => {
    if (!selectedPrimary) {
      return 0;
    }

    if (!selectedSubtype) {
      return 0;
    }

    const matchingIndex = templateSegments.findIndex((segment) => segment.code === selectedSubtype.code);
    return matchingIndex >= 0 ? matchingIndex : 0;
  }, [selectedPrimary, selectedSubtype, templateSegments]);

  function handleTemplateSegmentChange(nextIndex: number) {
    if (!selectedPrimary) {
      return;
    }

    setActiveSubtypeCode(templateSegments[nextIndex]?.code ?? null);
  }

  return (
    <Modal
      open
      title="Active Template"
      onClose={() => navigate(lineOfBusinessRoutePaths.base, { replace: true })}
      width="min(1160px, 96%)"
      footer={<></>}
    >
      <S.HeaderRow>
        <div>
          <S.PageTitle>Active Template</S.PageTitle>
          <S.PageSubtitle>Popup workspace for the currently selected line-of-business template scope.</S.PageSubtitle>
        </div>

        <PageActions>
          <AccentStatusBadge>
            <AccentStatusText>{templateLoading ? 'Loading template' : activeTemplateScopeLabel}</AccentStatusText>
          </AccentStatusBadge>
          <ActionLink to={lineOfBusinessRoutePaths.base}>Back to Line of Business</ActionLink>
        </PageActions>
      </S.HeaderRow>

      <S.SummaryCard>
        <S.SummaryInner>
          <SummaryLabel>Template Scope</SummaryLabel>
          <SummaryHeadline>
            {activeTemplateScopeLabel === 'None' ? 'No line selected' : activeTemplateScopeLabel}
          </SummaryHeadline>
          {templateSegments.length > 1 && (
            <SegmentBlock>
              <SegmentLabel>Template Segment</SegmentLabel>
              <SegmentedSwitch
                options={templateSegments.map((segment) => segment.label)}
                value={activeSegmentIndex}
                onChange={handleTemplateSegmentChange}
              />
            </SegmentBlock>
          )}
          <SummaryDescription>
            {selectedPrimary
              ? selectedSubtype
                ? 'You are editing a subtype-specific override. Changes only affect this selected property subtype.'
                : 'You are editing the parent template. This acts as the baseline for all subtype branches.'
              : 'Select a primary line to inspect its template branch.'}
          </SummaryDescription>
          {selectedPrimary && (
            <ChipRow>
              <Chip>{selectedPrimary.code}</Chip>
              {selectedSubtype ? <Chip>{selectedSubtype.code}</Chip> : <Chip>parent-template</Chip>}
              <Chip>{formatSubtypeCount(selectedPrimary.subTypes.length)}</Chip>
            </ChipRow>
          )}
        </S.SummaryInner>
        <SummaryPad>
          <StatGridCompact>
            <StatCard
              label="Primary Lines"
              value={String(primaryTypeCount)}
              note="Top-level classes available for the subject template."
            />
            <StatCard
              label="Subtype Nodes"
              value={String(totalSubTypes)}
              note="Child templates that inherit the selected primary line."
            />
            <StatCard
              label="Field Slots"
              value={String(templateFieldCount)}
              note="Template fields loaded from the backend insured-subject definition."
            />
          </StatGridCompact>
        </SummaryPad>
      </S.SummaryCard>

      <S.SummaryCard>
        <S.SummaryInner>
          <SummaryHeadingBlock>
            Backend Insured Subject Template
          </SummaryHeadingBlock>
          {templateLoading ? (
            <EmptyState>Loading insured subject template definition from the backend…</EmptyState>
          ) : templateError ? (
            <EmptyState>{templateError}</EmptyState>
          ) : templateSections.length === 0 ? (
            <EmptyState>No template fields are available for the selected scope.</EmptyState>
          ) : (
            <BlueprintList>
              {templateSections.map((section) => (
                <LineOfBusinessSectionGrid
                  key={section.key}
                  section={section}
                  primaryTypeCount={primaryTypeCount}
                  totalSubTypes={totalSubTypes}
                  disabled={sectionEditorDisabled}
                  onAddField={(targetSection) => void handleAddField(targetSection)}
                  onRemoveField={(targetSection, field) => void handleRemoveField(targetSection, field)}
                  onSectionChange={replaceSection}
                />
              ))}
            </BlueprintList>
          )}

        </S.SummaryInner>
      </S.SummaryCard>

      <S.SummaryCard>
        <S.SummaryInner>
          <SummaryLabel>Template Assembly</SummaryLabel>
          <SummaryHeadline>How the subject template is built</SummaryHeadline>
        </S.SummaryInner>
        <SummaryPad>
          <BlueprintOrder>
            <li>Select the parent line of business.</li>
            <li>Open the active child subtype branch.</li>
            <li>Map the base fields into the insured subject schema.</li>
            <li>Layer subtype-specific overrides before creating coverage.</li>
          </BlueprintOrder>

          {selectedPrimary && selectedPrimary.subTypes.length > 0 && (
            <ChipRow>
              {selectedPrimary.subTypes.slice(0, 4).map((subType) => (
                <Chip key={subType.code}>{subType.label}</Chip>
              ))}
            </ChipRow>
          )}
        </SummaryPad>
      </S.SummaryCard>
    </Modal>
  );
}