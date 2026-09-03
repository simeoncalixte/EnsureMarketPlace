import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import Button from '../../xds/components/Button'
import SegmentedSwitch from '../../xds/components/SegmentedSwitch'
import Badge from '../../xds/components/Badge'
import MetricCard from '../../xds/components/MetricCard'
import KanbanBoard, { KanbanStage, KanbanItem } from '../../xds/components/KanbanBoard'
import ConfidenceBadge, { type ConfidenceLabel } from '../../xds/components/ConfidenceBadge'
import { radii, typography } from '../../xds/tokens'
import { colors, withAlpha } from '../../xds/colors'
import { getSubmissions, updateSubmissionStatus, saveSubmissionsConfig } from '../../api/underwriting'
import { Link, useNavigate } from 'react-router'
import { CREATE_COVERAGE_PATH, createDealSubmissionSeed } from '../InsurerDashboard/createCoverageNavigation'

type SubmissionStatus = 'new' | 'triage' | 'underwriting' | 'approved'
type SubmissionPriority = 'urgent' | 'high' | 'normal'

type Submission = {
  id: string
  cedent: string
  lineOfBusiness: string
  region: string
  premium: number
  exposure: number
  receivedLabel: string
  owner: string
  status: SubmissionStatus
  priority: SubmissionPriority
  notes: string
  source: string
}

