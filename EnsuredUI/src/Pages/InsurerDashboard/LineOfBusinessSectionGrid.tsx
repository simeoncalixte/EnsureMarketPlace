import React from 'react';
import styled from 'styled-components';
import ConnectedGrid from '../../xds/components/ConnectedGrid';
import { colors } from '../../xds/colors';
import {
  LineOfBusinessBuilderFieldPool,
  LineOfBusinessGridCell,
  LineOfBusinessRenderedField,
  LineOfBusinessSectionFooter,
  LineOfBusinessSectionHeader,
  LineOfBusinessSectionViewControls,
} from './LineOfBusinessSectionGrid.parts';
import { useLineOfBusinessSectionGrid } from './useLineOfBusinessSectionGrid';
import {
  type LineOfBusinessPageTemplateField,
  type LineOfBusinessPageTemplateSection,
} from './lineOfBusinessTaxonomy';

export type LineOfBusinessSectionGridProps = {
  section: LineOfBusinessPageTemplateSection;
  primaryTypeCount: number;
  totalSubTypes: number;
  disabled?: boolean;
  displayMode?: 'toggle' | 'builder' | 'rendered';
  onAddField?: (section: LineOfBusinessPageTemplateSection) => void;
  onRemoveField?: (section: LineOfBusinessPageTemplateSection, field: LineOfBusinessPageTemplateField) => void;
  onSectionChange?: (nextSection: LineOfBusinessPageTemplateSection) => void;
  renderedFieldValues?: Record<string, string>;
  onRenderedFieldValueChange?: (fieldKey: string, value: string) => void;
  showHeader?: boolean;
  showModeDescription?: boolean;
};

type DragPayload = {
  fieldKey: string;
};

const SectionCard = styled.article`
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid ${colors.outlineVariant};
  background: ${colors.surfaceContainer};
`;

const RenderedGridRoot = styled.div<{ $gap: number; $columns: string; $rows: string; $dense: boolean }>`
  display: grid;
  gap: ${({ $gap }) => `${$gap}px`};
  grid-template-columns: ${({ $columns }) => $columns};
  grid-template-rows: ${({ $rows }) => $rows};
  grid-auto-flow: ${({ $dense }) => ($dense ? 'row dense' : 'row')};
  align-items: stretch;
`;

const RenderedGridEmptyState = styled.div`
  color: ${colors.onSurfaceVariant};
  font-size: 12px;
`;

export default function LineOfBusinessSectionGrid({
  section,
  primaryTypeCount,
  totalSubTypes,
  disabled = false,
  displayMode = 'toggle',
  onAddField,
  onRemoveField,
  onSectionChange,
  renderedFieldValues,
  onRenderedFieldValueChange,
  showHeader = true,
  showModeDescription = true,
}: LineOfBusinessSectionGridProps) {
  const {
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
  } = useLineOfBusinessSectionGrid({
    section,
    disabled,
    displayMode,
    onAddField,
    onSectionChange,
    renderedFieldValues,
    onRenderedFieldValueChange,
  });

  return (
    <SectionCard>
      {showHeader ? (
        <LineOfBusinessSectionHeader
          sectionLabel={section.label}
          sectionDescription={section.description}
          showBuilderChrome={showBuilderChrome}
          gridColumns={gridSettings.columns}
          gridRows={gridSettings.rows}
          placedCount={placedCount}
          availableCount={availableCount}
          disabled={disabled || !onSectionChange}
          onAddField={handleAddField}
        />
      ) : null}

      {showModeDescription || canToggleViews ? (
        <LineOfBusinessSectionViewControls
          activeViewMode={activeViewMode}
          canToggleViews={canToggleViews}
          showModeDescription={showModeDescription}
          onViewModeChange={setViewMode}
        />
      ) : null}

      {activeViewMode === 'builder' ? (
        <>
          <LineOfBusinessBuilderFieldPool
            fields={unplacedFields}
            disabled={disabled}
            getFieldSummary={getFieldSummary}
            onDragStart={startDrag}
          />

          <ConnectedGrid
            title={gridLabel}
            settings={gridSettings}
            onSettingsChange={handleGridSettingsChange}
            renderCell={({ cellKey }) => {
              const placedField = placedFieldsByCell.get(cellKey);

              return (
                <LineOfBusinessGridCell
                  key={cellKey}
                  cellKey={cellKey}
                  field={placedField}
                  disabled={disabled}
                  getFieldSummary={getFieldSummary}
                  onDragStart={startDrag}
                  onDragOver={handleGridCellDragOver}
                  onDrop={getCellDropHandler(cellKey)}
                  onRemoveField={clearFieldPlacement}
                />
              );
            }}
          />
        </>
      ) : (
        <RenderedGridRoot
          $gap={resolvedSectionLayout.gap ?? 12}
          $columns={renderedGridTemplateColumns}
          $rows={renderedGridTemplateRows}
          $dense={Boolean(resolvedSectionLayout.dense)}
        >
          {renderedFields.length === 0 ? (
            <RenderedGridEmptyState>No placed fields to preview. Switch to Builder View to place fields.</RenderedGridEmptyState>
          ) : (
            renderedFields.map((field) => (
              <LineOfBusinessRenderedField
                key={field.key}
                field={field}
                value={resolvedRenderedFieldValues[field.key]}
                placement={field.layout}
                onChange={handleRenderedFieldValueChange(field.key)}
              />
            ))
          )}
        </RenderedGridRoot>
      )}

      {showBuilderChrome ? (
        <LineOfBusinessSectionFooter
          primaryTypeCount={primaryTypeCount}
          totalSubTypes={totalSubTypes}
          layoutType={section.layout?.type}
          gap={section.layout?.gap}
          dense={section.layout?.dense}
        />
      ) : null}
    </SectionCard>
  );
}
