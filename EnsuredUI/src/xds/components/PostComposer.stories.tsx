import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect, fn } from '@storybook/test'
import PostComposer from './PostComposer'

const meta: Meta<typeof PostComposer> = {
  title: 'XDS/PostComposer',
  component: PostComposer,
  args: {
    onSubmit: fn(),
    busy: false
  }
}

export default meta

type Story = StoryObj<typeof PostComposer>

export const Default: Story = {}

export const Busy: Story = {
  args: { busy: true }
}

export const CustomPlaceholder: Story = {
  args: { placeholder: 'What is on your mind?' }
}

// Interaction test: type text, pick visibility, click Post, assert the
// callback fired with the content and the textarea cleared afterwards.
export const SubmitFlow: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)

    const textarea = canvas.getByPlaceholderText('Share an update with your network…')
    const postButton = canvas.getByRole('button', { name: 'Post' })

    // Empty composer cannot submit.
    expect(postButton).toBeDisabled()

    await userEvent.type(textarea, 'Hello network!')
    expect(postButton).toBeEnabled()

    // The visibility control is now a custom dropdown: open it and pick the option.
    await userEvent.click(canvas.getByLabelText('Post visibility'))
    await userEvent.click(canvas.getByRole('option', { name: 'Connections only' }))

    await userEvent.click(postButton)
    expect(args.onSubmit).toHaveBeenCalledWith('Hello network!', 'connections')

    // Textarea clears after a successful submit and the button disables again.
    expect(textarea).toHaveValue('')
    expect(postButton).toBeDisabled()
  }
}
