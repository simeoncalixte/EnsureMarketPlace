import React, { useState } from 'react'
import type { Meta } from '@storybook/react'
import ConnectedGrid, { type ConnectedGridSettings } from './ConnectedGrid'
import Badge from './Badge'
import Button from './Button'
import InfoCard from './InfoCard'
import MetricCard from './MetricCard'

const meta: Meta<typeof ConnectedGrid> = {
  title: 'XDS/ConnectedGrid',
  component: ConnectedGrid
}

export default meta

export const Default = () => {
  const [settings, setSettings] = useState<ConnectedGridSettings>({ columns: 3, rows: 3 })

  return (
    <div style={{ maxWidth: 760 }}>
      <ConnectedGrid settings={settings} onSettingsChange={setSettings} />
    </div>
  )
}

type WidgetDefinition = {
  id: string
  title: string
  render: () => React.ReactNode
}

type DragPayload = {
  widgetId: string
}

const DND_STORAGE_KEY = 'connected-grid-story-layout-v1'

const WIDGETS: WidgetDefinition[] = [
  {
    id: 'risk-badge',
    title: 'Risk Badge',
    render: () => <Badge variant="primary">Risk Watch</Badge>
  },
  {
    id: 'orders-card',
    title: 'Metric Card',
    render: () => <MetricCard label="Pending Orders" value="17" delta="+3 this hour" />
  },
  {
    id: 'capital-card',
    title: 'Info Card',
    render: () => <InfoCard title="Capital Buffer" value="$2.4M" tone="secondary" />
  },
  {
    id: 'action-button',
    title: 'Action Button',
    render: () => <Button variant="primary">Run Rebalance</Button>
  }
]

const getSavedPositions = (): Record<string, string> => {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(DND_STORAGE_KEY)

    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as unknown

    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    return parsed as Record<string, string>
  } catch {
    return {}
  }
}

export const DragDropWithLocalPersistence = () => {
  const [settings, setSettings] = useState<ConnectedGridSettings>({ columns: 4, rows: 3 })
  const [positions, setPositions] = useState<Record<string, string>>(() => getSavedPositions())

  const persistPositions = (nextPositions: Record<string, string>) => {
    setPositions(nextPositions)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DND_STORAGE_KEY, JSON.stringify(nextPositions))
    }
  }

  const onDragStart = (event: React.DragEvent<HTMLElement>, payload: DragPayload) => {
    event.dataTransfer.setData('application/json', JSON.stringify(payload))
    event.dataTransfer.effectAllowed = 'move'
  }

  const onDropOnCell = (event: React.DragEvent<HTMLDivElement>, cellKey: string) => {
    event.preventDefault()

    const raw = event.dataTransfer.getData('application/json')
    if (!raw) {
      return
    }

    try {
      const payload = JSON.parse(raw) as DragPayload
      if (!payload.widgetId) {
        return
      }

      persistPositions({
        ...positions,
        [payload.widgetId]: cellKey
      })
    } catch {
      return
    }
  }

  const clearLayout = () => {
    persistPositions({})
  }

  return (
    <div style={{ maxWidth: 960, display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {WIDGETS.map((widget) => {
          const assignedCell = positions[widget.id]

          return (
            <div
              key={widget.id}
              draggable
              onDragStart={(event) => onDragStart(event, { widgetId: widget.id })}
              style={{
                cursor: 'grab',
                border: '1px dashed rgba(148,163,184,0.45)',
                borderRadius: 10,
                padding: 10,
                minWidth: 180,
                background: 'rgba(15, 23, 38, 0.45)'
              }}
            >
              <div style={{ fontSize: 11, marginBottom: 8, opacity: 0.78 }}>
                {widget.title}
                {assignedCell ? ` (placed at ${assignedCell})` : ' (drag into a cell)'}
              </div>
              {widget.render()}
            </div>
          )
        })}

        <Button variant="ghost" onClick={clearLayout}>
          Clear Saved Layout
        </Button>
      </div>

      <ConnectedGrid
        title="ConnectedGrid - Drag and Drop Playground"
        settings={settings}
        onSettingsChange={setSettings}
        renderCell={({ cellKey }) => {
          const widgetInCell = WIDGETS.find((widget) => positions[widget.id] === cellKey)

          return (
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDropOnCell(event, cellKey)}
              style={{
                width: '100%',
                minHeight: 84,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 8,
                borderRadius: 8,
                background: widgetInCell ? 'rgba(11, 18, 32, 0.65)' : 'rgba(148,163,184,0.08)'
              }}
            >
              {widgetInCell ? (
                <div
                  draggable
                  onDragStart={(event) => onDragStart(event, { widgetId: widgetInCell.id })}
                  style={{ width: '100%', cursor: 'grab', display: 'flex', justifyContent: 'center' }}
                >
                  {widgetInCell.render()}
                </div>
              ) : (
                <span style={{ fontSize: 10, opacity: 0.75 }}>Drop Here ({cellKey})</span>
              )}
            </div>
          )
        }}
      />
    </div>
  )
}
