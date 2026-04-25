import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import Button from '../../xds/components/Button'
import SegmentedSwitch from '../../xds/components/SegmentedSwitch'
import { apiFetch } from '../../lib/auth'
import { Link } from 'react-router'

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

type DealSubmissionSeed = {
  submissionId: number
  submissionNumber: string
  cedent: string
  lineOfBusiness: string
  locationText?: string
  region: string
  premium: number
  exposure: number
  receivedLabel: string
  owner: string
  source: string
  notes: string
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

const STATUS_META: Record<SubmissionStatus, { label: string; accent: string; background: string; border: string }> = {
  new: {
    label: 'New',
    accent: '#4b8eff',
    background: 'rgba(75, 142, 255, 0.12)',
    border: 'rgba(75, 142, 255, 0.28)',
  },
  triage: {
    label: 'Triage',
    accent: '#f59e0b',
    background: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.28)',
  },
  underwriting: {
    label: 'Underwriting',
    accent: '#22c55e',
    background: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.28)',
  },
  approved: {
    label: 'Approved',
    accent: '#a78bfa',
    background: 'rgba(167, 139, 250, 0.12)',
    border: 'rgba(167, 139, 250, 0.28)',
  },
}

const PRIORITY_META: Record<SubmissionPriority, { label: string; tone: 'red' | 'amber' | 'blue'; background: string; border: string; color: string }> = {
  urgent: {
    label: 'Urgent',
    tone: 'red',
    background: 'rgba(255, 107, 107, 0.12)',
    border: 'rgba(255, 107, 107, 0.25)',
    color: '#ff8b8b',
  },
  high: {
    label: 'High',
    tone: 'amber',
    background: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.25)',
    color: '#f7b955',
  },
  normal: {
    label: 'Normal',
    tone: 'blue',
    background: 'rgba(75, 142, 255, 0.10)',
    border: 'rgba(75, 142, 255, 0.22)',
    color: '#9ec0ff',
  },
}

const BOARD_ORDER: SubmissionStatus[] = ['new', 'triage', 'underwriting', 'approved']

const NEXT_STATUS: Record<SubmissionStatus, SubmissionStatus> = {
  new: 'triage',
  triage: 'underwriting',
  underwriting: 'approved',
  approved: 'approved',
}

