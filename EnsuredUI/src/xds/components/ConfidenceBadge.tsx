import React from 'react'
import Badge, { type XdsBadgeVariant } from './Badge'

/**
 * The credibility classification of a priced submission, as emitted by the
 * risk-compute backend. `null`/absent means a legacy (un-classified) row.
 */
export type ConfidenceLabel = 'benchmark_low' | 'developing' | 'credible'

export type ConfidenceBadgeProps = {
  /** Backend credibility label. null/undefined/unknown renders nothing. */
  confidenceLabel?: ConfidenceLabel | string | null
  /** Optional citation (e.g. priorSource) surfaced via the native title tooltip. */
  title?: string
  className?: string
}

type ConfidenceTone = { variant: XdsBadgeVariant; label: string }

/**
 * Pure mapping: confidenceLabel -> Badge variant + human label.
 * Anything not in this map is treated as unknown and renders nothing.
 */
const CONFIDENCE_TONES: Record<ConfidenceLabel, ConfidenceTone> = {
  credible: { variant: 'success', label: 'Credible' },
  developing: { variant: 'info', label: 'Developing' },
  benchmark_low: { variant: 'warning', label: 'Benchmark' }
}

/**
 * Tiny, props-only badge that visualizes pricing credibility.
 * Returns null for null/unknown labels so legacy rows render unchanged.
 */
export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidenceLabel,
  title,
  className
}) => {
  if (!confidenceLabel) {
    return null
  }

  const tone = CONFIDENCE_TONES[confidenceLabel as ConfidenceLabel]
  if (!tone) {
    return null
  }

  return (
    <span title={title} className={className}>
      <Badge variant={tone.variant} dot>
        {tone.label}
      </Badge>
    </span>
  )
}

export default ConfidenceBadge
