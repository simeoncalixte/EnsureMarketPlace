import React, { useEffect, useMemo, useState } from 'react'
import ConnectedGrid, { type ConnectedGridSettings } from './ConnectedGrid'
import { colors, withAlpha } from '../colors'
import Button from './Button'

export type ConnectedGridTemplate = {
  id: string
  label: string
  render: () => React.ReactNode
}

export type ConnectedGridPlacement = {
  instanceId: string
  templateId: string
  label: string
  cellKey: string
  placedAt: number
}

export type ConnectedGridWorkspaceViewMode = 'workspace' | 'rendered'

type DragPayload =
  | {
      source: 'palette'
      templateId: string
    }
  | {
      source: 'cell'
      instanceId: string
    }

export type ConnectedGridWorkspaceProps = {
  templates: ConnectedGridTemplate[]
  initialSettings?: ConnectedGridSettings
  title?: string
  storageKey?: string
  initialViewMode?: ConnectedGridWorkspaceViewMode
  showViewToggle?: boolean
  onViewModeChange?: (mode: ConnectedGridWorkspaceViewMode) => void
  onPlacementsChange?: (placements: ConnectedGridPlacement[]) => void
}

type PersistedState = {
  settings: ConnectedGridSettings
  placements: ConnectedGridPlacement[]
}

const DEFAULT_SETTINGS: ConnectedGridSettings = { columns: 4, rows: 3 }

const toCellKey = (row: number, column: number) => `${row}:${column}`

const parseCellKey = (cellKey: string) => {
  const [rawRow, rawColumn] = cellKey.split(':')
  const row = Number(rawRow)
  const column = Number(rawColumn)

  if (!Number.isInteger(row) || !Number.isInteger(column)) {
    return null
  }

  return { row, column }
}

const createInstanceId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `instance-${Date.now()}-${Math.round(Math.random() * 1000000)}`
}

const getValidCellKeys = (settings: ConnectedGridSettings) => {
  const cellKeys: string[] = []

  for (let row = 1; row <= settings.rows; row += 1) {
    for (let column = 1; column <= settings.columns; column += 1) {
      cellKeys.push(toCellKey(row, column))
    }
  }

  return new Set(cellKeys)
}

const loadPersistedState = (storageKey: string): PersistedState | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(storageKey)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as unknown

    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    const maybeState = parsed as Partial<PersistedState>

    if (!maybeState.settings || !maybeState.placements) {
      return null
    }

    return {
      settings: maybeState.settings,
      placements: Array.isArray(maybeState.placements) ? maybeState.placements : []
    }
  } catch {
    return null
  }
}