const TOKEN_BASE: React.CSSProperties = {
  padding: '0.4rem 0.7rem',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid transparent',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

function statusTone(status: SubmissionStatus): 'new' | 'triage' | 'underwriting' | 'approved' {
  return status
}

function priorityTone(priority: SubmissionPriority): 'urgent' | 'high' | 'normal' {
  return priority
}

function Token({ tone, children }: { tone: keyof typeof STATUS_META | keyof typeof PRIORITY_META; children: React.ReactNode }) {
  if (tone in STATUS_META) {
    const meta = STATUS_META[tone as SubmissionStatus]
    return (
      <span
        style={{
          ...TOKEN_BASE,
          background: meta.background,
          borderColor: meta.border,
          color: meta.accent,
        }}
      >
        {children}
      </span>
    )
  }

  const meta = PRIORITY_META[tone as SubmissionPriority]
  return (
    <span
      style={{
        ...TOKEN_BASE,
        background: meta.background,
        borderColor: meta.border,
        color: meta.color,
      }}
    >
      {children}
    </span>
  )
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
  border: 1px solid rgba(148, 163, 184, 0.12);
  background:
    radial-gradient(circle at top right, rgba(75, 142, 255, 0.26), transparent 30%),
    linear-gradient(135deg, rgba(11, 19, 38, 0.98), rgba(11, 19, 38, 0.76));
  box-shadow: 0 24px 60px rgba(2, 8, 23, 0.35);
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
  color: #9ec0ff;
  margin-bottom: 0.7rem;
`

const HeroTitle = styled.h1`
  margin: 0;
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: clamp(1.8rem, 3vw, 2.7rem);
  line-height: 1.05;
  color: #f3f7ff;
`

const HeroCopy = styled.p`
  margin: 0.8rem 0 0;
  max-width: 62ch;
  color: rgba(218, 226, 253, 0.78);
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

const MetricCard = styled.div`
  border-radius: 20px;
  padding: 1rem 1.05rem;
  background: rgba(11, 18, 32, 0.76);
  border: 1px solid rgba(148, 163, 184, 0.1);
  box-shadow: 0 10px 28px rgba(2, 8, 23, 0.18);
`

const MetricLabel = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #98a6bf;
  margin-bottom: 0.45rem;
`

const MetricValue = styled.div`
  font-size: 1.35rem;
  font-weight: 800;
  color: #f3f7ff;
`

const MetricMeta = styled.div`
  margin-top: 0.35rem;
  color: #98a6bf;
  font-size: 0.85rem;
`

const WorkspacePanel = styled.section`
  border-radius: 28px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(7, 17, 41, 0.72);
  box-shadow: 0 24px 60px rgba(2, 8, 23, 0.28);
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
  border: 1px solid rgba(148, 163, 184, 0.1);
`

const SubmissionsTable = styled.table`
  width: 100%;
  min-width: 1120px;
  border-collapse: collapse;
  background: rgba(11, 18, 32, 0.72);
`

const TableHeadCell = styled.th`
  padding: 0.9rem 0.95rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #98a6bf;
  text-align: left;
  background: rgba(255, 255, 255, 0.02);
`

const TableRow = styled.tr`
  border-top: 1px solid rgba(148, 163, 184, 0.08);
  transition: background 160ms ease, transform 160ms ease;

  &:hover {
    background: rgba(75, 142, 255, 0.05);
  }
`

const TableCell = styled.td`
  padding: 0.95rem;
  vertical-align: top;
  color: #dae2fd;
`

const RowMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`

const RowTitle = styled.div`
  font-weight: 800;
  color: #f3f7ff;
`

const RowMeta = styled.div`
  color: #98a6bf;
  font-size: 0.82rem;
`

const BoardGrid = styled.div`
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  overflow-x: auto;
  padding-bottom: 2rem;
`

const LaneCard = styled.div<{ $accent: string; $isDropTarget: boolean }>`
  flex: 0 0 20rem;
  display: flex;
  flex-direction: column;
  transition: transform 160ms ease, box-shadow 160ms ease;
  box-shadow: ${({ $isDropTarget }) => ($isDropTarget ? '0 0 0 1px rgba(75, 142, 255, 0.22), 0 18px 36px rgba(2, 8, 23, 0.18)' : 'none')};
  transform: ${({ $isDropTarget }) => ($isDropTarget ? 'translateY(-2px)' : 'translateY(0)')};
`

const LaneHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0 0.25rem;
`

const LaneTitleWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`

const LaneTitle = styled.div`
  color: #dbe2fd;
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
`

const LaneDescription = styled.div`
  display: none;
`

const LaneBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const SubmissionCard = styled.article<{ $accent: string; $isDragging: boolean }>`
  position: relative;
  overflow: hidden;
  padding: 1rem;
  background: #131b2e;
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease, opacity 180ms ease;
  cursor: grab;
  user-select: none;
  opacity: ${({ $isDragging }) => ($isDragging ? 0.55 : 1)};
  transform: ${({ $isDragging }) => ($isDragging ? 'scale(0.985)' : 'translateY(0)')};

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
    border-color: rgba(75, 142, 255, 0.5);
    box-shadow: 0 16px 28px rgba(2, 8, 23, 0.24);
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

const CardTitle = styled.div`
  margin-bottom: 0.2rem;
  color: #f3f7ff;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.4;
`

const CardTitleLink = styled(Link)`
  display: inline-block;
  margin-bottom: 0.2rem;
  color: #f3f7ff;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.4;
  text-decoration: none;

  &:hover,
  &:focus-visible {
    color: #9ec0ff;
    text-decoration: underline;
  }
`

const CardMeta = styled.div`
  color: #98a6bf;
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
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`

const Fact = styled.div`
  min-width: 0;
`

const FactLabel = styled.div`
  margin-bottom: 0.25rem;
  color: #98a6bf;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`

const FactValue = styled.div`
  color: #dbe2fd;
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
  border: 2px dashed rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  color: #5c667f;
  text-align: center;
`

const CardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const CardBodyLine = styled.div`
  color: #98a6bf;
  font-size: 0.84rem;
  line-height: 1.45;
`

const CardBodyLabel = styled.span`
  color: #dae2fd;
  font-weight: 700;
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

type BoardDragPayload = {
  submissionId: number
  sourceStageKey: string
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
  values: Record<string, string | number | null>
}

type BoardResponse = {
  config: BoardConfig
  summary: BoardSummaryCard[]
  items: BoardItem[]
  refreshedAt: string
}

const PRIORITY_TONES = {
  urgent: { label: 'Urgent', background: 'rgba(255, 107, 107, 0.12)', border: 'rgba(255, 107, 107, 0.25)', color: '#ff8b8b' },
  high: { label: 'High', background: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)', color: '#f7b955' },
  normal: { label: 'Normal', background: 'rgba(75, 142, 255, 0.10)', border: 'rgba(75, 142, 255, 0.22)', color: '#9ec0ff' },
} as const

const SYSTEM_TONE = {
  background: 'rgba(148, 163, 184, 0.08)',
  border: 'rgba(148, 163, 184, 0.2)',
  color: '#dae2fd',
}

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

const KanbanChip = styled.span<{ $background: string; $border: string; $color: string }>`
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ $border }) => $border};
  background: ${({ $background }) => $background};
  color: ${({ $color }) => $color};
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`

const BoardMoveButton = styled.button`
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 0;
  background: #adc6ff;
  color: #002e69;
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  transition: opacity 150ms ease, transform 150ms ease, filter 150ms ease, background 150ms ease;

  &:hover:not(:disabled) {
    filter: brightness(1.04);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    cursor: not-allowed;
    background: rgba(148, 163, 184, 0.08);
    color: #98a6bf;
  }
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

