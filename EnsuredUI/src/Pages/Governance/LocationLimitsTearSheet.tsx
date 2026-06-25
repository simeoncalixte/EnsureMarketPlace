import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import Drawer from '../../xds/components/Drawer'
import Select from '../../xds/components/Select'
import NumberInput from '../../xds/components/NumberInput'
import Input from '../../xds/components/Input'
import Button from '../../xds/components/Button'
import Badge from '../../xds/components/Badge'
import ProgressBar from '../../xds/components/ProgressBar'
import { colors } from '../../xds/colors'
import { parseRegionRef } from '../../xds/components/regionAppetite'
import { OptionSelect } from './governanceShared'
import {
  upsertLocationLimit,
  deleteLocationLimit,
  type LocationLimit,
  type LocationUtilization,
} from '../../api/governance'

const Field = styled.div`
  display: grid;
  gap: 6px;
`

const FieldLabel = styled.label`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
  color: ${colors.onSurfaceVariant};
`

const Hint = styled.div`
  font-size: 12px;
  color: ${colors.onSurfaceVariant};
`

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

const LEVEL_LABEL: Record<string, string> = { country: 'Country', state: 'State / province', city: 'City' }

export type LocationLimitsTearSheetProps = {
  open: boolean
  /** Encoded jurisdiction ref being edited, e.g. 'US/Florida'. */
  entry: string | null
  organizationId: number
  /** Active capacity definition the limit belongs to. */
  capacityDefinitionId: number
  /** LOB picker options (includes a leading {'*','All lines'}). */
  lobOptions: { value: string; label: string }[]
  /** All limits for the definition (filtered here by entry + selected LOB). */
  limits: LocationLimit[]
  /** Capacity rows so the sheet can show live utilization for the entry × LOB. */
  capacityRegions: LocationUtilization[]
  currency: string
  onClose: () => void
  onSaved: () => void
}

/**
 * Right-drawer tear sheet that sets per-location capacity limits, scoped by line
 * of business. Switching the LOB selector loads that LOB's stored caps for the
 * location — i.e. "set line of business per location."
 */
