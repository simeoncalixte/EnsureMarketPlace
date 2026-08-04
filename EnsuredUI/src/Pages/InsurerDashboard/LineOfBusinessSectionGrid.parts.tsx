import React from 'react';
import styled, { css } from 'styled-components';
import Badge from '../../xds/components/Badge';
import Button from '../../xds/components/Button';
import SegmentedSwitch from '../../xds/components/SegmentedSwitch';
import { colors, withAlpha } from '../../xds/colors';
import DynamicField, { type DynamicFieldProps } from './sections/DynamicField';
import type {
  LineOfBusinessPageTemplateField,
  LineOfBusinessPageTemplateFieldLayout,
} from './lineOfBusinessTaxonomy';

export type LineOfBusinessSectionGridViewMode = 'builder' | 'rendered';

export type LineOfBusinessFieldSummaryGetter = (field: LineOfBusinessPageTemplateField) => string;

type LineOfBusinessFieldCardProps = {
  field: LineOfBusinessPageTemplateField;
  summary: string;
  draggable?: boolean;
  disabled?: boolean;
  cardWidth?: 'pool' | 'slot';
  background?: string;
  onDragStart?: React.DragEventHandler<HTMLDivElement>;
  footer?: React.ReactNode;
};

type LineOfBusinessGridCellProps = {
  cellKey: string;
  field?: LineOfBusinessPageTemplateField;
  disabled?: boolean;
  getFieldSummary: LineOfBusinessFieldSummaryGetter;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, fieldKey: string) => void;
  onDragOver: React.DragEventHandler<HTMLDivElement>;
  onDrop: React.DragEventHandler<HTMLDivElement>;
  onRemoveField: (fieldKey: string) => void;
};

type LineOfBusinessBuilderFieldPoolProps = {
  fields: LineOfBusinessPageTemplateField[];
  disabled?: boolean;
  getFieldSummary: LineOfBusinessFieldSummaryGetter;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, fieldKey: string) => void;
};

type LineOfBusinessRenderedFieldProps = {
  field: LineOfBusinessPageTemplateField;
  value: string;
  placement?: LineOfBusinessPageTemplateFieldLayout;
  onChange: (nextValue: string) => void;
  organizationId?: number | null;
  sectionKey?: string;
  onRemoveField?: (sectionKey: string, field: LineOfBusinessPageTemplateField) => void;
};

type LineOfBusinessSectionHeaderProps = {
  sectionLabel: string;
  sectionDescription?: string;
  showBuilderChrome: boolean;
  gridColumns: number;
  gridRows: number;
  placedCount: number;
  availableCount: number;
  disabled?: boolean;
  onAddField?: () => void;
};

type LineOfBusinessSectionViewControlsProps = {
  activeViewMode: LineOfBusinessSectionGridViewMode;
  canToggleViews: boolean;
  showModeDescription: boolean;
  onViewModeChange: (nextMode: LineOfBusinessSectionGridViewMode) => void;
};

type LineOfBusinessSectionFooterProps = {
  primaryTypeCount: number;
  totalSubTypes: number;
  layoutType?: string;
  gap?: number;
  dense?: boolean;
};

const FieldCardFrame = styled.div<{
  $cardWidth?: 'pool' | 'slot';
  $background?: string;
  $disabled?: boolean;
  $draggable?: boolean;
}>`
  width: 100%;
  display: grid;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid ${colors.outlineVariant};
  background: ${({ $background }) => $background ?? colors.surfaceContainerLow};
  color: ${colors.text.primary};
  text-align: left;
  min-width: ${({ $cardWidth }) => ($cardWidth === 'pool' ? '180px' : '0')};
  max-width: ${({ $cardWidth }) => ($cardWidth === 'pool' ? '280px' : 'none')};
  opacity: ${({ $disabled, $cardWidth }) =>
    $disabled ? ($cardWidth === 'pool' ? 0.7 : 0.75) : 1};
  cursor: ${({ $draggable, $disabled }) =>
    $draggable ? ($disabled ? 'not-allowed' : 'grab') : 'default'};
`;

const FieldCardTopRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
`;

const FieldCardLabelColumn = styled.div`
  min-width: 0;
`;

const FieldCardTitle = styled.div`
  font-size: 13px;
  font-weight: 800;
  color: ${colors.text.primary};
`;

const FieldCardSummary = styled.div`
  font-size: 11px;
  color: ${colors.onSurfaceVariant};
  margin-top: 2px;
  line-height: 1.4;
`;

const FieldBadgesRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const FieldFooterRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;

const SectionHeaderRoot = styled.header`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-start;
`;

const SectionHeaderInfo = styled.div`
  min-width: 0;
`;

const SectionHeaderTitle = styled.h3`
  margin: 6px 0 4px;
  font-size: 16px;
  color: ${colors.text.primary};