function createDealSubmissionSeed(item: BoardItem): DealSubmissionSeed {
  return {
    submissionId: Number(item.values.submissionId ?? item.id),
    submissionNumber: String(item.values.submissionNumber ?? `SUB-${String(item.id).padStart(4, '0')}`),
    cedent: String(item.values.cedent ?? ''),
    lineOfBusiness: String(item.values.lineOfBusiness ?? ''),
    locationText: String(item.values.locationText ?? item.values.location ?? item.values.address ?? item.values.region ?? ''),
    region: String(item.values.region ?? ''),
    premium: Number(item.values.premium ?? 0),
    exposure: Number(item.values.exposure ?? 0),
    receivedLabel: String(item.values.receivedLabel ?? ''),
    owner: String(item.values.owner ?? ''),
    source: String(item.values.source ?? ''),
    notes: String(item.values.notes ?? ''),
  }
}

const STAGE_TONES = [
  { accent: '#4b8eff', background: 'rgba(75, 142, 255, 0.12)', border: 'rgba(75, 142, 255, 0.28)' },
  { accent: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.28)' },
  { accent: '#22c55e', background: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.28)' },
  { accent: '#a78bfa', background: 'rgba(167, 139, 250, 0.12)', border: 'rgba(167, 139, 250, 0.28)' },
  { accent: '#f97316', background: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.28)' },
  { accent: '#14b8a6', background: 'rgba(20, 184, 166, 0.12)', border: 'rgba(20, 184, 166, 0.28)' },
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

function readBoardDragPayload(event: React.DragEvent<HTMLElement>): BoardDragPayload | null {
  const rawPayload = event.dataTransfer.getData('application/x-ensured-submission')
  if (rawPayload) {
    try {
      const parsed = JSON.parse(rawPayload) as Partial<BoardDragPayload>
      if (
        typeof parsed.submissionId === 'number' &&
        Number.isFinite(parsed.submissionId) &&
        typeof parsed.sourceStageKey === 'string'
      ) {
        return {
          submissionId: parsed.submissionId,
          sourceStageKey: parsed.sourceStageKey,
        }
      }
    } catch {
      return null
    }
  }

  const fallbackSubmissionId = Number(event.dataTransfer.getData('text/plain'))
  if (Number.isFinite(fallbackSubmissionId)) {
    return {
      submissionId: fallbackSubmissionId,
      sourceStageKey: '',
    }
  }

  return null
}

export default function IncomingSubmissionsPage() {
  const [viewMode, setViewMode] = useState(0)
  const [dashboard, setDashboard] = useState<BoardResponse | null>(null)
  const [draftConfig, setDraftConfig] = useState<BoardConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [draggingItemId, setDraggingItemId] = useState<number | null>(null)
  const [dragOverStageKey, setDragOverStageKey] = useState<string | null>(null)
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
        const response = await apiFetch('/api/underwriting/submissions')
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

  function clearDragState() {
    setDraggingItemId(null)
    setDragOverStageKey(null)
  }

  function handleSubmissionDragStart(event: React.DragEvent<HTMLElement>, item: BoardItem) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-ensured-submission', JSON.stringify({ submissionId: item.id, sourceStageKey: item.stageKey }))
    event.dataTransfer.setData('text/plain', String(item.id))
    setDraggingItemId(item.id)
    setDragOverStageKey(item.stageKey)
  }

  function handleSubmissionDragEnd() {
    clearDragState()
  }

  async function moveSubmissionToStatus(item: BoardItem, nextStatus: string) {
    if (!config) {
      return
    }

    if (item.status === nextStatus) {
      return
    }

    setError(null)

    const response = await apiFetch(`/api/underwriting/submissions/${item.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })

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

  function handleLaneDragOver(event: React.DragEvent<HTMLElement>, stageKey: string) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverStageKey(stageKey)
  }

  function handleLaneDrop(event: React.DragEvent<HTMLElement>, stageKey: string) {
    event.preventDefault()
    const payload = readBoardDragPayload(event)
    if (!payload) {
      clearDragState()
      return
    }

    const draggedItem = items.find((item) => item.id === payload.submissionId)
    if (!draggedItem) {
      clearDragState()
      return
    }

    if (payload.sourceStageKey && draggedItem.stageKey !== payload.sourceStageKey) {
      clearDragState()
      return
    }

    clearDragState()
    void moveSubmissionToStage(draggedItem, stageKey)
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
      const response = await apiFetch('/api/underwriting/submissions/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

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

    return renderValue(value, field.format)
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
            <BoardToken $background={SYSTEM_TONE.background} $border={SYSTEM_TONE.border} $color={SYSTEM_TONE.color}>
              {isLoading ? 'Loading live data' : `${items.length} live submissions`}
            </BoardToken>
            <BoardToken $background={SYSTEM_TONE.background} $border={SYSTEM_TONE.border} $color={SYSTEM_TONE.color}>
              Backend-configured
            </BoardToken>
            <Button variant="ghost" type="button" onClick={exportCsv} disabled={!dashboard} style={{ border: '1px solid rgba(75,142,255,0.22)', background: 'rgba(75,142,255,0.10)', color: '#dae2fd' }}>
              Export CSV
            </Button>
            <Button variant="secondary" type="button" onClick={refreshBoard}>
              Refresh board
            </Button>
          </HeroActions>
        </HeroInner>
      </HeroPanel>

      <MetricsGrid>
        {summary.map((card) => (
          <MetricCard key={card.label}>
            <MetricLabel>{card.label}</MetricLabel>
            <MetricValue>{formatMetricValue(card)}</MetricValue>
            <MetricMeta>{card.meta}</MetricMeta>
          </MetricCard>
        ))}
      </MetricsGrid>

      <WorkspacePanel>
        <Toolbar>
          <SegmentedSwitch options={['Table', 'Kanban']} value={viewMode} onChange={setViewMode} />
          <ToolbarMeta>
            <BoardToken $background={SYSTEM_TONE.background} $border={SYSTEM_TONE.border} $color={SYSTEM_TONE.color}>
              {config ? `${config.stages.length} stages` : 'Backend stages'}
            </BoardToken>
            <BoardToken $background={SYSTEM_TONE.background} $border={SYSTEM_TONE.border} $color={SYSTEM_TONE.color}>
              {dashboard ? `Synced ${new Date(dashboard.refreshedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Waiting for backend sync'}
            </BoardToken>
          </ToolbarMeta>
        </Toolbar>

        {error ? (
          <EmptyState>
            <div style={{ marginBottom: '0.75rem' }}>Unable to load live submissions: {error}</div>
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
                    <TableRow key={item.id}>
                      {config.tableColumns.map((column) => {
                        const field = getFieldByKey(config, column.key) ?? column

                        return (
                          <TableCell key={column.key}>
                            {field.format === 'badge' ? renderBadge(item, field) : renderField(item, field)}
                          </TableCell>
                        )
                      })}
                      <TableCell>
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => advanceSubmission(item)}
                          disabled={isFinal}
                          style={{
                            border: '1px solid rgba(75,142,255,0.18)',
                            background: isFinal ? 'rgba(148,163,184,0.06)' : 'rgba(75,142,255,0.10)',
                            color: isFinal ? '#98a6bf' : '#dbe9ff',
                            cursor: isFinal ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isFinal ? 'Closed' : `Move to ${item.nextStageLabel ?? 'next stage'}`}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </tbody>
            </SubmissionsTable>
          </TableShell>
        ) : (
          <>
            <div
              style={{
                marginBottom: '1rem',
                borderRadius: 24,
                border: '1px solid rgba(148, 163, 184, 0.12)',
                background: 'linear-gradient(135deg, rgba(11, 18, 32, 0.94), rgba(11, 18, 32, 0.74))',
                padding: '1rem',
                boxShadow: '0 16px 36px rgba(2, 8, 23, 0.2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9ec0ff', marginBottom: 6 }}>
                    Board columns
                  </div>
                  <div style={{ color: '#dae2fd', fontSize: 14, lineHeight: 1.5, maxWidth: '72ch' }}>
                    Add a new Kanban column here. The state key becomes an available backend submission status when you save changes.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <Button variant="ghost" type="button" onClick={addBoardColumn} style={{ border: '1px solid rgba(75,142,255,0.18)', background: 'rgba(75,142,255,0.10)', color: '#dae2fd' }}>
                    Add column
                  </Button>
                  <Button variant="secondary" type="button" onClick={saveBoardConfig} disabled={isSavingConfig}>
                    {isSavingConfig ? 'Saving…' : 'Save board'}
                  </Button>
                </div>
              </div>

              {(configMessage || configError) && (
                <div
                  style={{
                    marginTop: '0.9rem',
                    borderRadius: 16,
                    border: `1px solid ${configError ? 'rgba(255, 107, 107, 0.25)' : 'rgba(75, 142, 255, 0.22)'}`,
                    background: configError ? 'rgba(255, 107, 107, 0.08)' : 'rgba(75, 142, 255, 0.08)',
                    color: configError ? '#ffb3ad' : '#dae2fd',
                    padding: '0.85rem 1rem',
                    fontSize: 13,
                  }}
                >
                  {configError ?? configMessage}
                </div>
              )}

              <div
                style={{
                  marginTop: '1rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: '0.75rem',
                }}
              >
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#98a6bf', fontWeight: 700 }}>Column label</span>
                  <input
                    value={newColumnLabel}
                    onChange={(event) => setNewColumnLabel(event.target.value)}
                    placeholder="Client review"
                    style={{
                      borderRadius: 12,
                      border: '1px solid rgba(148, 163, 184, 0.16)',
                      background: '#0f1724',
                      color: '#f3f7ff',
                      padding: '0.8rem 0.9rem',
                      outline: 'none',
                    }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#98a6bf', fontWeight: 700 }}>Backend state key</span>
                  <input
                    value={newColumnStateKey}
                    onChange={(event) => setNewColumnStateKey(event.target.value)}
                    placeholder="client_review"
                    style={{
                      borderRadius: 12,
                      border: '1px solid rgba(148, 163, 184, 0.16)',
                      background: '#0f1724',
                      color: '#f3f7ff',
                      padding: '0.8rem 0.9rem',
                      outline: 'none',
                    }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#98a6bf', fontWeight: 700 }}>Description</span>
                  <input
                    value={newColumnDescription}
                    onChange={(event) => setNewColumnDescription(event.target.value)}
                    placeholder="Awaiting customer-side review."
                    style={{
                      borderRadius: 12,
                      border: '1px solid rgba(148, 163, 184, 0.16)',
                      background: '#0f1724',
                      color: '#f3f7ff',
                      padding: '0.8rem 0.9rem',
                      outline: 'none',
                    }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#98a6bf', fontWeight: 700 }}>Empty column text</span>
                  <input
                    value={newColumnEmptyState}
                    onChange={(event) => setNewColumnEmptyState(event.target.value)}
                    placeholder="No client review submissions yet."
                    style={{
                      borderRadius: 12,
                      border: '1px solid rgba(148, 163, 184, 0.16)',
                      background: '#0f1724',
                      color: '#f3f7ff',
                      padding: '0.8rem 0.9rem',
                      outline: 'none',
                    }}
                  />
                </label>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#98a6bf', fontWeight: 700 }}>Backend states</span>
                {availableStatuses.map((status) => (
                  <BoardToken key={status} $background={SYSTEM_TONE.background} $border={SYSTEM_TONE.border} $color={SYSTEM_TONE.color}>
                    {status}
                  </BoardToken>
                ))}
              </div>

              <div
                style={{
                  marginTop: '1rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                {config.stages.map((stage) => (
                  <div
                    key={stage.key}
                    style={{
                      borderRadius: 20,
                      border: `1px solid ${stage.border}`,
                      background: 'rgba(15, 23, 36, 0.9)',
                      padding: '0.9rem 1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#f3f7ff' }}>{stage.label}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: '#98a6bf' }}>{stage.description}</div>
                      </div>
                      <BoardToken $background={stage.background} $border={stage.border} $color={stage.accent}>
                        {stage.key}
                      </BoardToken>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {stage.statuses.map((status) => (
                        <BoardToken key={status} $background={stage.background} $border={stage.border} $color={stage.accent}>
                          {status}
                        </BoardToken>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <BoardGrid>
            {config.stages.map((stage) => {
              const laneItems = items.filter((item) => item.stageKey === stage.key)

              return (
                <LaneCard
                  key={stage.key}
                  $accent={stage.accent}
                  $isDropTarget={draggingItemId !== null && dragOverStageKey === stage.key}
                  onDragOver={(event) => handleLaneDragOver(event, stage.key)}
                  onDrop={(event) => handleLaneDrop(event, stage.key)}
                >
                  <LaneHeader>
                    <LaneTitleWrap>
                      <LaneTitle>{stage.label}</LaneTitle>
                      <LaneDescription>{stage.description}</LaneDescription>
                    </LaneTitleWrap>
                    <BoardToken $background={stage.background} $border={stage.border} $color={stage.accent}>
                      {laneItems.length} items
                    </BoardToken>
                  </LaneHeader>

                  <LaneBody>
                    {laneItems.length === 0 ? (
                      <EmptyState>{stage.emptyState}</EmptyState>
                    ) : (
                      laneItems.map((item) => {
                        const headerTitleField = getFieldByKey(config, config.header.titleFieldKey)
                        const headerSubtitleField = config.header.subtitleFieldKey ? getFieldByKey(config, config.header.subtitleFieldKey) : undefined
                        const headerBadgeField = config.header.badgeFieldKey ? getFieldByKey(config, config.header.badgeFieldKey) : undefined

                        return (
                          <SubmissionCard
                            key={item.id}
                            $accent={item.stageAccent}
                            $isDragging={draggingItemId === item.id}
                            draggable
                            onDragStart={(event) => handleSubmissionDragStart(event, item)}
                            onDragEnd={handleSubmissionDragEnd}
                          >
                            <CardTop>
                              <div>
                                <CardTitleLink
                                  to="/admin/deals/create"
                                  state={{ sourceSubmission: createDealSubmissionSeed(item) }}
                                  title={`Create deal from ${String(renderValue(item.values[headerTitleField?.valueKey ?? config.header.titleFieldKey], headerTitleField?.format))}`}
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
                              <Button
                                variant="ghost"
                                type="button"
                                onClick={() => advanceSubmission(item)}
                                disabled={item.nextStatus === null}
                                style={{
                                  border: '1px solid rgba(75,142,255,0.18)',
                                  background: item.nextStatus === null ? 'rgba(148,163,184,0.06)' : 'rgba(75,142,255,0.10)',
                                  color: item.nextStatus === null ? '#98a6bf' : '#dbe9ff',
                                  cursor: item.nextStatus === null ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {item.nextStatus === null ? 'Closed' : `Move to ${item.nextStageLabel ?? 'next stage'}`}
                              </Button>
                            </CardFooter>
                          </SubmissionCard>
                        )
                      })
                    )}
                  </LaneBody>
                </LaneCard>
              )
            })}
            </BoardGrid>
          </>
        )}
      </WorkspacePanel>
    </PageShell>
  )
}