const initialSubmissions: Submission[] = [
  {
    id: 'SUB-8401',
    cedent: 'Northwind Specialty',
    lineOfBusiness: 'Property Cat',
    region: 'Gulf Coast',
    premium: 12800000,
    exposure: 250000000,
    receivedLabel: '12 min ago',
    owner: 'Maya Chen',
    status: 'new',
    priority: 'urgent',
    notes: 'Wind corridor concentration is above normal. Awaiting catastrophe model output.',
    source: 'Email SSO',
  },
  {
    id: 'SUB-8405',
    cedent: 'Cobalt Marine',
    lineOfBusiness: 'Marine Cargo',
    region: 'APAC',
    premium: 5400000,
    exposure: 78000000,
    receivedLabel: '31 min ago',
    owner: 'Ishan Patel',
    status: 'triage',
    priority: 'high',
    notes: 'Requires vessel schedule confirmation and updated cargo valuation.',
    source: 'API Upload',
  },
  {
    id: 'SUB-8411',
    cedent: 'Aster Logistics',
    lineOfBusiness: 'Trade Credit',
    region: 'North America',
    premium: 7600000,
    exposure: 140000000,
    receivedLabel: '43 min ago',
    owner: 'Renee Brooks',
    status: 'underwriting',
    priority: 'high',
    notes: 'Pricing nearly complete; exposure ladder needs a final structure review.',
    source: 'Portal',
  },
  {
    id: 'SUB-8420',
    cedent: 'Sable Energy',
    lineOfBusiness: 'Energy Liability',
    region: 'LatAm',
    premium: 9200000,
    exposure: 185000000,
    receivedLabel: '1h ago',
    owner: 'Noah Singh',
    status: 'approved',
    priority: 'normal',
    notes: 'Approved with standard wording and a 5% subject premium load.',
    source: 'Broker API',
  },
  {
    id: 'SUB-8428',
    cedent: 'Helio Renewables',
    lineOfBusiness: 'Construction All Risk',
    region: 'EMEA',
    premium: 4100000,
    exposure: 62000000,
    receivedLabel: '2h ago',
    owner: 'Mira Tan',
    status: 'new',
    priority: 'normal',
    notes: 'Large portfolio but well diversified. Needs schedule validation.',
    source: 'Email SSO',
  },
  {
    id: 'SUB-8433',
    cedent: 'BluePeak Re',
    lineOfBusiness: 'Cyber',
    region: 'Global',
    premium: 15000000,
    exposure: 95000000,
    receivedLabel: '2h ago',
    owner: 'Elena Garcia',
    status: 'triage',
    priority: 'urgent',
    notes: 'Need attachment point confirmation and vendor breach history.',
    source: 'Portal',
  },
  {
    id: 'SUB-8439',
    cedent: 'Harbor Infrastructure',
    lineOfBusiness: 'Public Entity',
    region: 'North America',
    premium: 6800000,
    exposure: 115000000,
    receivedLabel: '4h ago',
    owner: 'Samir Desai',
    status: 'underwriting',
    priority: 'normal',
    notes: 'Cat layer structure approved; waiting on final signer list.',
    source: 'API Upload',
  },
  {
    id: 'SUB-8447',
    cedent: 'Aurora Health',
    lineOfBusiness: 'Professional Liability',
    region: 'EMEA',
    premium: 3200000,
    exposure: 49000000,
    receivedLabel: '6h ago',
    owner: 'Talia Reed',
    status: 'approved',
    priority: 'normal',
    notes: 'Final terms issued and ready for downstream activation.',
    source: 'Portal',
  },
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

// rateOnLine is a 0..1 fraction from the backend; surface it as a percent (e.g. 0.0317 -> "3.17%").
function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

const PageShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`

const HeroPanel = styled.section`
  position: relative;
  overflow: hidden;
  padding: 1.5rem;
  border-radius: 28px;
  border: 1px solid ${withAlpha(colors.neutral[400], 0.12)};
  background:
    radial-gradient(circle at top right, ${withAlpha(colors.primary, 0.26)}, transparent 30%),
    linear-gradient(135deg, ${withAlpha(colors.surfaceDeep, 0.98)}, ${withAlpha(colors.surfaceDeep, 0.76)});
  box-shadow: 0 24px 60px ${withAlpha(colors.scrim, 0.35)};
`

const HeroInner = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1.25rem;
  align-items: flex-start;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
`

const Eyebrow = styled.div`
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: ${colors.primarySoft};
  margin-bottom: 0.7rem;
`

const HeroTitle = styled.h1`
  margin: 0;
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: clamp(1.8rem, 3vw, 2.7rem);
  line-height: 1.05;
  color: ${colors.primaryContainer};
`

const HeroCopy = styled.p`
  margin: 0.8rem 0 0;
  max-width: 62ch;
  color: ${withAlpha(colors.onSurfaceStrong, 0.78)};
  line-height: 1.6;
`

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
  align-items: center;
`

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;

  @media (max-width: 1080px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const WorkspacePanel = styled.section`
  border-radius: 28px;
  border: 1px solid ${withAlpha(colors.neutral[400], 0.12)};
  background: ${withAlpha(colors.background, 0.72)};
  box-shadow: 0 24px 60px ${withAlpha(colors.scrim, 0.28)};
  padding: 1.2rem;
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`

const ToolbarMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
`

const TableShell = styled.div`
  overflow-x: auto;
  border-radius: 20px;
  border: 1px solid ${withAlpha(colors.neutral[400], 0.1)};
`

const SubmissionsTable = styled.table`
  width: 100%;
  min-width: 1120px;
  border-collapse: collapse;
  background: ${withAlpha(colors.surfaceDeep, 0.72)};
`

const TableHeadCell = styled.th`
  padding: 0.9rem 0.95rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: ${colors.onSurfaceVariant};
  text-align: left;
  background: ${withAlpha(colors.onSurface, 0.02)};
`

const TableRow = styled.tr<{ $clickable?: boolean }>`
  border-top: 1px solid ${withAlpha(colors.neutral[400], 0.08)};
  transition: background 160ms ease, transform 160ms ease;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};

  &:hover {
    background: ${withAlpha(colors.primary, 0.05)};
  }

  &:focus-visible {
    outline: 2px solid ${withAlpha(colors.primary, 0.6)};
    outline-offset: -2px;
  }
`

const TableCell = styled.td`
  padding: 0.95rem;
  vertical-align: top;
  color: ${colors.onSurfaceStrong};
`

const RowMeta = styled.div`
  color: ${colors.onSurfaceVariant};
  font-size: 0.82rem;
`

const SubmissionCard = styled.article<{ $accent: string }>`
  position: relative;
  overflow: hidden;
  padding: 1rem;
  background: ${colors.surfacePanel};
  border: 1px solid ${withAlpha(colors.onSurface, 0.15)};
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  user-select: none;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${withAlpha(colors.primary, 0.6)};
    outline-offset: 2px;
  }

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: ${({ $accent }) => $accent};
  }

  &:hover {
    border-color: ${withAlpha(colors.primary, 0.5)};
    box-shadow: 0 16px 28px ${withAlpha(colors.scrim, 0.24)};
    transform: translateY(-1px);
  }
`

const CardTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`

const CardTitleLink = styled(Link)`
  display: inline-block;
  margin-bottom: 0.2rem;
  color: ${colors.primaryContainer};
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.4;
  text-decoration: none;

  &:hover,
  &:focus-visible {
    color: ${colors.primarySoft};
    text-decoration: underline;
  }
`

const CardMeta = styled.div`
  color: ${colors.onSurfaceVariant};
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  line-height: 1.2;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const CardFacts = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem 0.6rem;
  padding: 0.85rem 0;
  margin: 0.7rem 0 1rem;
  border-top: 1px solid ${withAlpha(colors.onSurface, 0.05)};
  border-bottom: 1px solid ${withAlpha(colors.onSurface, 0.05)};
`

const Fact = styled.div`
  min-width: 0;
`

const FactLabel = styled.div`
  margin-bottom: 0.25rem;
  color: ${colors.onSurfaceVariant};
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`

const FactValue = styled.div`
  color: ${colors.onSurfaceStrong};
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: 0.02em;
`

const CardFooter = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const EmptyState = styled.div`
  display: flex;
  min-height: 16rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem 1rem;
  border: 2px dashed ${withAlpha(colors.onSurface, 0.05)};
  border-radius: 8px;
  color: ${colors.neutral[500]};
  text-align: center;
`

const CardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const CardBodyLine = styled.div`
  color: ${colors.onSurfaceVariant};
  font-size: 0.84rem;
  line-height: 1.45;
`

const CardBodyLabel = styled.span`
  color: ${colors.onSurfaceStrong};
  font-weight: 700;
`

const ConfigPanel = styled.div`
  margin-bottom: 1rem;
  border-radius: 24px;
  border: 1px solid ${withAlpha(colors.neutral[400], 0.12)};
  background: linear-gradient(135deg, ${withAlpha(colors.surfaceDeep, 0.94)}, ${withAlpha(colors.surfaceDeep, 0.74)});
  padding: 1rem;
  box-shadow: 0 16px 36px ${withAlpha(colors.scrim, 0.2)};
`

const ConfigHead = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
`

const ConfigEyebrow = styled.div`
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${colors.primarySoft};
  margin-bottom: 6px;
`

const ConfigCopy = styled.div`
  color: ${colors.onSurfaceStrong};
  font-size: 14px;
  line-height: 1.5;
  max-width: 72ch;
`

const ConfigActions = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`

const ConfigBanner = styled.div<{ $error: boolean }>`
  margin-top: 0.9rem;
  border-radius: 16px;
  border: 1px solid ${({ $error }) => ($error ? withAlpha(colors.error, 0.25) : withAlpha(colors.primary, 0.22))};
  background: ${({ $error }) => ($error ? withAlpha(colors.error, 0.08) : withAlpha(colors.primary, 0.08))};
  color: ${({ $error }) => ($error ? colors.errorSoft : colors.onSurfaceStrong)};
  padding: 0.85rem 1rem;
  font-size: 13px;
`

const FieldGrid = styled.div`
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
`

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const FieldLabel = styled.span`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${colors.onSurfaceVariant};
  font-weight: 700;
`

const FieldInput = styled.input`
  border-radius: 12px;
  border: 1px solid ${withAlpha(colors.neutral[400], 0.16)};
  background: ${colors.surfaceLow};
  color: ${colors.primaryContainer};
  padding: 0.8rem 0.9rem;
  outline: none;
`

const StatesRow = styled.div`
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
`

const StagePreviewGrid = styled.div`
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
`

const StageCard = styled.div<{ $border: string }>`
  border-radius: 20px;
  border: 1px solid ${({ $border }) => $border};
  background: ${withAlpha(colors.surfaceLow, 0.9)};
  padding: 0.9rem 1rem;
`

const StageCardHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
`

const StageCardTitle = styled.div`
  font-weight: 800;
  color: ${colors.primaryContainer};
`

const StageCardDesc = styled.div`
  margin-top: 4px;
  font-size: 12px;
  color: ${colors.onSurfaceVariant};
`

const StatusList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`

const ErrorState = styled.div`
  margin-bottom: 0.75rem;
`

const AdvanceButton = styled.button`
  border-radius: ${radii.md}px;
  border: 1px solid ${withAlpha(colors.primary, 0.18)};
  background: ${withAlpha(colors.primary, 0.1)};
  color: ${colors.primaryContainer};
  font-weight: ${typography.weights.semibold};
  font-family: Inter, system-ui, sans-serif;
  padding: 8px 14px;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    background: ${withAlpha(colors.neutral[400], 0.06)};
    color: ${colors.onSurfaceVariant};
  }