`;

const SectionHeaderDescription = styled.p`
  margin: 0;
  color: ${colors.onSurfaceVariant};
  font-size: 12px;
  line-height: 1.5;
`;

const SectionHeaderActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const SectionViewControlsRoot = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const SectionViewControlsDescription = styled.div`
  color: ${colors.onSurfaceVariant};
  font-size: 12px;
  line-height: 1.5;
`;

const BuilderFieldPoolRoot = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const GridCellShell = styled.div<{ $hasField: boolean }>`
  width: 100%;
  min-height: 88px;
  padding: 8px;
  border-radius: 10px;
  display: grid;
  gap: 8px;
  align-content: center;
  justify-items: stretch;
  background: ${({ $hasField }) => ($hasField ? withAlpha(colors.surfaceDeep, 0.72) : withAlpha(colors.neutral[400], 0.08))};
  border: 1px solid ${({ $hasField }) => ($hasField ? withAlpha(colors.primary, 0.2) : 'transparent')};
`;

const EmptySlot = styled.div`
  min-height: 68px;
  border-radius: 8px;
  border: 1px dashed ${colors.outlineVariant};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${colors.onSurfaceVariant};
  font-size: 11px;
  letter-spacing: 0.08px;
  text-transform: uppercase;
`;

const RenderedFieldRoot = styled.div<{ $layout?: LineOfBusinessPageTemplateFieldLayout }>`
  display: grid;
  gap: 4px;
  min-width: 0;

  ${({ $layout }) => {
    if (!$layout) {
      return '';
    }

    const placementRules: string[] = [];

    if ($layout.columnStart && $layout.columnSpan) {
      placementRules.push(`grid-column: ${$layout.columnStart} / span ${$layout.columnSpan};`);
    } else if ($layout.columnStart) {
      placementRules.push(`grid-column: ${$layout.columnStart};`);
    } else if ($layout.columnSpan) {
      placementRules.push(`grid-column: span ${$layout.columnSpan};`);
    }

    if ($layout.rowStart && $layout.rowSpan) {
      placementRules.push(`grid-row: ${$layout.rowStart} / span ${$layout.rowSpan};`);
    } else if ($layout.rowStart) {
      placementRules.push(`grid-row: ${$layout.rowStart};`);
    } else if ($layout.rowSpan) {
      placementRules.push(`grid-row: span ${$layout.rowSpan};`);
    }

    return css`
      ${placementRules.join('\n')}
    `;
  }}
`;

const SectionFooterRoot = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
`;

const SectionFooterText = styled.div`
  color: ${colors.onSurfaceVariant};
  font-size: 12px;
`;

const SectionFooterBadges = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

function renderFieldBadgeRow(field: LineOfBusinessPageTemplateField) {
  return (
    <FieldBadgesRow>
      <Badge variant="surface">{field.canonicalKey ?? field.key}</Badge>
      <Badge variant={field.required ? 'primary' : 'tertiary'}>{field.required ? 'Required' : 'Optional'}</Badge>
    </FieldBadgesRow>
  );
}

function LineOfBusinessFieldCard({
  field,
  summary,
  draggable = false,
  disabled = false,
  cardWidth = 'slot',
  background,
  onDragStart,
  footer,
}: LineOfBusinessFieldCardProps) {
  return (
    <FieldCardFrame
      draggable={draggable}
      onDragStart={onDragStart}
      $cardWidth={cardWidth}
      $background={background}
      $disabled={disabled}
      $draggable={draggable}
    >
      <FieldCardTopRow>
        <FieldCardLabelColumn>
          <FieldCardTitle>{field.label}</FieldCardTitle>
          <FieldCardSummary>{summary}</FieldCardSummary>
        </FieldCardLabelColumn>
        <Badge variant="surface">{field.type}</Badge>
      </FieldCardTopRow>

      {renderFieldBadgeRow(field)}

      {footer ? <FieldFooterRow>{footer}</FieldFooterRow> : null}
    </FieldCardFrame>
  );
}

export function LineOfBusinessSectionHeader({
  sectionLabel,
  sectionDescription,
  showBuilderChrome,
  gridColumns,
  gridRows,
  placedCount,
  availableCount,
  disabled = false,
  onAddField,
}: LineOfBusinessSectionHeaderProps) {
  return (
    <SectionHeaderRoot>
      <SectionHeaderInfo>
        {showBuilderChrome ? <Badge variant="primary">Section Builder</Badge> : null}
        <SectionHeaderTitle>{sectionLabel}</SectionHeaderTitle>
        {sectionDescription ? <SectionHeaderDescription>{sectionDescription}</SectionHeaderDescription> : null}
      </SectionHeaderInfo>

      {showBuilderChrome ? (
        <SectionHeaderActions>
          <Badge variant="surface">{gridColumns} col</Badge>
          <Badge variant="surface">{gridRows} row</Badge>
          <Badge variant="primary">{placedCount} placed</Badge>
          <Badge variant="tertiary">{availableCount} available</Badge>
          {onAddField ? (
            <Button variant="ghost" onClick={onAddField} disabled={disabled}>
              Add Field
            </Button>
          ) : null}
        </SectionHeaderActions>
      ) : null}
    </SectionHeaderRoot>
  );
}