export const ConnectedGridWorkspace: React.FC<ConnectedGridWorkspaceProps> = ({
  templates,
  initialSettings = DEFAULT_SETTINGS,
  title = 'Connected Grid Workspace',
  storageKey = 'connected-grid-workspace-layout-v1',
  initialViewMode = 'workspace',
  showViewToggle = true,
  onViewModeChange,
  onPlacementsChange
}) => {
  const [settings, setSettings] = useState<ConnectedGridSettings>(() => {
    const saved = loadPersistedState(storageKey)
    return saved?.settings ?? initialSettings
  })

  const [placements, setPlacements] = useState<ConnectedGridPlacement[]>(() => {
    const saved = loadPersistedState(storageKey)
    return saved?.placements ?? []
  })
  const [viewMode, setViewMode] = useState<ConnectedGridWorkspaceViewMode>(initialViewMode)

  const templateMap = useMemo(() => {
    return new Map(templates.map((template) => [template.id, template]))
  }, [templates])

  const validCellKeys = useMemo(() => getValidCellKeys(settings), [settings])

  useEffect(() => {
    setPlacements((prev) => prev.filter((placement) => validCellKeys.has(placement.cellKey)))
  }, [validCellKeys])

  useEffect(() => {
    onPlacementsChange?.(placements)

    if (typeof window !== 'undefined') {
      const nextState: PersistedState = {
        settings,
        placements
      }
      window.localStorage.setItem(storageKey, JSON.stringify(nextState))
    }
  }, [onPlacementsChange, placements, settings, storageKey])

  useEffect(() => {
    setViewMode(initialViewMode)
  }, [initialViewMode])

  useEffect(() => {
    onViewModeChange?.(viewMode)
  }, [onViewModeChange, viewMode])

  const onDragStartFromPalette = (event: React.DragEvent<HTMLElement>, templateId: string) => {
    const payload: DragPayload = { source: 'palette', templateId }
    event.dataTransfer.setData('application/json', JSON.stringify(payload))
    event.dataTransfer.effectAllowed = 'copyMove'
  }

  const onDragStartFromCell = (event: React.DragEvent<HTMLElement>, instanceId: string) => {
    const payload: DragPayload = { source: 'cell', instanceId }
    event.dataTransfer.setData('application/json', JSON.stringify(payload))
    event.dataTransfer.effectAllowed = 'move'
  }

  const onDropIntoCell = (event: React.DragEvent<HTMLDivElement>, cellKey: string) => {
    event.preventDefault()

    const raw = event.dataTransfer.getData('application/json')
    if (!raw) {
      return
    }

    try {
      const payload = JSON.parse(raw) as DragPayload

      if (payload.source === 'palette') {
        const template = templateMap.get(payload.templateId)

        if (!template) {
          return
        }

        const nextPlacement: ConnectedGridPlacement = {
          instanceId: createInstanceId(),
          templateId: template.id,
          label: template.label,
          cellKey,
          placedAt: Date.now()
        }

        setPlacements((prev) => {
          const withoutTargetCell = prev.filter((placement) => placement.cellKey !== cellKey)
          return [...withoutTargetCell, nextPlacement]
        })

        return
      }

      if (payload.source === 'cell') {
        setPlacements((prev) => {
          const moved = prev.find((placement) => placement.instanceId === payload.instanceId)
          if (!moved) {
            return prev
          }

          return prev
            .filter((placement) => placement.instanceId !== payload.instanceId && placement.cellKey !== cellKey)
            .concat({ ...moved, cellKey, placedAt: Date.now() })
        })
      }
    } catch {
      return
    }
  }

  const removePlacement = (instanceId: string) => {
    setPlacements((prev) => prev.filter((placement) => placement.instanceId !== instanceId))
  }

  const clearAll = () => {
    setPlacements([])
  }

  const placementsByCell = useMemo(() => {
    return new Map(placements.map((placement) => [placement.cellKey, placement]))
  }, [placements])

  const sortedPlacements = useMemo(() => {
    return [...placements].sort((a, b) => b.placedAt - a.placedAt)
  }, [placements])

  const renderedPlacements = useMemo(() => {
    return placements
      .map((placement) => {
        const coordinates = parseCellKey(placement.cellKey)

        if (!coordinates) {
          return null
        }

        if (
          coordinates.row < 1 ||
          coordinates.row > settings.rows ||
          coordinates.column < 1 ||
          coordinates.column > settings.columns
        ) {
          return null
        }

        return {
          ...placement,
          row: coordinates.row,
          column: coordinates.column,
          template: templateMap.get(placement.templateId)
        }
      })
      .filter((placement): placement is ConnectedGridPlacement & { row: number; column: number; template: ConnectedGridTemplate | undefined } => {
        return Boolean(placement)
      })
      .sort((a, b) => a.row - b.row || a.column - b.column)
  }, [placements, settings.columns, settings.rows, templateMap])

  const renderViewToggle = showViewToggle ? (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: 4,
        borderRadius: 999,
        border: `1px solid ${colors.outlineVariant}`,
        background: colors.surfaceContainerLow
      }}
    >
      <button
        type="button"
        onClick={() => setViewMode('workspace')}
        aria-pressed={viewMode === 'workspace'}
        style={{
          border: 'none',
          borderRadius: 999,
          padding: '6px 10px',
          background: viewMode === 'workspace' ? colors.primary : 'transparent',
          color: viewMode === 'workspace' ? colors.neutral[0] : colors.onSurfaceVariant,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 700
        }}
      >
        Workspace View
      </button>
      <button
        type="button"
        onClick={() => setViewMode('rendered')}
        aria-pressed={viewMode === 'rendered'}
        style={{
          border: 'none',
          borderRadius: 999,
          padding: '6px 10px',
          background: viewMode === 'rendered' ? colors.primary : 'transparent',
          color: viewMode === 'rendered' ? colors.neutral[0] : colors.onSurfaceVariant,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 700
        }}
      >
        Rendered View
      </button>
    </div>
  ) : null

  if (viewMode === 'rendered') {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        {renderViewToggle}
        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: `repeat(${settings.columns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${settings.rows}, minmax(0, auto))`,
            alignItems: 'start'
          }}
        >
          {renderedPlacements.map((placement) => {
            if (!placement.template) {
              return null
            }

            return (
              <div
                key={placement.instanceId}
                style={{
                  minWidth: 0,
                  gridColumn: placement.column,
                  gridRow: placement.row
                }}
              >
                {placement.template.render()}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {renderViewToggle}
      <section
        style={{
          border: `1px solid ${colors.outlineVariant}`,
          borderRadius: 12,
          padding: 12,
          background: colors.surfaceContainerLow,
          display: 'grid',
          gap: 10
        }}
      >
        <div style={{ fontSize: 12, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Available Elements (drag into the grid)
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {templates.map((template) => (
            <div
              key={template.id}
              draggable
              onDragStart={(event) => onDragStartFromPalette(event, template.id)}
              style={{
                minWidth: 170,
                border: `1px dashed ${colors.outlineVariant}`,
                borderRadius: 10,
                padding: 10,
                cursor: 'grab',
                background: colors.surfaceContainer
              }}
            >
              <div style={{ fontSize: 11, color: colors.onSurfaceVariant, marginBottom: 8 }}>{template.label}</div>
              {template.render()}
            </div>
          ))}
        </div>
      </section>

      <ConnectedGrid title={title} settings={settings} onSettingsChange={setSettings} renderCell={({ cellKey }) => {
        const placement = placementsByCell.get(cellKey)
        const template = placement ? templateMap.get(placement.templateId) : undefined

        return (
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onDropIntoCell(event, cellKey)}
            style={{
              width: '100%',
              minHeight: 88,
              padding: 8,
              borderRadius: 8,
              display: 'grid',
              gap: 8,
              alignContent: 'center',
              justifyItems: 'center',
              background: placement ? withAlpha(colors.surface, 0.62) : withAlpha(colors.neutral[400], 0.08)
            }}
          >
            {placement && template ? (
              <>
                <div
                  draggable
                  onDragStart={(event) => onDragStartFromCell(event, placement.instanceId)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', cursor: 'grab' }}
                >
                  {template.render()}
                </div>
                <button
                  type="button"
                  onClick={() => removePlacement(placement.instanceId)}
                  style={{
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 8px',
                    background: colors.errorContainer,
                    color: colors.onErrorContainer,
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 700
                  }}
                >
                  Remove
                </button>
              </>
            ) : (
              <span style={{ fontSize: 10, color: colors.onSurfaceVariant }}>Drop New Element ({cellKey})</span>
            )}
          </div>
        )
      }} />

      <section
        style={{
          border: `1px solid ${colors.outlineVariant}`,
          borderRadius: 12,
          padding: 12,
          background: colors.surfaceContainerLow,
          display: 'grid',
          gap: 10
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Tracked Elements ({sortedPlacements.length})
          </div>
          <Button variant="ghost" onClick={clearAll}>Clear All</Button>
        </div>

        {sortedPlacements.length === 0 ? (
          <div style={{ fontSize: 12, color: colors.onSurfaceVariant }}>No elements placed yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {sortedPlacements.map((placement) => (
              <div
                key={placement.instanceId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 12,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: colors.surfaceContainer,
                  border: `1px solid ${colors.outlineVariant}`
                }}
              >
                <span>{placement.label}</span>
                <span style={{ color: colors.onSurfaceVariant }}>{placement.cellKey}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default ConnectedGridWorkspace