`

const ExportButton = styled.button`
  border-radius: ${radii.md}px;
  border: 1px solid ${withAlpha(colors.primary, 0.22)};
  background: ${withAlpha(colors.primary, 0.1)};
  color: ${colors.onSurfaceStrong};
  font-weight: ${typography.weights.semibold};
  font-family: Inter, system-ui, sans-serif;
  padding: 8px 14px;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`

type BoardFieldFormat = 'text' | 'currency' | 'number' | 'date' | 'badge'
type BoardFieldSection = 'facts' | 'body'

type BoardFieldDefinition = {
  key: string
  label: string
  valueKey: string
  format?: BoardFieldFormat
  section?: BoardFieldSection
  badgeSource?: 'priority' | 'stage'
}

type BoardHeaderDefinition = {
  titleFieldKey: string
  subtitleFieldKey?: string
  badgeFieldKey?: string
}

type BoardStageDefinition = {
  key: string
  label: string
  statuses: string[]
  accent: string
  background: string
  border: string
  description: string
  emptyState: string
}

type BoardConfig = {
  eyebrow: string
  title: string
  description: string
  header: BoardHeaderDefinition
  tableColumns: BoardFieldDefinition[]
  cardFields: BoardFieldDefinition[]
  stages: BoardStageDefinition[]
}

type BoardSummaryCard = {
  label: string
  value: number
  meta: string
  format: 'number' | 'currency'
}

type BoardItem = {
  id: number
  status: string
  stageKey: string
  stageLabel: string
  stageAccent: string
  stageBackground: string
  stageBorder: string
  nextStatus: string | null
  nextStageKey: string | null
  nextStageLabel: string | null
  nextStageAccent: string | null
  priority: 'urgent' | 'high' | 'normal'
  // Slice 5.4: risk-compute pricing fields are additive and null-safe; legacy rows omit them.
  values: Record<string, string | number | null> & {
    confidenceLabel?: ConfidenceLabel | string | null
    rateOnLine?: number | null
    expectedLoss?: number | null
    priorSource?: string | null
  }
}

type BoardResponse = {
  config: BoardConfig
  summary: BoardSummaryCard[]
  items: BoardItem[]
  refreshedAt: string
}

const PRIORITY_TONES = {
  urgent: { label: 'Urgent', background: withAlpha(colors.error, 0.12), border: withAlpha(colors.error, 0.25), color: colors.dangerBright },
  high: { label: 'High', background: withAlpha(colors.warning, 0.12), border: withAlpha(colors.warning, 0.25), color: colors.dataViz.amber },
  normal: { label: 'Normal', background: withAlpha(colors.primary, 0.10), border: withAlpha(colors.primary, 0.22), color: colors.primarySoft },
} as const

const SYSTEM_TONE = {
  background: withAlpha(colors.neutral[400], 0.08),
  border: withAlpha(colors.neutral[400], 0.2),
  color: colors.onSurfaceStrong,
}

// Slice 5.4: inline cluster placing the premium value alongside the
// ConfidenceBadge + rate-on-line adornment. Wraps gracefully in narrow cells.
const PremiumCluster = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
`

