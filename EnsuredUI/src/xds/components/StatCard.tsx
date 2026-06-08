import React from 'react'
import styled from 'styled-components'
import { colors } from '../colors'

/**
 * Tone presets for the optional note line. Maps to a semantic color.
 * `default` falls back to the same color as the delta line (secondary).
 */
export type XdsStatCardTone = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'muted'

export type XdsStatCardProps = {
  /** Small uppercase label rendered above the value. */
  label: string
  /** Primary value. Combined with optional currencyPrefix/suffix when rendered. */
  value: string
  /** Optional delta line rendered below the value (existing behavior, preserved). */
  delta?: string
  /** Optional note line rendered below the delta. Accepts arbitrary nodes. */
  note?: React.ReactNode
  /** Explicit color for the note line. Overrides `tone` when provided. */
  noteColor?: string
  /** Semantic tone for the note line. Ignored when `noteColor` is set. */
  tone?: XdsStatCardTone
  /** Optional prefix rendered immediately before the value (e.g. "$"). */
  currencyPrefix?: string
  /** Optional suffix rendered immediately after the value (e.g. "%", "M"). */
  suffix?: string
  /** Optional passthrough className for layout composition by callers. */
  className?: string
}

const toneColorMap: Record<XdsStatCardTone, string> = {
  default: colors.secondary,
  success: colors.success,
  danger: colors.danger,
  warning: colors.warning,
  info: colors.info,
  muted: colors.onSurfaceVariant
}

const Root = styled.div``

const Label = styled.div`
  font-size: 10px;
  font-family: ui-monospace, Menlo, monospace;
  text-transform: uppercase;
  color: ${colors.onSurfaceVariant};
`

const Value = styled.div`
  font-size: 28px;
  font-weight: 800;
  color: ${colors.text.primary};
`

const Affix = styled.span`
  font-weight: 800;
`

const Delta = styled.div`
  font-size: 12px;
  color: ${colors.secondary};
  font-family: ui-monospace, Menlo, monospace;
`

const Note = styled.div<{ $color: string }>`
  font-size: 12px;
  color: ${(p) => p.$color};
  font-family: ui-monospace, Menlo, monospace;
`

export const StatCard: React.FC<XdsStatCardProps> = ({
  label,
  value,
  delta,
  note,
  noteColor,
  tone = 'default',
  currencyPrefix,
  suffix,
  className
}) => {
  const resolvedNoteColor = noteColor ?? toneColorMap[tone]
  return (
    <Root className={className}>
      <Label>{label}</Label>
      <Value>
        {currencyPrefix ? <Affix>{currencyPrefix}</Affix> : null}
        {value}
        {suffix ? <Affix>{suffix}</Affix> : null}
      </Value>
      {delta ? <Delta>{delta}</Delta> : null}
      {note != null && note !== false ? <Note $color={resolvedNoteColor}>{note}</Note> : null}
    </Root>
  )
}

export default StatCard
