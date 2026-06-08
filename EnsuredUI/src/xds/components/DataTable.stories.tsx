import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import DataTable, { type DataTableColumn } from './DataTable'

const meta: Meta<typeof DataTable> = {
  title: 'XDS/DataTable',
  component: DataTable,
}

export default meta
type Story = StoryObj<typeof DataTable>

/** Legacy fixed-Row API — preserved for backward compatibility. */
export const LegacyRows: Story = {
  render: () => (
    <DataTable
      rows={[
        { id: '#SY-8821', tranche: 'Senior Secure', value: '1,240,000.00', status: 'ACTIVE', statusVariant: 'secondary' },
        { id: '#SY-4491', tranche: 'Mezzanine B', value: '450,200.00', status: 'PENDING', statusVariant: 'primary' },
        { id: '#SY-1022', tranche: 'Junior Equity', value: '88,000.50', status: 'HALTED', statusVariant: 'error' },
      ]}
    />
  ),
}

type DealRow = { deal: string; tranche: string; amount: string }

const genericColumns: DataTableColumn<DealRow>[] = [
  { key: 'deal', header: 'Deal' },
  { key: 'tranche', header: 'Tranche' },
  { key: 'amount', header: 'Amount', align: 'right' },
]

const genericData: DealRow[] = [
  { deal: 'Atlas Re', tranche: 'Senior', amount: '2,000,000' },
  { deal: 'Boreas Cat', tranche: 'Mezz', amount: '750,000' },
]

/** Generic columns/data API with row actions. */
export const Generic: Story = {
  render: () => (
    <DataTable<DealRow>
      columns={genericColumns}
      data={genericData}
      rowActions={(row) => <button type="button">View {row.deal}</button>}
    />
  ),
}

/** Loading state. */
export const Loading: Story = {
  render: () => <DataTable<DealRow> columns={genericColumns} data={[]} loading />,
}

/** Error state. */
export const ErrorState: Story = {
  render: () => <DataTable<DealRow> columns={genericColumns} data={[]} error="Failed to load deals" />,
}

/** Empty state. */
export const Empty: Story = {
  render: () => <DataTable<DealRow> columns={genericColumns} data={[]} emptyText="No deals found" />,
}

/**
 * Interaction test: a row action button toggles a selected-row label.
 * Uses local state in the story so the interaction is observable.
 */
export const Interactive: Story = {
  render: () => {
    const Wrapper: React.FC = () => {
      const [selected, setSelected] = useState<string | null>(null)
      return (
        <div>
          <div data-testid="selected">{selected ? `Selected: ${selected}` : 'None selected'}</div>
          <DataTable<DealRow>
            columns={genericColumns}
            data={genericData}
            rowActions={(row) => (
              <button type="button" onClick={() => setSelected(row.deal)}>
                Select {row.deal}
              </button>
            )}
          />
        </div>
      )
    }
    return <Wrapper />
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(canvas.getByTestId('selected')).toHaveTextContent('None selected')

    const button = canvas.getByRole('button', { name: 'Select Boreas Cat' })
    await userEvent.click(button)

    expect(canvas.getByTestId('selected')).toHaveTextContent('Selected: Boreas Cat')
  },
}