const RateOnLine = styled.span`
  color: ${colors.onSurfaceVariant};
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
`

const BoardToken = styled.span<{ $background: string; $border: string; $color: string }>`
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ $border }) => $border};
  background: ${({ $background }) => $background};
  color: ${({ $color }) => $color};
`


function renderBadgeLabel(item: BoardItem, field: BoardFieldDefinition, value: string | number | null): string {
  if (field.badgeSource === 'priority') {
    return PRIORITY_TONES[item.priority].label
  }

  if (field.badgeSource === 'stage') {
    return item.stageLabel
  }

  if (value === null || value === undefined || value === '') {
    return field.label
  }

  return String(value)
}

function renderBadgeTheme(item: BoardItem, field: BoardFieldDefinition): { background: string; border: string; color: string } {
  if (field.badgeSource === 'priority') {
    return PRIORITY_TONES[item.priority]
  }

  if (field.badgeSource === 'stage') {
    return {
      background: item.stageBackground,
      border: item.stageBorder,
      color: item.stageAccent,
    }
  }

  return SYSTEM_TONE
}

function renderValue(value: string | number | null | undefined, format?: BoardFieldFormat): string {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  if (format === 'currency' && typeof value === 'number') {
    return formatCurrency(value)
  }

  if (format === 'number' && typeof value === 'number') {
    return new Intl.NumberFormat('en-US').format(value)
  }

  if (format === 'date') {
    const date = new Date(String(value))
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    }
  }

  return String(value)
}

function getFieldByKey(config: BoardConfig, key: string): BoardFieldDefinition | undefined {
  return [...config.tableColumns, ...config.cardFields].find((field) => field.key === key || field.valueKey === key)
}

function groupCardFields(fields: BoardFieldDefinition[]) {
  return {
    facts: fields.filter((field) => field.section !== 'body'),
    body: fields.filter((field) => field.section === 'body'),
  }
}

function formatMetricValue(card: BoardSummaryCard): string {
  if (card.format === 'currency') {
    return formatCurrency(card.value)
  }

  return new Intl.NumberFormat('en-US').format(card.value)
}

const STAGE_TONES = [
  { accent: colors.primary, background: withAlpha(colors.primary, 0.12), border: withAlpha(colors.primary, 0.28) },
  { accent: colors.warning, background: withAlpha(colors.warning, 0.12), border: withAlpha(colors.warning, 0.28) },
  { accent: colors.dataViz.green, background: withAlpha(colors.dataViz.green, 0.12), border: withAlpha(colors.dataViz.green, 0.28) },
  { accent: colors.dataViz.purple, background: withAlpha(colors.dataViz.purple, 0.12), border: withAlpha(colors.dataViz.purple, 0.28) },
  { accent: colors.dataViz.orange, background: withAlpha(colors.dataViz.orange, 0.12), border: withAlpha(colors.dataViz.orange, 0.28) },
  { accent: colors.dataViz.teal, background: withAlpha(colors.dataViz.teal, 0.12), border: withAlpha(colors.dataViz.teal, 0.28) },
]

function slugifyStageKey(value: string): string {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return slug || 'custom_state'
}

function uniqueStageStateKey(baseKey: string, stages: BoardStageDefinition[]): string {
  const taken = new Set(stages.flatMap((stage) => [stage.key, ...stage.statuses]))
  let candidate = baseKey
  let suffix = 2

  while (taken.has(candidate)) {
    candidate = `${baseKey}_${suffix}`
    suffix += 1
  }

  return candidate
}

function stageTone(index: number) {
  return STAGE_TONES[index % STAGE_TONES.length]
}

