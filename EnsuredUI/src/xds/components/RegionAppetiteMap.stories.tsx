import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect, waitFor } from '@storybook/test'
import RegionAppetiteMap from './RegionAppetiteMap'
import {
  cycleStanceFor,
  deriveInclusion,
  deriveRegionRef,
  granularityForZoom,
  normalizeStance,
  parseRegionRef,
  setStance,
  stanceOf,
  type JurisdictionStances,
  type RegionSearchOption,
} from './regionAppetite'

// Deterministic mock for the injected search resolver (no backend in Storybook).
const mockSearch = async (q: string): Promise<RegionSearchOption[]> => {
  if (/^flo/i.test(q)) return [{ label: 'Florida', sublabel: 'US', entry: 'US/Florida' }]
  if (/^tam/i.test(q)) return [{ label: 'Tampa', sublabel: 'Florida, US', entry: 'US/Florida/Tampa' }]
  return []
}

const serialize = (s: JurisdictionStances): string =>
  Object.entries(s)
    .map(([entry, stance]) => `${entry}:${stance}`)
    .join(', ') || '—'

/**
 * Stateful host so the map round-trips through real stance state, plus a readout
 * of the current map for the interaction test to assert against.
 */
const Host: React.FC<{ stances?: JurisdictionStances; withSearch?: boolean }> = ({
  stances: s0 = {},
  withSearch = false,
}) => {
  const [stances, setStances] = useState<JurisdictionStances>(s0)
  return (
    <div style={{ background: '#071129', padding: 24, maxWidth: 920 }}>
      <RegionAppetiteMap
        stances={stances}
        onStancesChange={setStances}
        onSearch={withSearch ? mockSearch : undefined}
      />
      <div data-testid="readout" style={{ marginTop: 12, color: '#adc6ff', fontFamily: 'monospace', fontSize: 12 }}>
        stances={serialize(stances)}
      </div>
      {/* Out-of-band control lets the interaction test exercise the pure stance
          cycle deterministically, without depending on Mapbox tiles loading. */}
      <button data-testid="cycle-us" onClick={() => setStances((cur) => cycleStanceFor('US', cur))}>
        cycle US
      </button>
    </div>
  )
}

const meta: Meta<typeof RegionAppetiteMap> = {
  title: 'XDS/RegionAppetiteMap',
  component: RegionAppetiteMap,
  parameters: { layout: 'fullscreen' },
}
export default meta

type Story = StoryObj<typeof RegionAppetiteMap>

export const Empty: Story = {
  render: () => <Host />,
}

export const WithSelection: Story = {
  render: () => <Host stances={{ US: 'target', GB: 'acceptable', RU: 'decline' }} />,
}

export const PreservesSubCountryEntries: Story = {
  render: () => <Host stances={{ US: 'target', 'US/Florida': 'restricted' }} />,
}

export const WithSearch: Story = {
  render: () => <Host withSearch stances={{ US: 'target', RU: 'decline' }} />,
}

/**
 * Search → pick → the encoded entry is added to the appetite at the Target stance
 * (its boundary would then be fetched + drawn). Uses the mock resolver; no Mapbox.
 */
export const AddViaSearch: Story = {
  render: () => <Host withSearch />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const readout = canvas.getByTestId('readout')

    const input = canvas.getByLabelText(/search for a region to add/i)
    await userEvent.type(input, 'Flo')
    const option = await canvas.findByText('Florida')
    await userEvent.click(option)

    await waitFor(() => expect(readout).toHaveTextContent('US/Florida:target'))
    await expect(canvas.getByText(/Target \(1\)/)).toBeInTheDocument()
  },
}

/** Pure region-ref + stance logic — asserted directly. */
export const RegionRefLogic: Story = {
  render: () => <Host />,
  play: async () => {
    // parse: country / state / city granularity
    await expect(parseRegionRef('US')).toMatchObject({ kind: 'country', ref: 'US' })
    await expect(parseRegionRef('US/Florida')).toMatchObject({ kind: 'state', ref: 'Florida', countryCode: 'US' })
    await expect(parseRegionRef('us/Florida/Tampa')).toMatchObject({
      kind: 'city',
      ref: 'Tampa',
      state: 'Florida',
      countryCode: 'US',
    })

    // derive: build the encoded entry from a geocoded place
    await expect(deriveRegionRef({ countryCode: 'us', state: 'Florida', city: 'Tampa' })).toBe('US/Florida/Tampa')
    await expect(deriveRegionRef({ countryCode: 'US' })).toBe('US')
    await expect(deriveRegionRef({ state: 'Florida' })).toBeNull()

    // zoom → click granularity
    await expect(granularityForZoom(1.1)).toBe('country')
    await expect(granularityForZoom(4)).toBe('state')
    await expect(granularityForZoom(6.5)).toBe('city')

    // normalizeStance: known stances pass through (case-insensitive), else null
    await expect(normalizeStance('target')).toBe('target')
    await expect(normalizeStance('  Decline ')).toBe('decline')
    await expect(normalizeStance('bogus')).toBeNull()

    // setStance / stanceOf round-trip (case-insensitive lookup)
    const s1 = setStance('US/Florida', 'restricted', {})
    await expect(stanceOf('us/florida', s1)).toBe('restricted')
    await expect(stanceOf('US/Florida', setStance('US/Florida', null, s1))).toBeNull()

    // deriveInclusion: target/acceptable → preferred, decline → excluded, refer/restricted → neither
    const inclusion = deriveInclusion({ US: 'target', GB: 'acceptable', FR: 'refer', RU: 'decline', CN: 'restricted' })
    await expect(inclusion.preferred.sort()).toEqual(['GB', 'US'])
    await expect(inclusion.excluded).toEqual(['RU'])
  },
}

/**
 * Deterministic test of the stance ramp cycle and the legend counts. Mapbox canvas
 * interactions are not asserted (they need WebGL + tile loads); the cycle logic is
 * driven through the out-of-band control instead.
 */
export const CycleInteraction: Story = {
  render: () => <Host />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const readout = canvas.getByTestId('readout')
    const cycle = canvas.getByTestId('cycle-us')

    // Legend starts at zero across all stances.
    await expect(canvas.getByText(/Target \(0\)/)).toBeInTheDocument()
    await expect(canvas.getByText(/Decline \(0\)/)).toBeInTheDocument()

    // neutral → target
    await userEvent.click(cycle)
    await waitFor(() => expect(readout).toHaveTextContent('US:target'))
    await expect(canvas.getByText(/Target \(1\)/)).toBeInTheDocument()

    // target → acceptable
    await userEvent.click(cycle)
    await waitFor(() => expect(readout).toHaveTextContent('US:acceptable'))
    await expect(canvas.getByText(/Acceptable \(1\)/)).toBeInTheDocument()
  },
}

/**
 * Single view: the map colours regions by appetite stance, and capacity
 * utilization shows inline beside each overlay row (no separate layer toggle).
 * Clicking a row opens its Regional settings. (Needs a Mapbox token to render.)
 */
export const WithCapacityUtilization: Story = {
  render: () => (
    <div style={{ background: '#071129', padding: 24, maxWidth: 920 }}>
      <RegionAppetiteMap
        stances={{
          'US/Florida': 'target',
          'US/Texas': 'acceptable',
          'US/Louisiana': 'restricted',
          'US/California': 'refer',
          'US/New York': 'decline',
        }}
        onStancesChange={() => {}}
        onOpenLimits={() => {}}
        utilizationByEntry={{
          'us/florida': 92,
          'us/texas': 68,
          'us/louisiana': 35,
        }}
      />
    </div>
  ),
}
