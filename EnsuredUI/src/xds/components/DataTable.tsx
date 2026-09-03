import React from 'react'
import styled from 'styled-components'
import { colors, withAlpha } from '../colors'
import { radii } from '../tokens'

/**
 * Legacy fixed-shape row used by the original DataTable API.
 * Preserved verbatim so existing callers keep compiling.
 */
export type Row = {
  id: string
  tranche: string
  value: string
  status: string
  statusVariant?: 'secondary' | 'primary' | 'error'
}

type Align = 'left' | 'right' | 'center'

/**
 * Generic column descriptor for the additive DataTable API.
 */
export type DataTableColumn<T = any> = {
  key: string
  header: React.ReactNode
  align?: Align
  render?: (row: T) => React.ReactNode
}

/** Props for the legacy fixed-Row API (backward compatible). */
export type DataTableLegacyProps = {
  rows: Row[]
}

/** Props for the generic columns/data API. */
export type DataTableGenericProps<T = any> = {
  columns: DataTableColumn<T>[]
  data: T[]
  loading?: boolean
  error?: string
  emptyText?: string
  rowActions?: (row: T) => React.ReactNode
}

export type DataTableProps<T = any> = DataTableLegacyProps | DataTableGenericProps<T>

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: ui-monospace, Menlo, monospace;
`

const HeaderRow = styled.tr`
  background: ${withAlpha(colors.onSurface, 0.02)};
`

const HeaderCell = styled.th<{ $align?: Align }>`
  padding: 12px;
  font-size: 10px;
  text-transform: uppercase;
  color: ${colors.onSurfaceVariant};
  text-align: ${(p) => p.$align ?? 'left'};
`

const BodyRow = styled.tr`
  border-top: 1px solid ${withAlpha(colors.neutral[400], 0.06)};
  cursor: pointer;
`

const BodyCell = styled.td<{ $align?: Align; $variant?: 'primary' | 'muted' }>`
  padding: 12px;
  text-align: ${(p) => p.$align ?? 'left'};
  color: ${(p) => (p.$variant === 'muted' ? colors.onSurfaceVariant : colors.text.primary)};
`

const StatusBadge = styled.span<{ $statusVariant?: 'secondary' | 'primary' | 'error' }>`
  padding: 6px 8px;
  border-radius: ${radii.md}px;
  font-size: 10px;
  font-weight: 700;
  background: ${(p) =>
    p.$statusVariant === 'secondary'
      ? withAlpha(colors.primary, 0.08)
      : p.$statusVariant === 'error'
        ? withAlpha(colors.error, 0.08)
        : withAlpha(colors.neutral[500], 0.06)};
  color: ${(p) =>
    p.$statusVariant === 'error'
      ? colors.error
      : p.$statusVariant === 'secondary'
        ? colors.primary
        : colors.onSurfaceVariant};
`

const StateCell = styled.td<{ $tone?: 'error' | 'muted' }>`
  padding: 12px;
  text-align: center;
  font-size: 12px;
  color: ${(p) => (p.$tone === 'error' ? colors.error : colors.onSurfaceVariant)};
`

const ActionsCell = styled.td`
  padding: 12px;
  text-align: right;
`

const ActionsHeader = styled.th`
  padding: 12px;
  font-size: 10px;
  text-transform: uppercase;
  color: ${colors.onSurfaceVariant};
  text-align: right;
`

function isGeneric<T>(props: DataTableProps<T>): props is DataTableGenericProps<T> {
  return Array.isArray((props as DataTableGenericProps<T>).columns)
}

/**
 * Legacy fixed-Row rendering. Visual output is identical to the previous
 * inline-styled implementation.
 */
const LegacyDataTable: React.FC<DataTableLegacyProps> = ({ rows }) => {
  return (
    <Table>
      <thead>
        <HeaderRow>
          <HeaderCell>Contract ID</HeaderCell>
          <HeaderCell>Tranche</HeaderCell>
          <HeaderCell $align="right">Value (USD)</HeaderCell>
          <HeaderCell $align="center">Status</HeaderCell>
        </HeaderRow>
      </thead>
      <tbody>
        {rows.map((r) => (
          <BodyRow key={r.id}>
            <BodyCell>{r.id}</BodyCell>
            <BodyCell $variant="muted">{r.tranche}</BodyCell>
            <BodyCell $align="right">{r.value}</BodyCell>
            <BodyCell $align="center">
              <StatusBadge $statusVariant={r.statusVariant}>{r.status}</StatusBadge>
            </BodyCell>
          </BodyRow>
        ))}
      </tbody>
    </Table>
  )
}

/**
 * Generic columns/data rendering with loading, error, empty and rowActions
 * support.
 */
function GenericDataTable<T>({
  columns,
  data,
  loading,
  error,
  emptyText = 'No data',
  rowActions,
}: DataTableGenericProps<T>) {
  const columnCount = columns.length + (rowActions ? 1 : 0)

  let body: React.ReactNode
  if (loading) {
    body = (
      <tr>
        <StateCell colSpan={columnCount} role="status" aria-busy="true">
          Loading...
        </StateCell>
      </tr>
    )
  } else if (error) {
    body = (
      <tr>
        <StateCell colSpan={columnCount} $tone="error" role="alert">
          {error}
        </StateCell>
      </tr>
    )
  } else if (data.length === 0) {
    body = (
      <tr>
        <StateCell colSpan={columnCount}>{emptyText}</StateCell>
      </tr>
    )
  } else {
    body = data.map((row, rowIndex) => (
      <BodyRow key={rowIndex}>
        {columns.map((col) => (
          <BodyCell key={col.key} $align={col.align}>
            {col.render ? col.render(row) : ((row as any)[col.key] as React.ReactNode)}
          </BodyCell>
        ))}
        {rowActions ? <ActionsCell>{rowActions(row)}</ActionsCell> : null}
      </BodyRow>
    ))
  }

  return (
    <Table>
      <thead>
        <HeaderRow>
          {columns.map((col) => (
            <HeaderCell key={col.key} $align={col.align}>
              {col.header}
            </HeaderCell>
          ))}
          {rowActions ? <ActionsHeader aria-label="Actions" /> : null}
        </HeaderRow>
      </thead>
      <tbody>{body}</tbody>
    </Table>
  )
}

/**
 * DataTable supports two APIs:
 *  - Legacy fixed-Row API: `<DataTable rows={Row[]} />`
 *  - Generic API: `<DataTable columns={...} data={...} loading error emptyText rowActions />`
 *
 * The active API is chosen by which prop is provided (`columns` => generic).
 */
export function DataTable<T = any>(props: DataTableProps<T>) {
  if (isGeneric(props)) {
    return <GenericDataTable<T> {...props} />
  }
  return <LegacyDataTable {...props} />
}

export default DataTable
