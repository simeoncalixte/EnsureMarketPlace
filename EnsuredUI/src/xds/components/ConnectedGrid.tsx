import React, { useEffect, useMemo, useState } from 'react'
import { colors } from '../colors'

export type ConnectedGridSettings = {
  columns: number
  rows: number
}

export type ConnectedGridProps = {
  settings: ConnectedGridSettings
  onSettingsChange?: (nextSettings: ConnectedGridSettings) => void
  minColumns?: number
  maxColumns?: number
  minRows?: number
  maxRows?: number
  renderCell?: (cell: { row: number; column: number; cellKey: string }) => React.ReactNode
  title?: string
  className?: string
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const ConnectedGrid: React.FC<ConnectedGridProps> = ({
  settings,
  onSettingsChange,
  minColumns = 1,
  maxColumns = 12,
  minRows = 1,
  maxRows = 24,
  renderCell,
  title = 'ConnectedGrid',
  className
}) => {
  const initialSettings = useMemo(
    () => ({
      columns: clamp(settings.columns || 1, minColumns, maxColumns),
      rows: clamp(settings.rows || 1, minRows, maxRows)
    }),
    [maxColumns, maxRows, minColumns, minRows, settings.columns, settings.rows]
  )

  const [currentSettings, setCurrentSettings] = useState<ConnectedGridSettings>(initialSettings)

  useEffect(() => {
    setCurrentSettings(initialSettings)
  }, [initialSettings])

  const emitChange = (nextSettings: ConnectedGridSettings) => {
    setCurrentSettings(nextSettings)
    onSettingsChange?.(nextSettings)
  }

  const addColumn = () => {
    emitChange({
      ...currentSettings,
      columns: clamp(currentSettings.columns + 1, minColumns, maxColumns)
    })
  }

  const removeColumn = () => {
    emitChange({
      ...currentSettings,
      columns: clamp(currentSettings.columns - 1, minColumns, maxColumns)
    })
  }

  const addRow = () => {
    emitChange({
      ...currentSettings,
      rows: clamp(currentSettings.rows + 1, minRows, maxRows)
    })
  }

  const removeRow = () => {
    emitChange({
      ...currentSettings,
      rows: clamp(currentSettings.rows - 1, minRows, maxRows)
    })
  }

  const totalCells = currentSettings.columns * currentSettings.rows
  const isAtMinColumns = currentSettings.columns <= minColumns
  const isAtMaxColumns = currentSettings.columns >= maxColumns
  const isAtMinRows = currentSettings.rows <= minRows
  const isAtMaxRows = currentSettings.rows >= maxRows

  return (
    <section
      className={className}
      style={{
        background: colors.surfaceContainer,
        border: `1px solid ${colors.outlineVariant}`,
        borderRadius: 14,
        padding: 16,
        display: 'grid',
        gap: 12,
        color: colors.text.primary,
        fontFamily: 'ui-monospace, Menlo, monospace'
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, letterSpacing: 0.2 }}>{title}</h3>
          <p style={{ margin: '6px 0 0', color: colors.onSurfaceVariant, fontSize: 12 }}>
            {currentSettings.columns} columns x {currentSettings.rows} rows ({totalCells} cells)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: colors.onSurfaceVariant }}>Columns</span>
            <button
              type="button"
              onClick={removeColumn}
              disabled={isAtMinColumns}
              aria-label="Remove column"
              style={{
                minWidth: 34,
                height: 34,
                border: 'none',
                borderRadius: 8,
                cursor: isAtMinColumns ? 'not-allowed' : 'pointer',
                background: isAtMinColumns ? colors.tertiaryContainer : colors.errorContainer,
                color: isAtMinColumns ? colors.onSurfaceVariant : colors.onErrorContainer,
                fontWeight: 700,
                fontSize: 18,
                lineHeight: 1
              }}
            >
              -
            </button>
            <button
              type="button"
              onClick={addColumn}
              disabled={isAtMaxColumns}
              aria-label="Add column"
              style={{
                minWidth: 34,
                height: 34,
                border: 'none',
                borderRadius: 8,
                cursor: isAtMaxColumns ? 'not-allowed' : 'pointer',
                background: isAtMaxColumns ? colors.tertiaryContainer : colors.primary,
                color: colors.neutral[0],
                fontWeight: 700,
                fontSize: 18,
                lineHeight: 1
              }}
            >
              +
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: colors.onSurfaceVariant }}>Rows</span>
            <button
              type="button"
              onClick={removeRow}
              disabled={isAtMinRows}
              aria-label="Remove row"
              style={{
                minWidth: 34,
                height: 34,
                border: 'none',
                borderRadius: 8,
                cursor: isAtMinRows ? 'not-allowed' : 'pointer',
                background: isAtMinRows ? colors.tertiaryContainer : colors.errorContainer,
                color: isAtMinRows ? colors.onSurfaceVariant : colors.onErrorContainer,
                fontWeight: 700,
                fontSize: 18,
                lineHeight: 1
              }}
            >
              -
            </button>
            <button
              type="button"
              onClick={addRow}
              disabled={isAtMaxRows}
              aria-label="Add row"
              style={{
                minWidth: 34,
                height: 34,
                border: 'none',
                borderRadius: 8,
                cursor: isAtMaxRows ? 'not-allowed' : 'pointer',
                background: isAtMaxRows ? colors.tertiaryContainer : colors.primary,
                color: colors.neutral[0],
                fontWeight: 700,
                fontSize: 18,
                lineHeight: 1
              }}
            >
              +
            </button>
          </div>
        </div>
      </header>

      <div
        style={{
          display: 'grid',
          gap: 8,
          gridTemplateColumns: `repeat(${currentSettings.columns}, minmax(72px, 1fr))`
        }}
      >
        {Array.from({ length: totalCells }).map((_, index) => {
          const row = Math.floor(index / currentSettings.columns) + 1
          const column = (index % currentSettings.columns) + 1
          const cellKey = `${row}:${column}`
          const customCellContent = renderCell?.({ row, column, cellKey })

          return (
            <div
              key={`cell-${cellKey}`}
              style={{
                minHeight: 52,
                borderRadius: 8,
                border: `1px solid ${colors.outlineVariant}`,
                background: colors.surfaceContainerHigh,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.onSurfaceVariant,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}
            >
              {customCellContent ?? (
                <>
                  R{row} C{column}
                </>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default ConnectedGrid
