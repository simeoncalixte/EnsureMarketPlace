import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import Range from './Range'

const meta: Meta<typeof Range> = {
  title: 'XDS/Form/Range',
  component: Range,
  argTypes: {
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    disabled: { control: 'boolean' }
  }
}

export default meta
type Story = StoryObj<typeof Range>

export const Default: Story = {
  args: {
    min: 0,
    max: 100,
    defaultValue: 50,
    'aria-label': 'Default range'
  }
}

export const Disabled: Story = {
  args: {
    min: 0,
    max: 100,
    defaultValue: 25,
    disabled: true,
    'aria-label': 'Disabled range'
  }
}

export const CustomBounds: Story = {
  args: {
    min: 4,
    max: 25,
    step: 0.5,
    defaultValue: 14.5,
    'aria-label': 'Target yield'
  }
}

// Interaction test: drives a controlled slider and asserts onChange + value readout.
export const Controlled: Story = {
  render: () => {
    const [value, setValue] = React.useState(20)
    return (
      <div>
        <Range
          min={0}
          max={100}
          value={value}
          aria-label="Risk tolerance"
          onChange={(e) => setValue(Number(e.target.value))}
        />
        <output data-testid="readout">{value}</output>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const slider = canvas.getByRole('slider', { name: 'Risk tolerance' }) as HTMLInputElement

    // Initial state reflects the controlled value.
    await expect(slider.value).toBe('20')
    await expect(canvas.getByTestId('readout')).toHaveTextContent('20')

    // Change the slider value; onChange should update both the input and readout.
    fireSliderChange(slider, 75)
    await expect(slider.value).toBe('75')
    await expect(canvas.getByTestId('readout')).toHaveTextContent('75')

    // Keyboard interaction also drives the value.
    slider.focus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(canvas.getByTestId('readout')).toHaveTextContent('76')
  }
}

// userEvent cannot drag a native range input, so dispatch a native input event.
function fireSliderChange(slider: HTMLInputElement, next: number) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set
  setter?.call(slider, String(next))
  slider.dispatchEvent(new Event('input', { bubbles: true }))
}
