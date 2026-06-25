import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, DragEvent, SetStateAction } from 'react';
import type { ConnectedGridSettings } from '../../xds/components/ConnectedGrid';
import { resolveSectionGridLayout, serializeTemplateDefaultValue } from './InsurerDashboard.utils';
import type {
  LineOfBusinessPageTemplateField,
  LineOfBusinessPageTemplateFieldLayout,
  LineOfBusinessPageTemplateSection,
  LineOfBusinessPageTemplateSectionLayout,
} from './lineOfBusinessTaxonomy';
import type { LineOfBusinessSectionGridViewMode } from './LineOfBusinessSectionGrid.parts';

export type UseLineOfBusinessSectionGridOptions = {
  section: LineOfBusinessPageTemplateSection;
  disabled?: boolean;
  displayMode?: 'toggle' | 'builder' | 'rendered';
  onAddField?: (section: LineOfBusinessPageTemplateSection) => void;
  onSectionChange?: (nextSection: LineOfBusinessPageTemplateSection) => void;
  renderedFieldValues?: Record<string, string>;
  onRenderedFieldValueChange?: (fieldKey: string, value: string) => void;
};

export type UseLineOfBusinessSectionGridResult = {
  activeViewMode: LineOfBusinessSectionGridViewMode;
  availableCount: number;
  canToggleViews: boolean;
  clearFieldPlacement: (fieldKey: string) => void;
  getCellDropHandler: (cellKey: string) => (event: DragEvent<HTMLDivElement>) => void;
  getFieldSummary: (field: LineOfBusinessPageTemplateField) => string;
  gridLabel: string;
  gridSettings: ConnectedGridSettings;
  handleAddField?: () => void;
  handleGridCellDragOver: (event: DragEvent<HTMLDivElement>) => void;
  handleGridSettingsChange: (nextSettings: ConnectedGridSettings) => void;
  handleRenderedFieldValueChange: (fieldKey: string) => (nextValue: string) => void;
  placedCount: number;
  placedFieldKeys: Set<string>;
  placedFieldsByCell: Map<string, LineOfBusinessPageTemplateField>;
  renderedFields: LineOfBusinessPageTemplateField[];
  renderedGridTemplateColumns: string;
  renderedGridTemplateRows: string;
  resolvedRenderedFieldValues: Record<string, string>;
  resolvedSectionLayout: LineOfBusinessPageTemplateSectionLayout;
  setViewMode: Dispatch<SetStateAction<LineOfBusinessSectionGridViewMode>>;
  showBuilderChrome: boolean;
  startDrag: (event: DragEvent<HTMLDivElement>, fieldKey: string) => void;
  unplacedFields: LineOfBusinessPageTemplateField[];
};

type DragPayload = {
  fieldKey: string;
};

function parseCellKey(cellKey: string): { row: number; column: number } {
  const [rowText, columnText] = cellKey.split(':');
  return {
    row: Number.parseInt(rowText ?? '0', 10),
    column: Number.parseInt(columnText ?? '0', 10),
  };
}

function formatCellKey(row: number, column: number): string {
  return `${row}:${column}`;
}

function getFieldCellKey(field: LineOfBusinessPageTemplateField): string | null {
  const layout = field.layout;
  const columnStart = layout?.columnStart && layout.columnStart > 0 ? layout.columnStart : null;
  const rowStart = layout?.rowStart && layout.rowStart > 0 ? layout.rowStart : null;

  if (!columnStart || !rowStart) {
    return null;
  }

  return formatCellKey(rowStart, columnStart);
}

