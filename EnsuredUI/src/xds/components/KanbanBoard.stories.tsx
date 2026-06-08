import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, expect } from '@storybook/test'
import styled from 'styled-components'
import { KanbanBoard, KanbanItem, KanbanStage } from './KanbanBoard'
import { colors } from '../colors'
import { spacing, radii, typography } from '../tokens'

const meta: Meta<typeof KanbanBoard> = {
  title: 'XDS/KanbanBoard',
  component: KanbanBoard
}

export default meta

type Story = StoryObj<typeof KanbanBoard>

const DemoCard = styled.div`
  background: ${colors.surfaceContainerHigh};
  border: 1px solid ${colors.outlineVariant};
  border-radius: ${radii.md}px;
  padding: ${spacing.sm}px ${spacing.md}px;
  color: ${colors.text.primary};
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.sm}px;
`

const CardTitle = styled.div`
  font-weight: ${typography.weights.semibold};
`

const CardMeta = styled.div`
  font-size: ${typography.sizes.xs}px;
  color: ${colors.text.secondary};
  margin-top: 2px;
`

type Deal = KanbanItem & { title: string; premium: string }

const STAGES: KanbanStage[] = [
  { key: 'intake', label: 'Intake', accent: colors.info },
  { key: 'review', label: 'Underwriting Review', accent: colors.warning },
  { key: 'quoted', label: 'Quoted', accent: colors.primary },
  { key: 'bound', label: 'Bound', accent: colors.success }
]

const INITIAL: Deal[] = [
  { id: 'd1', stageKey: 'intake', title: 'Acme Property', premium: '$42k' },
  { id: 'd2', stageKey: 'intake', title: 'Globex Marine', premium: '$118k' },
  { id: 'd3', stageKey: 'review', title: 'Initech Cyber', premium: '$76k' },
  { id: 'd4', stageKey: 'quoted', title: 'Umbrella Casualty', premium: '$210k' },
  { id: 'd5', stageKey: 'bound', title: 'Wayne Aviation', premium: '$540k' }
]

const renderCard = (item: Deal) => (
  <DemoCard>
    <CardTitle>{item.title}</CardTitle>
    <CardMeta>Premium {item.premium}</CardMeta>
  </DemoCard>
)

const Stateful: React.FC<{ stages?: KanbanStage[]; initial?: Deal[] }> = ({
  stages = STAGES,
  initial = INITIAL
}) => {
  const [items, setItems] = useState<Deal[]>(initial)
  const handleMove = (itemId: string, stageKey: string) => {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, stageKey } : it)))
  }
  return <KanbanBoard stages={stages} items={items} onMoveItem={handleMove} renderCard={renderCard} />
}

export const Default: Story = {
  render: () => <Stateful />
}

export const WithEmptyLane: Story = {
  render: () => (
    <Stateful
      initial={[
        { id: 'd1', stageKey: 'intake', title: 'Acme Property', premium: '$42k' },
        { id: 'd2', stageKey: 'intake', title: 'Globex Marine', premium: '$118k' }
      ]}
    />
  )
}

export const InteractionRendersLanesAndCards: Story = {
  render: () => <Stateful />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Every stage label is present
    for (const stage of STAGES) {
      await expect(canvas.getByText(stage.label)).toBeInTheDocument()
    }

    // Every card title is present
    for (const deal of INITIAL) {
      await expect(canvas.getByText(deal.title)).toBeInTheDocument()
    }

    // A card sits in the correct lane (Acme Property -> Intake lane)
    const intakeLane = canvasElement.querySelector('[data-stage-key="intake"]') as HTMLElement
    await expect(intakeLane).toBeTruthy()
    const intake = within(intakeLane)
    await expect(intake.getByText('Acme Property')).toBeInTheDocument()
    await expect(intake.getByText('Globex Marine')).toBeInTheDocument()

    // Quoted lane holds Umbrella Casualty
    const quotedLane = canvasElement.querySelector('[data-stage-key="quoted"]') as HTMLElement
    await expect(within(quotedLane).getByText('Umbrella Casualty')).toBeInTheDocument()

    // Simulate an HTML5 drag of a card from Intake onto the Review lane.
    const card = canvasElement.querySelector('[data-item-id="d1"]') as HTMLElement
    const reviewLane = canvasElement.querySelector('[data-stage-key="review"]') as HTMLElement
    await expect(card).toBeTruthy()
    await expect(reviewLane).toBeTruthy()

    const dataTransfer = {
      data: {} as Record<string, string>,
      effectAllowed: 'move',
      dropEffect: 'move',
      setData(type: string, val: string) {
        this.data[type] = val
      },
      getData(type: string) {
        return this.data[type] || ''
      }
    }

    const fire = (el: HTMLElement, type: string) => {
      const ev = new Event(type, { bubbles: true, cancelable: true }) as any
      ev.dataTransfer = dataTransfer
      el.dispatchEvent(ev)
    }

    fire(card, 'dragstart')
    fire(reviewLane, 'dragover')
    fire(reviewLane, 'drop')

    // After the move, the card should now live in the Review lane.
    await expect(within(reviewLane).getByText('Acme Property')).toBeInTheDocument()
  }
}
