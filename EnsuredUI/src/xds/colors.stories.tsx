import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, expect } from '@storybook/test'
import styled from 'styled-components'
import { colors, withAlpha } from './colors'

const meta: Meta = {
  title: 'XDS/Design Tokens/Colors'
}

export default meta

type Entry = [label: string, value: string]

const Page = styled.div`
  padding: 24px;
  background: ${colors.background};
  min-height: 100vh;
  font-family: ${`Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`};
  color: ${colors.onSurface};
`

const Intro = styled.p`
  margin: 0 0 24px;
  max-width: 760px;
  font-size: 13px;
  line-height: 1.5;
  color: ${colors.onSurfaceVariant};
`

const SectionTitle = styled.h2`
  margin: 28px 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: ${colors.onSurfaceStrong};
`

const SectionNote = styled.p`
  margin: 0 0 14px;
  font-size: 12px;
  color: ${colors.onSurfaceVariant};
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
`

const SwatchCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: ${8}px;
  background: ${colors.surfaceRaised};
  border: 1px solid ${withAlpha(colors.border, 0.4)};
`

const Chip = styled.div<{ $value: string }>`
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  border-radius: 8px;
  background: ${(p) => p.$value};
  /* Inset ring so very light and very dark swatches stay visible on the surface */
  box-shadow: inset 0 0 0 1px ${withAlpha(colors.onSurface, 0.14)},
    inset 0 0 0 2px ${withAlpha(colors.black, 0.25)};
`

const Labels = styled.div`
  min-width: 0;
`

const Name = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${colors.onSurfaceStrong};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Value = styled.code`
  font-size: 12px;
  color: ${colors.onSurfaceVariant};
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
`

const Swatch: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <SwatchCard>
    <Chip $value={value} />
    <Labels>
      <Name title={label}>{label}</Name>
      <Value>{value}</Value>
    </Labels>
  </SwatchCard>
)

const Section: React.FC<{ title: string; note?: string; entries: Entry[] }> = ({
  title,
  note,
  entries
}) => (
  <>
    <SectionTitle>{title}</SectionTitle>
    {note && <SectionNote>{note}</SectionNote>}
    <Grid>
      {entries.map(([label, value]) => (
        <Swatch key={label} label={label} value={value} />
      ))}
    </Grid>
  </>
)

// Expand a nested token group (e.g. colors.brand) into prefixed entries.
const group = (prefix: string, obj: Record<string | number, string>): Entry[] =>
  Object.entries(obj).map(([k, v]) => [`${prefix}.${k}`, v])

export const Colors: StoryObj = {
  render: () => (
    <Page>
      <Intro>
        Every color in EnsuredUI is sourced from these tokens in{' '}
        <code>src/xds/colors.ts</code>. Use <code>colors.*</code> directly, and{' '}
        <code>withAlpha(colors.x, alpha)</code> for translucent variants — never
        hand-write hex or rgba literals in components or pages.
      </Intro>

      <Section
        title="Primary"
        note="Brand-blue family. `onPrimary` sits on a solid `primary` fill; container tones use `onPrimaryContainer`."
        entries={[
          ['primary', colors.primary],
          ['primarySoft', colors.primarySoft],
          ['primaryContainer', colors.primaryContainer],
          ['onPrimary', colors.onPrimary],
          ['onPrimaryContainer', colors.onPrimaryContainer]
        ]}
      />

      <Section
        title="Secondary & Accent"
        note="Green / teal-green ramps, distinct from each other and from semantic `success`."
        entries={[
          ['secondary', colors.secondary],
          ['secondaryContainer', colors.secondaryContainer],
          ['onSecondaryContainer', colors.onSecondaryContainer],
          ['accent', colors.accent],
          ['accentStrong', colors.accentStrong]
        ]}
      />

      <Section
        title="Status / Semantic"
        note="State colors. `dangerBright` / `errorSoft` are the dark-theme variants used on dashboard surfaces."
        entries={[
          ['success', colors.success],
          ['info', colors.info],
          ['warning', colors.warning],
          ['danger', colors.danger],
          ['dangerBright', colors.dangerBright],
          ['error', colors.error],
          ['errorSoft', colors.errorSoft],
          ['errorContainer', colors.errorContainer],
          ['onErrorContainer', colors.onErrorContainer],
          ['tertiaryContainer', colors.tertiaryContainer]
        ]}
      />

      <Section
        title="Surfaces"
        note="Background, scrim, the dark-blue surface ramp (deep → elevated), and the surfaceContainer scale."
        entries={[
          ['background', colors.background],
          ['surface', colors.surface],
          ['scrim', colors.scrim],
          ['surfaceDeep', colors.surfaceDeep],
          ['surfaceLow', colors.surfaceLow],
          ['surfacePanel', colors.surfacePanel],
          ['surfaceRaised', colors.surfaceRaised],
          ['surfaceHigh', colors.surfaceHigh],
          ['surfaceElevated', colors.surfaceElevated],
          ['surfaceContainerLow', colors.surfaceContainerLow],
          ['surfaceContainer', colors.surfaceContainer],
          ['surfaceContainerHigh', colors.surfaceContainerHigh],
          ['surfaceContainerHighest', colors.surfaceContainerHighest]
        ]}
      />

      <Section
        title="Text & On-Surface"
        note="Foreground colors for text/icons on dark surfaces, brightest → most muted."
        entries={[
          ['onSurface', colors.onSurface],
          ['onSurfaceStrong', colors.onSurfaceStrong],
          ['onSurfaceVariant', colors.onSurfaceVariant],
          ['onSurfaceMuted', colors.onSurfaceMuted],
          ...group('text', colors.text)
        ]}
      />

      <Section
        title="Outlines & Anchors"
        entries={[
          ['outline', colors.outline],
          ['outlineVariant', colors.outlineVariant],
          ['border', colors.border],
          ['black', colors.black],
          ['white', colors.white]
        ]}
      />

      <Section
        title="Brand (ramp)"
        note="Indigo scale 50 → 900."
        entries={group('brand', colors.brand)}
      />

      <Section
        title="Neutral (ramp)"
        note="Slate scale 0 → 900."
        entries={group('neutral', colors.neutral)}
      />

      <Section
        title="Data Visualization"
        note="Categorical palette for chart series — `colors.dataViz.*`."
        entries={group('dataViz', colors.dataViz)}
      />

      <Section
        title="Vendor / Provider Brand"
        note="Third-party brand identity (Google / Microsoft / AWS / Facebook). The only intentionally non-semantic colors — use solely for provider logos & sign-in affordances."
        entries={group('vendor', colors.vendor)}
      />
    </Page>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Every token group renders.
    await expect(canvas.getByText('Primary')).toBeInTheDocument()
    await expect(canvas.getByText('Data Visualization')).toBeInTheDocument()
    await expect(canvas.getByText('Vendor / Provider Brand')).toBeInTheDocument()
    // Representative swatches across scalar, nested and vendor groups.
    await expect(canvas.getByText('primarySoft')).toBeInTheDocument()
    await expect(canvas.getByText('dataViz.blue')).toBeInTheDocument()
    await expect(canvas.getByText('vendor.googleBlue')).toBeInTheDocument()
  }
}