function createStageDraft(label: string, stateKey: string, index: number): BoardStageDefinition {
  const tone = stageTone(index)
  const normalizedLabel = label.trim()

  return {
    key: stateKey,
    label: normalizedLabel,
    statuses: [stateKey],
    accent: tone.accent,
    background: tone.background,
    border: tone.border,
    description: `${normalizedLabel} submissions move through this backend-managed stage.`,
    emptyState: `No ${normalizedLabel.toLowerCase()} submissions yet.`,
  }
}

function collectAvailableStatuses(config: BoardConfig): string[] {
  return Array.from(new Set(config.stages.flatMap((stage) => stage.statuses))).filter(Boolean)
}

function getPrimaryStatusForStage(stage: BoardStageDefinition | undefined): string | null {
  return stage?.statuses[0] ?? null
}

function rebuildSummaryCards(summary: BoardSummaryCard[], items: BoardItem[], config: BoardConfig): BoardSummaryCard[] {
  const queueCount = items.length
  const finalStageKey = config.stages[config.stages.length - 1]?.key ?? null
  const pendingCount = finalStageKey ? items.filter((item) => item.stageKey !== finalStageKey).length : queueCount
  const urgentCount = items.filter((item) => item.priority === 'urgent').length
  const totalPremium = items.reduce((sum, item) => sum + Number(item.values.premium ?? 0), 0)
  const averagePremium = queueCount > 0 ? totalPremium / queueCount : 0

  return summary.map((card) => {
    if (card.label === 'Queue volume') {
      return { ...card, value: queueCount }
    }

    if (card.label === 'Pending review') {
      return { ...card, value: pendingCount }
    }

    if (card.label === 'Urgent flags') {
      return { ...card, value: urgentCount }
    }

    if (card.label === 'Average premium') {
      return { ...card, value: averagePremium }
    }

    return card
  })
}

function applySubmissionStageMove(board: BoardResponse, itemId: number, nextStatus: string, config: BoardConfig): BoardResponse | null {
  const targetStage = config.stages.find((stage) => stage.statuses.includes(nextStatus))
  if (!targetStage) {
    return null
  }

  const targetStageIndex = config.stages.findIndex((stage) => stage.key === targetStage.key)
  const nextStage = config.stages[targetStageIndex + 1] ?? null
  const nextStageStatus = getPrimaryStatusForStage(nextStage)

  const existingItem = board.items.find((item) => item.id === itemId)
  if (!existingItem) {
    return null
  }

  const updatedItems = board.items.map((item) => {
    if (item.id !== itemId) {
      return item
    }

    return {
      ...item,
      status: nextStatus,
      stageKey: targetStage.key,
      stageLabel: targetStage.label,
      stageAccent: targetStage.accent,
      stageBackground: targetStage.background,
      stageBorder: targetStage.border,
      nextStatus: nextStageStatus,
      nextStageKey: nextStage?.key ?? null,
      nextStageLabel: nextStage?.label ?? null,
      nextStageAccent: nextStage?.accent ?? null,
    }
  })

  return {
    ...board,
    items: updatedItems,
    summary: rebuildSummaryCards(board.summary, updatedItems, config),
    refreshedAt: new Date().toISOString(),
  }
}

