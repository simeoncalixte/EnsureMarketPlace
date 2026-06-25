import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect, waitFor } from '@storybook/test'
import SearchableSelect, { type SearchableSelectOption } from './SearchableSelect'

const meta: Meta<typeof SearchableSelect> = {
  title: 'XDS/Form/Select/SearchableSelect',
  component: SearchableSelect,
}

export default meta

type Story = StoryObj<typeof SearchableSelect>

const FIELDS: SearchableSelectOption[] = [
  { value: 'submission.status', label: 'status · text' },
  { value: 'submission.limit', label: 'limit · number' },
  { value: 'submission.lineOfBusinessCode', label: 'lineOfBusinessCode · text' },
  { value: 'submission.organization.name', label: 'organization.name · text' },
  { value: 'submission.dataQualityScore', label: 'dataQualityScore · number' },
]

const Harness = ({ options = FIELDS, initial = '' }: { options?: SearchableSelectOption[]; initial?: string }) => {
  const [value, setValue] = useState(initial)
  return (
    <div style={{ maxWidth: 320 }}>
      <SearchableSelect
        ariaLabel="Field"
        options={options}
        value={value}
        onChange={setValue}
        placeholder="Select field…"
        searchPlaceholder="Search fields…"
      />
    </div>
  )
}

export const Default: Story = {
  render: () => <Harness />,
}

export const Preselected: Story = {
  render: () => <Harness initial="submission.limit" />,
}

export const Empty: Story = {
  render: () => <Harness options={[]} />,
}

export const SearchesAndSelects: Story = {
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole('button', { name: 'Field' })

    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    // Typing narrows the list to matching options only.
    const search = canvas.getByLabelText('Search Field')
    await userEvent.type(search, 'limit')
    await waitFor(() => expect(canvas.queryByRole('option', { name: /status/ })).toBeNull())

    // Choosing an option fills the trigger and closes the panel.
    await userEvent.click(canvas.getByRole('option', { name: /limit/ }))
    await expect(trigger).toHaveTextContent('limit · number')
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'))
  },
}

export const ClosesOnEscape: Story = {
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole('button', { name: 'Field' })

    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'))
  },
}
