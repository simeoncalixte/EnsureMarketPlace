import React, { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import Select from '../../xds/components/Select'
import { colors } from '../../xds/colors'
import {
  CapacityDefinition,
  CatalogModel,
  OptionItem,
  getGovernanceOptionSet,
  getModelFieldCatalog,
  listCapacityDefinitions,
} from '../../api/governance'

// ─── Page-local styled composites (mirrors AppetiteSettings house style) ─────
export const FieldLabel = styled.label`
  font-size: 10px;
  text-transform: uppercase;
  color: ${colors.onSurfaceVariant};
  font-weight: 700;
  letter-spacing: 0.04em;
`

export const MutedText = styled.div`
  color: ${colors.onSurfaceVariant};
`

export const ErrorText = styled.div`
  color: ${colors.error};
  margin-bottom: 12px;
`

export const FormGrid = styled.div<{ $wide?: boolean }>`
  display: grid;
  gap: 16px;
  width: 100%;
  max-width: ${(p) => (p.$wide ? 'none' : '760px')};
`

export const Row = styled.div`
  display: grid;
  gap: 8px;
  align-items: end;
`

export const SaveRow = styled.div`
  margin-top: 24px;
  display: flex;
  gap: 12px;
`

export const HelperText = styled.div`
  font-size: 13px;
  color: ${colors.onSurfaceVariant};
`

export const Toolbar = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
`

export const MonoCell = styled.span`
  font-family: monospace;
  font-size: 12px;
`

/** An explanatory banner — used to make a form self-describing. */
export const Banner = styled.div`
  background: ${colors.surfaceContainer};
  border: 1px solid ${colors.outlineVariant};
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.5;
  color: ${colors.onSurface};
  strong { font-weight: 700; }
`

/** A labelled block within an editor (a step in a multi-part form). */
export const Subsection = styled.div`
  display: grid;
  gap: 6px;
  padding-top: 12px;
  border-top: 1px solid ${colors.outlineVariant};
`

/** Monospaced, wrapped output block for run/test results. */
export const Pre = styled.pre`
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  background: ${colors.surfaceContainer};
  border-radius: 8px;
  padding: 10px 12px;
  margin: 0;
`

// ─── Editor layout scaffolding (header bar + numbered step cards) ─────────────
export const EditorHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding-bottom: 14px;
  margin-bottom: 16px;
  border-bottom: 1px solid ${colors.outlineVariant};
`

export const Crumb = styled.div`
  font-size: 12px;
  color: ${colors.onSurfaceVariant};
`

export const EditorTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${colors.onSurface};
`

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

/** A vertical stack of editor cards that fills the width of its container. */
export const CardStack = styled.div`
  display: grid;
  gap: 14px;
  width: 100%;
`

/** A grid used inside a card for label/field pairs. */
export const CardGrid = styled.div`
  display: grid;
  gap: 14px;
`

/** Header row of a numbered step card (badge + title + hint). */
export const StepRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 4px;
`

export const StepNum = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${colors.surfaceContainerHigh};
  color: ${colors.onSurface};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex: 0 0 auto;
`

export const StepTitle = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: ${colors.onSurface};
`

export const Field = ({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <FieldLabel>{label}</FieldLabel>
      {hint}
    </div>
    {children}
  </div>
)

/** Maps a capacity/referral status onto a Badge tone. */
export function statusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  switch ((status || '').toLowerCase()) {
    case 'active':
    case 'approved':
      return 'success'
    case 'pending_approval':
    case 'approval_pending':
    case 'testing':
    case 'scheduled':
    case 'medium':
      return 'warning'
    case 'suspended':
    case 'retired':
    case 'critical':
    case 'high':
      return 'danger'
    default:
      return 'neutral'
  }
}

// ─── Seeded option-set hook — nothing in Governance hardcodes a list ─────────
export function useGovernanceOptions(organizationId: number | null, key: string) {
  const [items, setItems] = useState<OptionItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    if (!organizationId) return
    setLoading(true)
    getGovernanceOptionSet(organizationId, key)
      .then((set) => {
        if (alive) setItems(set.items ?? [])
      })
      .catch(() => {
        if (alive) setItems([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [organizationId, key])

  return { items, loading }
}

/** Renders a seeded option set as a <Select>. */
export function OptionSelect({
  organizationId,
  optionKey,
  value,
  onChange,
  includeBlank,
}: {
  organizationId: number | null
  optionKey: string
  value: string
  onChange: (value: string) => void
  includeBlank?: string
}) {
  const { items } = useGovernanceOptions(organizationId, optionKey)
  return (
    <Select value={value} onChange={(e: any) => onChange(e.target.value)}>
      {includeBlank !== undefined && <option value="">{includeBlank}</option>}
      {items.map((it) => (
        <option key={it.value} value={it.value}>
          {it.label}
        </option>
      ))}
    </Select>
  )
}

// ─── Model field catalog — dot-notation paths over the real DB models ────────
export function useModelFieldCatalog(organizationId: number | null) {
  const [models, setModels] = useState<CatalogModel[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    if (!organizationId) return
    setLoading(true)
    getModelFieldCatalog(organizationId)
      .then((catalog) => {
        if (alive) setModels(catalog.models ?? [])
      })
      .catch(() => {
        if (alive) setModels([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [organizationId])

  return { models, loading }
}

// ─── Capacity-definition list + selection (shared across Governance pages) ────
export function useCapacityDefinitions(organizationId: number | null) {
  const [definitions, setDefinitions] = useState<CapacityDefinition[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    setError(null)
    try {
      setDefinitions(await listCapacityDefinitions(organizationId))
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load capacity definitions')
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    reload()
  }, [reload])

  return { definitions, loading, error, reload }
}

const SELECTED_KEY = 'governance.selectedDefinitionId'

/** Tracks the active capacity definition across pages, persisted in localStorage. */
export function useSelectedDefinition(definitions: CapacityDefinition[]) {
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(SELECTED_KEY) : null
    return raw ? Number(raw) : null
  })

  useEffect(() => {
    if (definitions.length === 0) return
    const stillExists = definitions.some((d) => d.id === selectedId)
    if (!stillExists) {
      const next = definitions.find((d) => d.isActive)?.id ?? definitions[0].id
      setSelectedId(next)
    }
  }, [definitions, selectedId])

  const select = useCallback((id: number) => {
    setSelectedId(id)
    if (typeof window !== 'undefined') window.localStorage.setItem(SELECTED_KEY, String(id))
  }, [])

  return { selectedId, select }
}

/** A definition picker rendered as a labelled <Select>. */
export function DefinitionPicker({
  definitions,
  selectedId,
  onSelect,
}: {
  definitions: CapacityDefinition[]
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  return (
    <div>
      <FieldLabel>Capacity Definition</FieldLabel>
      <Select value={selectedId ?? ''} onChange={(e: any) => onSelect(Number(e.target.value))}>
        {definitions.length === 0 && <option value="">No definitions yet</option>}
        {definitions.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
            {d.isActive ? ' • active' : ''}
          </option>
        ))}
      </Select>
    </div>
  )
}