export function LineOfBusinessSectionViewControls({
  activeViewMode,
  canToggleViews,
  showModeDescription,
  onViewModeChange,
}: LineOfBusinessSectionViewControlsProps) {
  return (
    <SectionViewControlsRoot>
      {showModeDescription ? (
        <SectionViewControlsDescription>
          {activeViewMode === 'builder'
            ? 'Drag fields into the grid slots. Each section keeps its own placement map so the form definition can be saved with the selected line of business.'
            : 'Rendered view shows the actual field components with no placement cards or grid guidelines.'}
        </SectionViewControlsDescription>
      ) : (
        <div aria-hidden="true" />
      )}

      {canToggleViews ? (
        <SegmentedSwitch
          options={['Builder View', 'Rendered View']}
          value={activeViewMode === 'rendered' ? 1 : 0}
          onChange={(index: number) => onViewModeChange(index === 1 ? 'rendered' : 'builder')}
        />
      ) : null}
    </SectionViewControlsRoot>
  );
}

export function LineOfBusinessBuilderFieldPool({
  fields,
  disabled = false,
  getFieldSummary,
  onDragStart,
}: LineOfBusinessBuilderFieldPoolProps) {
  if (fields.length === 0) {
    return <Badge variant="tertiary">All fields are placed in the grid.</Badge>;
  }

  return (
    <BuilderFieldPoolRoot>
      {fields.map((field) => (
        <LineOfBusinessFieldCard
          key={field.key}
          field={field}
          summary={getFieldSummary(field)}
          draggable={!disabled}
          disabled={disabled}
          cardWidth="pool"
          onDragStart={(event) => onDragStart(event, field.key)}
        />
      ))}
    </BuilderFieldPoolRoot>
  );
}

export function LineOfBusinessGridCell({
  cellKey,
  field,
  disabled = false,
  getFieldSummary,
  onDragStart,
  onDragOver,
  onDrop,
  onRemoveField,
}: LineOfBusinessGridCellProps) {
  return (
    <GridCellShell
      $hasField={Boolean(field)}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {field ? (
        <LineOfBusinessFieldCard
          field={field}
          summary={getFieldSummary(field)}
          draggable={!disabled}
          disabled={disabled}
          cardWidth="slot"
          background={colors.surfaceContainerHigh}
          onDragStart={(event) => onDragStart(event, field.key)}
          footer={
            <>
              <Badge variant="tertiary">Slot {cellKey}</Badge>
              <Button variant="ghost" onClick={() => onRemoveField(field.key)} disabled={disabled}>
                Remove
              </Button>
            </>
          }
        />
      ) : (
        <EmptySlot>Drop into slot {cellKey}</EmptySlot>
      )}
    </GridCellShell>
  );
}

export function LineOfBusinessRenderedField({
  field,
  value,
  placement,
  onChange,
  organizationId,
  sectionKey,
  onRemoveField,
}: LineOfBusinessRenderedFieldProps) {
  // The grid owns placement; DynamicField owns managed-select + the remove ×, so
  // subject cards share the exact rendering behavior as the create-coverage form.
  return (
    <RenderedFieldRoot $layout={placement}>
      <DynamicField
        field={field}
        value={value}
        onChange={onChange}
        organizationId={organizationId}
        sectionKey={sectionKey}
        onRemoveField={onRemoveField as DynamicFieldProps['onRemoveField']}
      />
    </RenderedFieldRoot>
  );
}

export function LineOfBusinessSectionFooter({
  primaryTypeCount,
  totalSubTypes,
  layoutType,
  gap,
  dense,
}: LineOfBusinessSectionFooterProps) {
  return (
    <SectionFooterRoot>
      <SectionFooterText>
        {primaryTypeCount} primary line{primaryTypeCount === 1 ? '' : 's'} available, {totalSubTypes} subtype node{totalSubTypes === 1 ? '' : 's'} loaded.
      </SectionFooterText>
      <SectionFooterBadges>
        <Badge variant="surface">{layoutType ?? 'grid'}</Badge>
        <Badge variant="surface">{gap ?? 12}px gap</Badge>
        <Badge variant={dense ? 'primary' : 'tertiary'}>{dense ? 'dense' : 'normal'}</Badge>
      </SectionFooterBadges>
    </SectionFooterRoot>
  );
}