function getExplicitGridBounds(fields: LineOfBusinessPageTemplateField[]): { columnEnd: number; rowEnd: number } {
  return fields.reduce(
    (bounds, field) => {
      const layout = field.layout;
      if (!layout) {
        return bounds;
      }

      const columnStart = layout.columnStart && layout.columnStart > 0 ? layout.columnStart : 1;
      const columnSpan = layout.columnSpan && layout.columnSpan > 0 ? layout.columnSpan : 1;
      const rowStart = layout.rowStart && layout.rowStart > 0 ? layout.rowStart : 1;
      const rowSpan = layout.rowSpan && layout.rowSpan > 0 ? layout.rowSpan : 1;

      return {
        columnEnd: Math.max(bounds.columnEnd, columnStart + columnSpan - 1),
        rowEnd: Math.max(bounds.rowEnd, rowStart + rowSpan - 1),
      };
    },
    { columnEnd: 1, rowEnd: 1 },
  );
}

function resolveGridSettings(section: LineOfBusinessPageTemplateSection): ConnectedGridSettings {
  const layout = section.layout;
  const fieldCount = section.fields.length;
  const fallbackColumns = fieldCount >= 6 ? 3 : fieldCount >= 3 ? 2 : 1;
  const explicitBounds = getExplicitGridBounds(section.fields);
  const configuredColumns = layout?.columns && layout.columns > 0 ? layout.columns : fallbackColumns;
  const columnCount = Math.max(configuredColumns, layout?.columnWidths?.length ?? 0, explicitBounds.columnEnd);
  const rowCount = Math.max(layout?.rowHeights?.length ?? 0, explicitBounds.rowEnd, Math.max(2, Math.ceil(fieldCount / Math.max(1, columnCount))));

  return {
    columns: columnCount,
    rows: rowCount,
  };
}

function buildSectionLayout(previousLayout: LineOfBusinessPageTemplateSectionLayout | undefined, settings: ConnectedGridSettings): LineOfBusinessPageTemplateSectionLayout {
  return {
    type: 'grid',
    columns: settings.columns,
    gap: previousLayout?.gap && previousLayout.gap > 0 ? previousLayout.gap : 12,
    dense: Boolean(previousLayout?.dense),
    columnWidths: Array.from({ length: settings.columns }, (_, index) => {
      const candidate = previousLayout?.columnWidths?.[index];
      return typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0 ? candidate : 1;
    }),
    rowHeights: Array.from({ length: settings.rows }, (_, index) => {
      const candidate = previousLayout?.rowHeights?.[index];
      return typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0 ? candidate : 120;
    }),
  };
}

function updateFieldLayout(field: LineOfBusinessPageTemplateField, layout: LineOfBusinessPageTemplateFieldLayout | undefined): LineOfBusinessPageTemplateField {
  if (!layout) {
    const { layout: _layout, ...rest } = field;
    return rest;
  }

  return {
    ...field,
    layout,
  };
}

function isFieldPlacedOnGrid(field: LineOfBusinessPageTemplateField, settings: ConnectedGridSettings): boolean {
  const cellKey = getFieldCellKey(field);
  if (!cellKey) {
    return false;
  }

  const { row, column } = parseCellKey(cellKey);
  return row >= 1 && row <= settings.rows && column >= 1 && column <= settings.columns;
}

