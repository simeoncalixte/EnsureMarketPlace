import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect, waitFor } from '@storybook/test'
import MultiSelect, { type MultiSelectOption } from './MultiSelect'

const meta: Meta<typeof MultiSelect> = {
  title: 'XDS/Form/Select/MultiSelect',
  component: MultiSelect,
}

export default meta

type Story = StoryObj<typeof MultiSelect>

const LINES: MultiSelectOption[] = [
  { value: 'property', label: 'Property' },
  { value: 'casualty', label: 'Casualty' },
  { value: 'marine', label: 'Marine Cargo' },
  { value: 'aviation', label: 'Aviation' },
  { value: 'cyber', label: 'Cyber' },
  { value: 'energy', label: 'Energy' },
]

const Harness = ({ options = LINES }: { options?: MultiSelectOption[] }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (value: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(value) ? next.delete(value) : next.add(value)
      return next
    })

  return (
    <div style={{ maxWidth: 280 }}>
      <MultiSelect
        label="Line of Business"
        placeholder="Any line of business"
        searchPlaceholder="Search line of business…"
        options={options}
        selected={selected}
        onToggle={toggle}
        onSelectAll={(visible) =>
          setSelected((prev) => new Set([...prev, ...visible]))
        }
        onClear={(visible) =>
          setSelected((prev) => {
            const next = new Set(prev)
            visible.forEach((value) => next.delete(value))
            return next
          })
        }
      />
    </div>
  )
}

export const Default: Story = {
  render: () => <Harness />,
}

export const Loading: Story = {
  render: () => (
    <div style={{ maxWidth: 280 }}>
      <MultiSelect
        label="Line of Business"
        options={[]}
        selected={new Set()}
        onToggle={() => {}}
        isLoading
        loadingText="Loading line of business values…"
      />
    </div>
  ),
}

export const Empty: Story = {
  render: () => <Harness options={[]} />,
}

export const SelectsAndSearches: Story = {
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole('button', { name: 'Line of Business' })

    // Opens to reveal the searchable list.
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    // Pick a single option — the trigger reflects its label.
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Property' }))
    await expect(trigger).toHaveTextContent('Property')

    // Search narrows the visible options.
    const search = canvas.getByLabelText('Search Line of Business')
    await userEvent.type(search, 'cy')
    await waitFor(() =>
      expect(canvas.queryByRole('checkbox', { name: 'Casualty' })).toBeNull()
    )
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Cyber' }))

    // Two selected → the trigger shows the count summary.
    await expect(trigger).toHaveTextContent('2 selected')
  },
}

export const ClosesOnEscape: Story = {
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole('button', { name: 'Line of Business' })

    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    )
  },
}