export const LocationLimitsTearSheet: React.FC<LocationLimitsTearSheetProps> = ({
  open,
  entry,
  organizationId,
  capacityDefinitionId,
  lobOptions,
  limits,
  capacityRegions,
  currency,
  onClose,
  onSaved,
}) => {
  const parsed = entry ? parseRegionRef(entry) : null
  const [lob, setLob] = useState<string>('*')
  const [maxLineSize, setMaxLineSize] = useState<string>('')
  const [aggregateLimit, setAggregateLimit] = useState<string>('')
  const [perOccurrenceLimit, setPerOccurrenceLimit] = useState<string>('')
  const [appetiteStance, setAppetiteStance] = useState<string>('')
  const [minimumPremium, setMinimumPremium] = useState<string>('')
  const [minRateOnLine, setMinRateOnLine] = useState<string>('')
  const [referralThreshold, setReferralThreshold] = useState<string>('')
  const [effectiveFrom, setEffectiveFrom] = useState<string>('')
  const [effectiveTo, setEffectiveTo] = useState<string>('')
  const [busy, setBusy] = useState(false)

  // The stored limit for this (entry × LOB), if any.
  const existing = useMemo(
    () =>
      entry
        ? limits.find((l) => l.entry.toLowerCase() === entry.toLowerCase() && l.lineOfBusinessCode === lob) ?? null
        : null,
    [limits, entry, lob],
  )

  const utilization = useMemo(
    () =>
      entry
        ? capacityRegions.find((r) => r.entry.toLowerCase() === entry.toLowerCase() && r.lineOfBusinessCode === lob) ??
          null
        : null,
    [capacityRegions, entry, lob],
  )

  // Reset the LOB selection each time a different region is opened.
  useEffect(() => {
    if (open) setLob('*')
  }, [entry, open])

  // Load the selected (entry × LOB) limit into the inputs.
  useEffect(() => {
    const money = (v: string | null | undefined) => (v != null ? String(Number(v)) : '')
    setMaxLineSize(money(existing?.maxLineSize))
    setAggregateLimit(money(existing?.aggregateLimit))
    setPerOccurrenceLimit(money(existing?.perOccurrenceLimit))
    setMinimumPremium(money(existing?.minimumPremium))
    setMinRateOnLine(money(existing?.minRateOnLine))
    setReferralThreshold(money(existing?.referralThreshold))
    setAppetiteStance(existing?.appetiteStance ?? '')
    setEffectiveFrom(existing?.effectiveFrom ?? '')
    setEffectiveTo(existing?.effectiveTo ?? '')
  }, [existing, entry, lob])

  if (!entry || !parsed) return <Drawer open={false} onClose={onClose} />

  const save = async () => {
    setBusy(true)
    try {
      const numOrNull = (v: string) => (v === '' ? null : Number(v))
      await upsertLocationLimit(organizationId, capacityDefinitionId, {
        entry,
        lineOfBusinessCode: lob,
        maxLineSize: numOrNull(maxLineSize),
        aggregateLimit: numOrNull(aggregateLimit),
        perOccurrenceLimit: numOrNull(perOccurrenceLimit),
        minimumPremium: numOrNull(minimumPremium),
        minRateOnLine: numOrNull(minRateOnLine),
        referralThreshold: numOrNull(referralThreshold),
        appetiteStance: appetiteStance || null,
        effectiveFrom: effectiveFrom || null,
        effectiveTo: effectiveTo || null,
        currency,
      })
      onSaved()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!existing) {
      onClose()
      return
    }
    setBusy(true)
    try {
      await deleteLocationLimit(organizationId, existing.id)
      onSaved()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const pct = utilization?.utilizationPct ?? null
  const tone = pct == null ? 'neutral' : pct >= 85 ? 'danger' : pct >= 60 ? 'tertiary' : 'gain'

  return (
    <Drawer
      open={open}
      title={entry}
      subtitle={`${LEVEL_LABEL[parsed.kind] ?? parsed.kind} · capacity limits per line of business`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={remove} disabled={busy || !existing}>
            Remove
          </Button>
          <Button variant="primary" onClick={save} disabled={busy} style={{ marginLeft: 'auto' }}>
            {busy ? 'Saving…' : 'Save limits'}
          </Button>
        </>
      }
    >
      <Field>
        <FieldLabel>Line of business</FieldLabel>
        <Select value={lob} onChange={(e) => setLob(e.target.value)} aria-label="Line of business">
          {lobOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Hint>Limits apply to this line for {entry}. Switch lines to set each independently.</Hint>
      </Field>

      <Field>
        <FieldLabel>Appetite stance</FieldLabel>
        <OptionSelect
          organizationId={organizationId}
          optionKey="governance.appetite.stance"
          value={appetiteStance}
          onChange={setAppetiteStance}
          includeBlank="— Inherit definition —"
        />
        <Hint>Graded appetite for this line in {entry}. Inherits the capacity definition when unset.</Hint>
      </Field>

      <Field>
        <FieldLabel>Max line size · per risk ({currency})</FieldLabel>
        <NumberInput
          value={maxLineSize}
          min={0}
          placeholder="e.g. 5000000"
          style={{ width: '100%' }}
          onChange={(e) => setMaxLineSize(e.target.value)}
        />
      </Field>

      <Field>
        <FieldLabel>Per-occurrence limit · single event ({currency})</FieldLabel>
        <NumberInput
          value={perOccurrenceLimit}
          min={0}
          placeholder="e.g. 10000000"
          style={{ width: '100%' }}
          onChange={(e) => setPerOccurrenceLimit(e.target.value)}
        />
      </Field>

      <Field>
        <FieldLabel>Aggregate cap · accumulation ({currency})</FieldLabel>
        <NumberInput
          value={aggregateLimit}
          min={0}
          placeholder="e.g. 50000000"
          style={{ width: '100%' }}
          onChange={(e) => setAggregateLimit(e.target.value)}
        />
        {pct != null ? (
          <ProgressBar
            value={pct}
            max={100}
            tone={tone as any}
            size="sm"
            label={`${pct}% used · ${fmtMoney(utilization?.deployed)} of ${fmtMoney(utilization?.aggregateLimit)} deployed`}
          />
        ) : (
          <Hint>Set an aggregate cap to track capacity utilization here.</Hint>
        )}
        {utilization && utilization.inFlightExposure === 0 && pct != null && (
          <Badge variant="neutral">Bound exposure only — in-flight not yet counted</Badge>
        )}
      </Field>

      <Field>
        <FieldLabel>Referral threshold · line size ({currency})</FieldLabel>
        <NumberInput
          value={referralThreshold}
          min={0}
          placeholder="e.g. 2500000"
          style={{ width: '100%' }}
          onChange={(e) => setReferralThreshold(e.target.value)}
        />
        <Hint>Refer any risk whose line size exceeds this here.</Hint>
      </Field>

      <TwoCol>
        <Field>
          <FieldLabel>Minimum premium ({currency})</FieldLabel>
          <NumberInput
            value={minimumPremium}
            min={0}
            placeholder="e.g. 25000"
            style={{ width: '100%' }}
            onChange={(e) => setMinimumPremium(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>Min rate-on-line (%)</FieldLabel>
          <NumberInput
            value={minRateOnLine}
            min={0}
            placeholder="e.g. 2.5"
            style={{ width: '100%' }}
            onChange={(e) => setMinRateOnLine(e.target.value)}
          />
        </Field>
      </TwoCol>

      <Field>
        <FieldLabel>Effective window</FieldLabel>
        <TwoCol>
          <Input
            type="date"
            aria-label="Effective from"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
          <Input
            type="date"
            aria-label="Effective to"
            value={effectiveTo}
            onChange={(e) => setEffectiveTo(e.target.value)}
          />
        </TwoCol>
        <Hint>Optional — e.g. suspend new binding here during a high-risk season.</Hint>
      </Field>
    </Drawer>
  )
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n)}`
}

export default LocationLimitsTearSheet