export function useLineOfBusinessSectionGrid({
  section,
  disabled = false,
  displayMode = 'toggle',
  onAddField,
  onSectionChange,
  renderedFieldValues,
  onRenderedFieldValueChange,
}: UseLineOfBusinessSectionGridOptions): UseLineOfBusinessSectionGridResult {
  const gridSettings = useMemo(() => resolveGridSettings(section), [section]);

  const placedFieldsByCell = useMemo(() => {
    const assigned = new Map<string, LineOfBusinessPageTemplateField>();

    section.fields.forEach((field) => {
      if (!isFieldPlacedOnGrid(field, gridSettings)) {
        return;
      }

      const cellKey = getFieldCellKey(field);
      if (!cellKey) {
        return;
      }

      assigned.set(cellKey, field);
    });

    return assigned;
  }, [gridSettings, section.fields]);

  const placedFieldKeys = useMemo(() => {
    return new Set(Array.from(placedFieldsByCell.values()).map((field) => field.key));
  }, [placedFieldsByCell]);

  const unplacedFields = useMemo(() => {
    return section.fields.filter((field) => !placedFieldKeys.has(field.key));
  }, [placedFieldKeys, section.fields]);

  const placedCount = placedFieldsByCell.size;
  const availableCount = section.fields.length - placedCount;
  const gridLabel = `${section.label} Slots`;
  const [viewMode, setViewMode] = useState<LineOfBusinessSectionGridViewMode>('builder');
  const [previewFieldValues, setPreviewFieldValues] = useState<Record<string, string>>({});
  const canToggleViews = displayMode === 'toggle';
  const activeViewMode: LineOfBusinessSectionGridViewMode = canToggleViews
    ? viewMode
    : displayMode === 'rendered'
      ? 'rendered'
      : 'builder';
  const showBuilderChrome = displayMode !== 'rendered';

  useEffect(() => {
    setPreviewFieldValues((current) => {
      const next: Record<string, string> = {};

      section.fields.forEach((field) => {
        const existingValue = current[field.key];
        next[field.key] = typeof existingValue === 'string' ? existingValue : serializeTemplateDefaultValue(field.defaultValue);
      });

      return next;
    });
  }, [section.fields]);

  const renderedFields = useMemo(() => {
    let visibleFields: LineOfBusinessPageTemplateField[];
    if (activeViewMode !== 'rendered') {
      visibleFields = section.fields;
    } else {
      const placedOnly = section.fields.filter((field) => placedFieldKeys.has(field.key));
      // In rendered mode the builder-placed fields drive the layout. But when NONE
      // are placed — a pipeline/LLM-generated or seeded template that never went
      // through the grid builder — a pure consumer view (`displayMode='rendered'`,
      // e.g. the insured-subject form) has no way to place them, so fall back to
      // every field in order. They auto-flow into the section grid instead of the
      // form being a dead end. The builder's toggle preview keeps the original
      // "place fields" affordance (shows only placed fields).
      visibleFields = placedOnly.length > 0 || displayMode !== 'rendered' ? placedOnly : section.fields;
    }

    return [...visibleFields].sort((left, right) => left.order - right.order);
  }, [activeViewMode, displayMode, placedFieldKeys, section.fields]);

  const resolvedSectionLayout = useMemo(() => {
    return resolveSectionGridLayout(section);
  }, [section]);

  const renderedGridTemplateColumns = useMemo(() => {
    return resolvedSectionLayout.columnWidths?.map((weight) => `minmax(0, ${weight}fr)`).join(' ') || `repeat(${gridSettings.columns}, minmax(0, 1fr))`;
  }, [gridSettings.columns, resolvedSectionLayout.columnWidths]);

  const renderedGridTemplateRows = useMemo(() => {
    return resolvedSectionLayout.rowHeights?.map((height) => `minmax(${height}px, auto)`).join(' ') || `repeat(${gridSettings.rows}, minmax(120px, auto))`;
  }, [gridSettings.rows, resolvedSectionLayout.rowHeights]);

  const resolvedRenderedFieldValues = useMemo(() => {
    const next: Record<string, string> = {};

    section.fields.forEach((field) => {
      next[field.key] =
        renderedFieldValues?.[field.key] ??
        previewFieldValues[field.key] ??
        serializeTemplateDefaultValue(field.defaultValue);
    });

    return next;
  }, [previewFieldValues, renderedFieldValues, section.fields]);

  const getFieldSummary = useCallback((field: LineOfBusinessPageTemplateField) => {
    if (field.helperText) {
      return field.helperText;
    }

    if (field.placeholder) {
      return field.placeholder;
    }

    if (field.dataSource) {
      return field.dataSource;
    }

    return 'Drag into a slot';
  }, []);

  const handleAddField = useMemo(() => {
    if (!onAddField) {
      return undefined;
    }

    return () => onAddField(section);
  }, [onAddField, section]);

  const commitSectionChange = useCallback(
    (nextFields: LineOfBusinessPageTemplateField[], nextSettings = gridSettings) => {
      if (!onSectionChange) {
        return;
      }

      onSectionChange({
        ...section,
        layout: buildSectionLayout(section.layout, nextSettings),
        fields: [...nextFields].sort((left, right) => left.order - right.order),
      });
    },
    [gridSettings, onSectionChange, section],
  );

  const handleGridSettingsChange = useCallback(
    (nextSettings: ConnectedGridSettings) => {
      if (!onSectionChange) {
        return;
      }

      const nextFields = section.fields.map((field) => {
        const cellKey = getFieldCellKey(field);
        if (!cellKey) {
          return field;
        }

        const { row, column } = parseCellKey(cellKey);
        if (row > nextSettings.rows || column > nextSettings.columns) {
          return updateFieldLayout(field, undefined);
        }

        return field;
      });

      commitSectionChange(nextFields, nextSettings);
    },
    [commitSectionChange, onSectionChange, section.fields],
  );

  const placeFieldInCell = useCallback(
    (fieldKey: string, cellKey: string) => {
      if (!onSectionChange) {
        return;
      }

      const { row, column } = parseCellKey(cellKey);
      const nextFields = section.fields.map((field) => {
        const currentCellKey = getFieldCellKey(field);

        if (field.key === fieldKey) {
          return updateFieldLayout(field, {
            ...(field.layout ?? {}),
            columnStart: column,
            rowStart: row,
            columnSpan: 1,
            rowSpan: 1,
          });
        }

        if (currentCellKey === cellKey) {
          return updateFieldLayout(field, undefined);
        }

        return field;
      });

      commitSectionChange(nextFields);
    },
    [commitSectionChange, onSectionChange, section.fields],
  );

  const clearFieldPlacement = useCallback(
    (fieldKey: string) => {
      if (!onSectionChange) {
        return;
      }

      const nextFields = section.fields.map((field) => (field.key === fieldKey ? updateFieldLayout(field, undefined) : field));
      commitSectionChange(nextFields);
    },
    [commitSectionChange, onSectionChange, section.fields],
  );

  const startDrag = useCallback(
    (event: DragEvent<HTMLDivElement>, fieldKey: string) => {
      if (disabled || !onSectionChange) {
        return;
      }

      const payload: DragPayload = { fieldKey };
      event.dataTransfer.setData('application/json', JSON.stringify(payload));
      event.dataTransfer.effectAllowed = 'move';
    },
    [disabled, onSectionChange],
  );

  const handleGridCellDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const getCellDropHandler = useCallback(
    (cellKey: string) => {
      return (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();

        if (!onSectionChange) {
          return;
        }

        const raw = event.dataTransfer.getData('application/json');
        if (!raw) {
          return;
        }

        try {
          const payload = JSON.parse(raw) as DragPayload;
          if (!payload.fieldKey) {
            return;
          }

          placeFieldInCell(payload.fieldKey, cellKey);
        } catch {
          return;
        }
      };
    },
    [onSectionChange, placeFieldInCell],
  );

  const handleRenderedFieldValueChange = useCallback(
    (fieldKey: string) => {
      return (nextValue: string) => {
        onRenderedFieldValueChange?.(fieldKey, nextValue);
        setPreviewFieldValues((current) => ({
          ...current,
          [fieldKey]: nextValue,
        }));
      };
    },
    [onRenderedFieldValueChange],
  );

  return {
    activeViewMode,
    availableCount,
    canToggleViews,
    clearFieldPlacement,
    getCellDropHandler,
    getFieldSummary,
    gridLabel,
    gridSettings,
    handleAddField,
    handleGridCellDragOver,
    handleGridSettingsChange,
    handleRenderedFieldValueChange,
    placedCount,
    placedFieldKeys,
    placedFieldsByCell,
    renderedFields,
    renderedGridTemplateColumns,
    renderedGridTemplateRows,
    resolvedRenderedFieldValues,
    resolvedSectionLayout,
    setViewMode,
    showBuilderChrome,
    startDrag,
    unplacedFields,
  };
}