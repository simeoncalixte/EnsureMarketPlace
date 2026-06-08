import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import {
  PageTitle,
  PageSubtitle,
  SmallText,
  SectionSmallTitle,
  BulletList,
  ListItem,
  ErrorText
} from './Typography'

// Typography is a set of styled-component primitives rather than a single
// component, so the meta is attached to one representative export purely to give
// the story file an identity in the sidebar.
const meta: Meta<typeof PageTitle> = {
  title: 'XDS/Typography',
  component: PageTitle
}

export default meta

type Story = StoryObj<typeof PageTitle>

const Stack: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'grid', gap: 12, maxWidth: 760 }}>{children}</div>
)

// Every primitive rendered together so the semantic tags + visuals can be
// reviewed at a glance.
export const AllVariants: Story = {
  render: () => (
    <Stack>
      <PageTitle>Page title</PageTitle>
      <PageSubtitle>
        A page subtitle giving supporting context beneath the main heading.
      </PageSubtitle>
      <SectionSmallTitle>Section eyebrow</SectionSmallTitle>
      <SmallText>Small helper / caption text.</SmallText>
      <BulletList>
        <ListItem>First bullet item</ListItem>
        <ListItem>Second bullet item</ListItem>
        <ListItem>Third bullet item</ListItem>
      </BulletList>
      <ErrorText>Something went wrong with this field.</ErrorText>
    </Stack>
  )
}

// Headings on their own to make the document outline obvious.
export const Headings: Story = {
  render: () => (
    <Stack>
      <PageTitle>Capital Profile</PageTitle>
      <SectionSmallTitle>Compliance Checks</SectionSmallTitle>
    </Stack>
  )
}

// A controlled wrapper that toggles an inline error so the interaction is
// observable, plus assertions that each primitive renders the correct semantic
// element / role.
const SemanticHarness: React.FC = () => {
  const [showError, setShowError] = useState(false)
  return (
    <Stack>
      <PageTitle>Document outline</PageTitle>
      <PageSubtitle>Subtitle paragraph</PageSubtitle>
      <SectionSmallTitle>Eyebrow</SectionSmallTitle>
      <SmallText>Caption</SmallText>
      <BulletList aria-label="checks">
        <ListItem>Item one</ListItem>
        <ListItem>Item two</ListItem>
      </BulletList>
      <button type="button" onClick={() => setShowError((v) => !v)}>
        Toggle error
      </button>
      {showError && <ErrorText role="alert">Validation failed</ErrorText>}
    </Stack>
  )
}

export const SemanticTags: Story = {
  render: () => <SemanticHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // PageTitle renders an <h1> heading.
    const title = canvas.getByRole('heading', { level: 1, name: 'Document outline' })
    expect(title.tagName).toBe('H1')

    // SectionSmallTitle renders an <h4> heading.
    const eyebrow = canvas.getByRole('heading', { level: 4, name: 'Eyebrow' })
    expect(eyebrow.tagName).toBe('H4')

    // PageSubtitle and SmallText render <p> paragraphs.
    expect(canvas.getByText('Subtitle paragraph').tagName).toBe('P')
    expect(canvas.getByText('Caption').tagName).toBe('P')

    // BulletList renders a <ul> exposed with the list role; items are <li>.
    const list = canvas.getByRole('list', { name: 'checks' })
    expect(list.tagName).toBe('UL')
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0].tagName).toBe('LI')

    // ErrorText is absent until toggled, then exposes role="alert".
    expect(canvas.queryByRole('alert')).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Toggle error' }))
    const alert = canvas.getByRole('alert')
    expect(alert).toHaveTextContent('Validation failed')
    expect(alert.tagName).toBe('DIV')
  }
}
