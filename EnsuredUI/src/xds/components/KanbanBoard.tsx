import React, { useState } from 'react'
import styled from 'styled-components'
import { colors } from '../colors'
import { spacing, radii, typography } from '../tokens'

export type KanbanStage = {
  key: string
  label: string
  accent?: string
}

export type KanbanItem = {
  id: string
  stageKey: string
}

export type KanbanBoardProps = {
  stages: KanbanStage[]
  items: KanbanItem[]
  onMoveItem: (itemId: string, stageKey: string) => void
  renderCard: (item: any) => React.ReactNode
}

const Board = styled.div`
  display: flex;
  gap: ${spacing.md}px;
  align-items: flex-start;
  overflow-x: auto;
  padding: ${spacing.sm}px;
  font-family: ${typography.fontFamily};
`

const Lane = styled.div<{ $over: boolean }>`
  display: flex;
  flex-direction: column;
  min-width: 240px;
  max-width: 280px;
  flex: 1 0 240px;
  background: ${colors.surfaceContainerLow};
  border: 1px solid ${({ $over }) => ($over ? colors.primary : colors.outlineVariant)};
  border-radius: ${radii.lg}px;
  overflow: hidden;
  transition: border-color 120ms ease, background 120ms ease;
  ${({ $over }) => ($over ? `background: ${colors.surfaceContainerHigh};` : '')}
`

const AccentBar = styled.div<{ $accent: string }>`
  height: 4px;
  width: 100%;
  background: ${({ $accent }) => $accent};
`

const LaneHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${spacing.sm}px;
  padding: ${spacing.sm}px ${spacing.md}px;
  border-bottom: 1px solid ${colors.outlineVariant};
`

const LaneLabel = styled.span`
  font-size: ${typography.sizes.sm}px;
  font-weight: ${typography.weights.semibold};
  color: ${colors.text.primary};
`

const LaneCount = styled.span`
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.medium};
  color: ${colors.text.secondary};
  background: ${colors.surfaceContainerHighest};
  border-radius: ${radii.round}px;
  padding: 2px ${spacing.sm}px;
  min-width: 20px;
  text-align: center;
`

const LaneBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.sm}px;
  padding: ${spacing.sm}px;
  min-height: 64px;
  flex: 1;
`

const CardSlot = styled.div<{ $dragging: boolean }>`
  cursor: grab;
  border-radius: ${radii.md}px;
  opacity: ${({ $dragging }) => ($dragging ? 0.4 : 1)};
  transition: opacity 120ms ease;

  &:active {
    cursor: grabbing;
  }
`

const EmptyHint = styled.div`
  font-size: ${typography.sizes.xs}px;
  color: ${colors.text.secondary};
  text-align: center;
  padding: ${spacing.md}px ${spacing.sm}px;
  opacity: 0.7;
`

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ stages, items, onMoveItem, renderCard }) => {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overLaneKey, setOverLaneKey] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, itemId: string) => {
    setDraggingId(itemId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', itemId)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setOverLaneKey(null)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, stageKey: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overLaneKey !== stageKey) setOverLaneKey(stageKey)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>, stageKey: string) => {
    // Only clear if we are actually leaving the lane (not entering a child)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    if (overLaneKey === stageKey) setOverLaneKey(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, stageKey: string) => {
    e.preventDefault()
    const itemId = e.dataTransfer.getData('text/plain') || draggingId
    if (itemId) onMoveItem(itemId, stageKey)
    setDraggingId(null)
    setOverLaneKey(null)
  }

  return (
    <Board role="list" aria-label="Kanban board">
      {stages.map((stage) => {
        const laneItems = items.filter((it) => it.stageKey === stage.key)
        const accent = stage.accent ?? colors.primary
        const isOver = overLaneKey === stage.key
        return (
          <Lane
            key={stage.key}
            role="listitem"
            data-stage-key={stage.key}
            aria-label={stage.label}
            $over={isOver}
            onDragOver={(e) => handleDragOver(e, stage.key)}
            onDragLeave={(e) => handleDragLeave(e, stage.key)}
            onDrop={(e) => handleDrop(e, stage.key)}
          >
            <AccentBar $accent={accent} aria-hidden="true" />
            <LaneHeader>
              <LaneLabel>{stage.label}</LaneLabel>
              <LaneCount aria-label={`${laneItems.length} items`}>{laneItems.length}</LaneCount>
            </LaneHeader>
            <LaneBody>
              {laneItems.length === 0 ? (
                <EmptyHint>Drop cards here</EmptyHint>
              ) : (
                laneItems.map((item) => (
                  <CardSlot
                    key={item.id}
                    draggable
                    data-item-id={item.id}
                    $dragging={draggingId === item.id}
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragEnd={handleDragEnd}
                  >
                    {renderCard(item)}
                  </CardSlot>
                ))
              )}
            </LaneBody>
          </Lane>
        )
      })}
    </Board>
  )
}

export default KanbanBoard