export default function IncomingSubmissionsPage() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState(0)
  const [dashboard, setDashboard] = useState<BoardResponse | null>(null)
  const [draftConfig, setDraftConfig] = useState<BoardConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [newColumnLabel, setNewColumnLabel] = useState('')
  const [newColumnStateKey, setNewColumnStateKey] = useState('')
  const [newColumnDescription, setNewColumnDescription] = useState('')
  const [newColumnEmptyState, setNewColumnEmptyState] = useState('')
  const [configMessage, setConfigMessage] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [isSavingConfig, setIsSavingConfig] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await getSubmissions()
        if (!response.ok) {
          throw new Error(`Status ${response.status}`)
        }

        const data = (await response.json()) as BoardResponse
        if (!cancelled) {
          setDashboard(data)
        }
      } catch (loadError) {
        if (!cancelled) {
          setDashboard(null)
          setError(loadError instanceof Error ? loadError.message : String(loadError))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [reloadNonce])

  useEffect(() => {
    setDraftConfig(dashboard?.config ?? null)
    setConfigMessage(null)
    setConfigError(null)
  }, [dashboard?.config])

  const config = draftConfig ?? dashboard?.config
  const summary = dashboard?.summary ?? []
  const items = dashboard?.items ?? []
  const cardGroups = config ? groupCardFields(config.cardFields) : { facts: [], body: [] }
  const availableStatuses = config ? collectAvailableStatuses(config) : []

  function refreshBoard() {
    setReloadNonce((current) => current + 1)
  }

  async function moveSubmissionToStatus(item: BoardItem, nextStatus: string) {
    if (!config) {
      return
    }

    if (item.status === nextStatus) {
      return
    }

    setError(null)

    const response = await updateSubmissionStatus(item.id, nextStatus)

    if (!response.ok) {
      setError(`Unable to update submission ${item.id}: ${response.status}`)
      return
    }

    setDashboard((current) => {
      if (!current) {
        return current
      }

      return applySubmissionStageMove(current, item.id, nextStatus, config) ?? current
    })
  }

  async function moveSubmissionToStage(item: BoardItem, stageKey: string) {
    if (!config || stageKey === item.stageKey) {
      return
    }

    const targetStage = config.stages.find((stage) => stage.key === stageKey)
    const nextStatus = getPrimaryStatusForStage(targetStage)

    if (!nextStatus) {
      return
    }

    await moveSubmissionToStatus(item, nextStatus)
  }

  function addBoardColumn() {
    if (!config) {
      return
    }

    const label = newColumnLabel.trim()
    if (!label) {
      setConfigError('Add a column label before creating a new stage.')
      return
    }

    const baseStateKey = slugifyStageKey(newColumnStateKey.trim() || label)
    const stateKey = uniqueStageStateKey(baseStateKey, config.stages)
    const description = newColumnDescription.trim() || `${label} submissions move through this backend-managed stage.`
    const emptyState = newColumnEmptyState.trim() || `No ${label.toLowerCase()} submissions yet.`
    const nextStage = createStageDraft(label, stateKey, config.stages.length)

    nextStage.description = description
    nextStage.emptyState = emptyState

    setDraftConfig({
      ...config,
      stages: [...config.stages, nextStage],
    })
    setConfigMessage(`Added ${label}. Save changes to publish the new state.`)
    setConfigError(null)
    setNewColumnLabel('')
    setNewColumnStateKey('')
    setNewColumnDescription('')
    setNewColumnEmptyState('')
  }

  async function saveBoardConfig() {
    if (!config) {
      return
    }

    setIsSavingConfig(true)
    setConfigError(null)
    setConfigMessage(null)

    try {
      const response = await saveSubmissionsConfig(config)

      if (!response.ok) {
        throw new Error(`Status ${response.status}`)
      }

      const savedConfig = (await response.json()) as BoardConfig
      setDraftConfig(savedConfig)
      setConfigMessage(`Saved ${savedConfig.stages.length} board columns and backend states.`)
      refreshBoard()
    } catch (saveError) {
      setConfigError(saveError instanceof Error ? saveError.message : String(saveError))
    } finally {
      setIsSavingConfig(false)
    }
  }

  async function advanceSubmission(item: BoardItem) {
    if (!item.nextStatus) {
      return
    }

    await moveSubmissionToStatus(item, item.nextStatus)
  }

  function openSubmission(item: BoardItem) {
    navigate(CREATE_COVERAGE_PATH, { state: { sourceSubmission: createDealSubmissionSeed(item) } })
  }

  function exportCsv() {
    if (!dashboard || !config) {
      return
    }

    const header = config.tableColumns.map((column) => column.label)
    const lines = [
      header.join(','),
      ...items.map((item) =>
        config.tableColumns
          .map((column) => escapeCsvCell(String(item.values[column.valueKey] ?? '')))
          .join(','),
      ),
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'incoming-submissions.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function renderBadge(item: BoardItem, field: BoardFieldDefinition) {
    const theme = renderBadgeTheme(item, field)
    return <BoardToken $background={theme.background} $border={theme.border} $color={theme.color}>{renderBadgeLabel(item, field, item.values[field.valueKey])}</BoardToken>
  }

  function renderField(item: BoardItem, field: BoardFieldDefinition) {
    const value = item.values[field.valueKey]

    if (field.format === 'badge') {
      return renderBadge(item, field)
    }

    // Slice 5.4: where the premium is shown, attach the risk-compute confidence
    // flag + (parametric) rate-on-line. Additive: when both are absent this is
    // identical to today's plain rendered value (legacy rows).
    if (field.valueKey === 'premium') {
      return renderPremiumWithConfidence(item, value, field.format)
    }

    return renderValue(value, field.format)
  }

  function renderPremiumWithConfidence(
    item: BoardItem,
    value: string | number | null | undefined,
    format?: BoardFieldFormat,
  ) {
    const confidenceLabel = item.values.confidenceLabel ?? null
    const priorSource = typeof item.values.priorSource === 'string' ? item.values.priorSource : undefined
    const rateOnLine = item.values.rateOnLine

    const hasConfidence = Boolean(confidenceLabel)
    const hasRol = typeof rateOnLine === 'number' && Number.isFinite(rateOnLine)

    // Legacy / null path: render exactly as before — no wrapper, no new nodes.
    if (!hasConfidence && !hasRol) {
      return renderValue(value, format)
    }

    return (
      <PremiumCluster>
        {renderValue(value, format)}
        {hasConfidence ? (
          <ConfidenceBadge confidenceLabel={confidenceLabel} title={priorSource} />
        ) : null}
        {hasRol ? <RateOnLine>ROL {formatPercent(rateOnLine as number)}</RateOnLine> : null}
      </PremiumCluster>
    )
  }

  const kanbanStages: KanbanStage[] = (config?.stages ?? []).map((stage) => ({
    key: stage.key,
    label: stage.label,
    accent: stage.accent,
  }))

  const kanbanItems: KanbanItem[] = items.map((item) => ({
    id: String(item.id),
    stageKey: item.stageKey,
  }))

  function handleKanbanMove(itemId: string, stageKey: string) {
    const draggedItem = items.find((item) => String(item.id) === itemId)
    if (!draggedItem) {
      return
    }

    void moveSubmissionToStage(draggedItem, stageKey)
  }

  function renderKanbanCard(kanbanItem: KanbanItem) {
    if (!config) {
      return null
    }

    const item = items.find((candidate) => String(candidate.id) === kanbanItem.id)
    if (!item) {
      return null
    }

    const headerTitleField = getFieldByKey(config, config.header.titleFieldKey)
    const headerSubtitleField = config.header.subtitleFieldKey ? getFieldByKey(config, config.header.subtitleFieldKey) : undefined
    const headerBadgeField = config.header.badgeFieldKey ? getFieldByKey(config, config.header.badgeFieldKey) : undefined

    return (
      <SubmissionCard
        $accent={item.stageAccent}
        role="button"
        tabIndex={0}
        onClick={() => openSubmission(item)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openSubmission(item)
          }
        }}
        title={`Open ${String(renderValue(item.values[headerTitleField?.valueKey ?? config.header.titleFieldKey], headerTitleField?.format))} in Create Coverage`}
      >
        <CardTop>
          <div>
            <CardTitleLink
              to={CREATE_COVERAGE_PATH}
              state={{ sourceSubmission: createDealSubmissionSeed(item) }}
              onClick={(event) => event.stopPropagation()}
              title={`Create coverage from ${String(renderValue(item.values[headerTitleField?.valueKey ?? config.header.titleFieldKey], headerTitleField?.format))}`}
            >
              {renderValue(item.values[headerTitleField?.valueKey ?? config.header.titleFieldKey], headerTitleField?.format)}
            </CardTitleLink>
            <CardMeta>{renderValue(item.values[headerSubtitleField?.valueKey ?? config.header.subtitleFieldKey ?? 'cedent'], headerSubtitleField?.format)}</CardMeta>
          </div>
          {headerBadgeField ? renderBadge(item, headerBadgeField) : null}
        </CardTop>

        <CardFacts>
          {cardGroups.facts.map((field) => (
            <Fact key={field.key}>
              <FactLabel>{field.label}</FactLabel>
              <FactValue>{field.format === 'badge' ? renderBadge(item, field) : renderField(item, field)}</FactValue>
            </Fact>
          ))}
        </CardFacts>

        <CardBody>
          {cardGroups.body.map((field) => (
            <CardBodyLine key={field.key}>
              <CardBodyLabel>{field.label}:</CardBodyLabel> {renderField(item, field)}
            </CardBodyLine>
          ))}
        </CardBody>

        <CardFooter>
          <RowMeta>{item.values.owner} • {item.values.receivedLabel}</RowMeta>
          <AdvanceButton
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              void advanceSubmission(item)
            }}
            disabled={item.nextStatus === null}
          >
            {item.nextStatus === null ? 'Closed' : `Move to ${item.nextStageLabel ?? 'next stage'}`}
          </AdvanceButton>
        </CardFooter>
      </SubmissionCard>
    )
  }

  return (
    <PageShell>
      <HeroPanel>
        <HeroInner>
          <div>
            <Eyebrow>{config?.eyebrow ?? 'Underwriting queue'}</Eyebrow>
            <HeroTitle>{config?.title ?? 'Incoming Submissions'}</HeroTitle>
            <HeroCopy>
              {config?.description ?? 'Loading the live underwriting queue from the backend.'}
            </HeroCopy>
          </div>

          <HeroActions>
            <Badge variant="neutral" dot>
              {isLoading ? 'Loading live data' : `${items.length} live submissions`}
            </Badge>
            <Badge variant="neutral">Backend-configured</Badge>
            <ExportButton type="button" onClick={exportCsv} disabled={!dashboard}>
              Export CSV
            </ExportButton>
            <Button variant="secondary" type="button" onClick={refreshBoard}>
              Refresh board
            </Button>
          </HeroActions>
        </HeroInner>
      </HeroPanel>

      <MetricsGrid>
        {summary.map((card) => (
          <MetricCard key={card.label} label={card.label} value={formatMetricValue(card)} delta={card.meta} />
        ))}
      </MetricsGrid>

      <WorkspacePanel>
        <Toolbar>
          <SegmentedSwitch options={['Table', 'Kanban']} value={viewMode} onChange={setViewMode} />
          <ToolbarMeta>
            <Badge variant="neutral">
              {config ? `${config.stages.length} stages` : 'Backend stages'}
            </Badge>
            <Badge variant="neutral">
              {dashboard ? `Synced ${new Date(dashboard.refreshedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Waiting for backend sync'}
            </Badge>
          </ToolbarMeta>
        </Toolbar>

        {error ? (
          <EmptyState>
            <ErrorState>Unable to load live submissions: {error}</ErrorState>
            <Button variant="secondary" type="button" onClick={refreshBoard}>
              Retry
            </Button>
          </EmptyState>
        ) : isLoading || !config ? (
          <EmptyState>Loading the backend-configured submission board.</EmptyState>
        ) : viewMode === 0 ? (
          <TableShell>
            <SubmissionsTable>
              <thead>
                <tr>
                  {config.tableColumns.map((column) => (
                    <TableHeadCell key={column.key}>{column.label}</TableHeadCell>
                  ))}
                  <TableHeadCell>Action</TableHeadCell>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isFinal = item.nextStatus === null

                  return (
                    <TableRow
                      key={item.id}
                      $clickable
                      role="button"
                      tabIndex={0}
                      onClick={() => openSubmission(item)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          openSubmission(item)
                        }
                      }}
                      title={`Open ${String(item.values.submissionNumber ?? item.id)} in Create Coverage`}
                    >
                      {config.tableColumns.map((column) => {
                        const field = getFieldByKey(config, column.key) ?? column

                        return (
                          <TableCell key={column.key}>
                            {field.format === 'badge' ? renderBadge(item, field) : renderField(item, field)}
                          </TableCell>
                        )
                      })}
                      <TableCell>
                        <AdvanceButton
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void advanceSubmission(item)
                          }}
                          disabled={isFinal}
                        >
                          {isFinal ? 'Closed' : `Move to ${item.nextStageLabel ?? 'next stage'}`}
                        </AdvanceButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </tbody>
            </SubmissionsTable>
          </TableShell>
        ) : (
          <>
            <ConfigPanel>
              <ConfigHead>
                <div>
                  <ConfigEyebrow>Board columns</ConfigEyebrow>
                  <ConfigCopy>
                    Add a new Kanban column here. The state key becomes an available backend submission status when you save changes.
                  </ConfigCopy>
                </div>

                <ConfigActions>
                  <ExportButton type="button" onClick={addBoardColumn}>
                    Add column
                  </ExportButton>
                  <Button variant="secondary" type="button" onClick={saveBoardConfig} disabled={isSavingConfig}>
                    {isSavingConfig ? 'Saving…' : 'Save board'}
                  </Button>
                </ConfigActions>
              </ConfigHead>

              {(configMessage || configError) && (
                <ConfigBanner $error={Boolean(configError)}>
                  {configError ?? configMessage}
                </ConfigBanner>
              )}

              <FieldGrid>
                <Field>
                  <FieldLabel>Column label</FieldLabel>
                  <FieldInput
                    value={newColumnLabel}
                    onChange={(event) => setNewColumnLabel(event.target.value)}
                    placeholder="Client review"
                  />
                </Field>

                <Field>
                  <FieldLabel>Backend state key</FieldLabel>
                  <FieldInput
                    value={newColumnStateKey}
                    onChange={(event) => setNewColumnStateKey(event.target.value)}
                    placeholder="client_review"
                  />
                </Field>

                <Field>
                  <FieldLabel>Description</FieldLabel>
                  <FieldInput
                    value={newColumnDescription}
                    onChange={(event) => setNewColumnDescription(event.target.value)}
                    placeholder="Awaiting customer-side review."
                  />
                </Field>

                <Field>
                  <FieldLabel>Empty column text</FieldLabel>
                  <FieldInput
                    value={newColumnEmptyState}
                    onChange={(event) => setNewColumnEmptyState(event.target.value)}
                    placeholder="No client review submissions yet."
                  />
                </Field>
              </FieldGrid>

              <StatesRow>
                <FieldLabel>Backend states</FieldLabel>
                {availableStatuses.map((status) => (
                  <Badge key={status} variant="neutral">
                    {status}
                  </Badge>
                ))}
              </StatesRow>

              <StagePreviewGrid>
                {config.stages.map((stage) => (
                  <StageCard key={stage.key} $border={stage.border}>
                    <StageCardHead>
                      <div>
                        <StageCardTitle>{stage.label}</StageCardTitle>
                        <StageCardDesc>{stage.description}</StageCardDesc>
                      </div>
                      <BoardToken $background={stage.background} $border={stage.border} $color={stage.accent}>
                        {stage.key}
                      </BoardToken>
                    </StageCardHead>
                    <StatusList>
                      {stage.statuses.map((status) => (
                        <BoardToken key={status} $background={stage.background} $border={stage.border} $color={stage.accent}>
                          {status}
                        </BoardToken>
                      ))}
                    </StatusList>
                  </StageCard>
                ))}
              </StagePreviewGrid>
            </ConfigPanel>

            <KanbanBoard
              stages={kanbanStages}
              items={kanbanItems}
              onMoveItem={handleKanbanMove}
              renderCard={renderKanbanCard}
            />
          </>
        )}
      </WorkspacePanel>
    </PageShell>
  )
}