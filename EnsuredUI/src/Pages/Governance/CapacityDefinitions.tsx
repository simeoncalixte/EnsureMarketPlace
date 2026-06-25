import React, { useEffect, useMemo, useState } from 'react'
import * as S from '../InsurerDashboard/InsurerDashboard.styles'
import SubNavigation from '../../xds/components/SubNavigation'
import Button from '../../xds/components/Button'
import DataTable, { DataTableColumn } from '../../xds/components/DataTable'
import FormField from '../../xds/components/FormField'
import Input from '../../xds/components/Input'
import Textarea from '../../xds/components/Textarea'
import Badge from '../../xds/components/Badge'
import InfoHint from '../../xds/components/InfoHint'
import GeographicAppetiteMap from './GeographicAppetiteMap'
import { useAuthMe } from '../../lib/useAuthMe'
import {
  CapacityDefinition,
  CapacityDefinitionPatch,
  createCapacityDefinition,
  updateCapacityDefinition,
  transitionCapacityDefinition,
  cloneCapacityDefinition,
  deleteCapacityDefinition,
} from '../../api/governance'
import {
  Field,
  FieldLabel,
  FormGrid,
  MutedText,
  ErrorText,
  SaveRow,
  Toolbar,
  HelperText,
  statusTone,
  useCapacityDefinitions,
} from './governanceShared'
import DynamicSelect from '../../components/fields/DynamicSelect'
import type { FieldSource } from '../../components/fields/fieldSource'
import {
  deriveInclusion,
  normalizeStance,
  stancesFromInclusion,
  type JurisdictionStances,
} from '../../xds/components/regionAppetite'

// ── Generic field spec so each spec section renders declaratively ────────────
// 'option' is shorthand for a tenant-overridable picklist (an option set);
// 'source' carries an explicit FieldSource (entity-backed lists, enums, etc.).
type FieldType = 'text' | 'longtext' | 'number' | 'currency' | 'percent' | 'date' | 'csv' | 'bool' | 'json' | 'option' | 'source'
type FieldSpec = { key: string; label: string; type: FieldType; help?: string; optionKey?: string; source?: FieldSource; multiple?: boolean }
type SectionSpec = { id: string; label: string; target: 'root' | string; fields: FieldSpec[] }

// Each spec section maps to either real spine columns ('root') or a JSONB block.
const SECTIONS: SectionSpec[] = [
  {
    id: 'information',
    label: 'Information',
    target: 'root',
    fields: [
      { key: 'name', label: 'Capacity Name', type: 'text', help: 'Human-readable name for this capacity definition.' },
      { key: 'code', label: 'Capacity Code', type: 'text', help: 'Short unique code used to reference this capacity in rules and reports.' },
      { key: 'description', label: 'Description', type: 'longtext', help: 'Free-text summary of what this capacity covers and its intent.' },
      { key: 'status', label: 'Status', type: 'option', optionKey: 'governance.capacity.status', help: 'Lifecycle state (draft, active, suspended…) controlling whether it can be used.' },
      { key: 'effectiveDate', label: 'Effective Date', type: 'date', help: 'Date this capacity becomes valid for binding new risks.' },
      { key: 'expirationDate', label: 'Expiration Date', type: 'date', help: 'Date after which this capacity no longer accepts new risks.' },
      { key: 'versionNumber', label: 'Version Number', type: 'text', help: 'Version label for tracking changes across revisions.' },
    ],
  },
  {
    id: 'ownership',
    label: 'Ownership',
    target: 'root',
    fields: [
      { key: 'lineOfBusiness', label: 'Line of Business', type: 'option', optionKey: 'governance.org.lineOfBusiness', help: 'Line of business this capacity is written for.' },
      { key: 'department', label: 'Department', type: 'source', source: { kind: 'entity', entity: 'department', manageable: true }, help: 'Department that owns and is accountable for this capacity.' },
      { key: 'team', label: 'Team', type: 'source', source: { kind: 'entity', entity: 'team', manageable: true, dependsOn: 'department' }, help: 'Team within the department responsible for day-to-day management.' },
      { key: 'ownerUserId', label: 'Capacity Owner', type: 'source', source: { kind: 'entity', entity: 'user' }, help: 'Primary person accountable for this capacity definition.' },
      { key: 'backupOwnerUserId', label: 'Backup Owner', type: 'source', source: { kind: 'entity', entity: 'user' }, help: 'Secondary owner who acts when the primary is unavailable.' },
      { key: 'riskManagerUserId', label: 'Risk Manager', type: 'source', source: { kind: 'entity', entity: 'user' }, help: 'Risk manager who reviews exposure and limit adherence.' },
      { key: 'approvalCommittee', label: 'Approval Committee', type: 'source', source: { kind: 'entity', entity: 'user' }, multiple: true, help: 'Users who must sign off before this capacity goes live.' },
    ],
  },
  {
    id: 'exposure',
    label: 'Exposure',
    target: 'exposureConstraints',
    fields: [
      { key: 'maximumExposure', label: 'Maximum Exposure', type: 'currency', help: 'Largest total exposure this capacity will hold at any one time.' },
      { key: 'maximumRetention', label: 'Maximum Retention', type: 'currency', help: 'Most loss the carrier keeps net before reinsurance responds.' },
      { key: 'maximumParticipation', label: 'Maximum Participation', type: 'percent', help: 'Largest share (%) of any single risk this capacity will take.' },
      { key: 'maximumAggregateExposure', label: 'Maximum Aggregate Exposure', type: 'currency', help: 'Cap on combined exposure across all bound risks.' },
      { key: 'maximumOccurrenceExposure', label: 'Maximum Occurrence Exposure', type: 'currency', help: 'Cap on exposure to a single loss event across all risks.' },
      { key: 'maximumExposurePerRisk', label: 'Maximum Exposure Per Risk', type: 'currency', help: 'Most exposure allowed on one individual risk.' },
      { key: 'maximumExposurePerAccount', label: 'Maximum Exposure Per Account', type: 'currency', help: 'Most exposure allowed across one insured account.' },
      { key: 'maximumExposurePerGroup', label: 'Maximum Exposure Per Group', type: 'currency', help: 'Most exposure allowed across one related group of insureds.' },
      { key: 'limitKind', label: 'Limit Enforcement', type: 'option', optionKey: 'governance.exposure.limitKind', help: 'How limits are enforced — hard block versus refer for review.' },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing',
    target: 'pricingControls',
    fields: [
      { key: 'minimumPremium', label: 'Minimum Premium', type: 'currency', help: 'Smallest premium amount this capacity will write.' },
      { key: 'targetProfitability', label: 'Target Profitability', type: 'percent', help: 'Profit margin (%) the capacity is expected to deliver.' },
      { key: 'expectedLossRatio', label: 'Expected Loss Ratio', type: 'percent', help: 'Anticipated losses as a percentage of premium.' },
      { key: 'minimumMargin', label: 'Minimum Margin', type: 'percent', help: 'Lowest acceptable margin (%) after expected loss and expense.' },
    ],
  },
  {
    id: 'coverage',
    label: 'Coverage',
    target: 'coverageControls',
    fields: [
      { key: 'allowedCoverageTypes', label: 'Allowed Perils', type: 'source', source: { kind: 'entity', entity: 'peril' }, multiple: true, help: 'Perils this capacity is permitted to write.' },
      { key: 'excludedCoverageTypes', label: 'Excluded Perils', type: 'source', source: { kind: 'entity', entity: 'peril' }, multiple: true, help: 'Perils this capacity must not write.' },
      { key: 'requiredClauses', label: 'Required Clauses', type: 'csv', help: 'Policy clauses that must be present on every bound risk.' },
      { key: 'requiredEndorsements', label: 'Required Endorsements', type: 'csv', help: 'Endorsements mandatory for coverage under this capacity.' },
      { key: 'optionalFeatures', label: 'Optional Features', type: 'csv', help: 'Coverage features offered at underwriter discretion.' },
      { key: 'excludedFeatures', label: 'Excluded Features', type: 'csv', help: 'Coverage features that may never be offered.' },
    ],
  },
  {
    id: 'distribution',
    label: 'Distribution',
    target: 'distributionControls',
    fields: [
      { key: 'approvedPartners', label: 'Approved Partners', type: 'source', source: { kind: 'entity', entity: 'partner', manageable: true }, multiple: true, help: 'Partner organizations or users permitted to submit business. Add partners manually (with default info); they can claim their account on joining.' },
      { key: 'restrictedPartners', label: 'Restricted Partners', type: 'source', source: { kind: 'entity', entity: 'partner', manageable: true }, multiple: true, help: 'Partner organizations or users barred or limited from submitting business.' },
      { key: 'distributionTier', label: 'Distribution Tier', type: 'option', optionKey: 'governance.distribution.tier', help: 'Channel tier governing authority and commission terms.' },
      { key: 'distributionScoreMinimum', label: 'Distribution Score Minimum', type: 'number', help: 'Minimum partner quality score required to submit.' },
      { key: 'maximumSubmissionAuthority', label: 'Maximum Submission Authority', type: 'currency', help: 'Largest risk size a partner may submit without referral.' },
    ],
  },
  {
    id: 'geographic',
    label: 'Geography',
    target: 'geographicControls',
    fields: [
      { key: 'allowedTerritories', label: 'Allowed Territories', type: 'csv', help: 'Territories (e.g. countries or states) where risks may be written.' },
      { key: 'excludedTerritories', label: 'Excluded Territories', type: 'csv', help: 'Territories explicitly barred from this capacity.' },
      { key: 'allowedRegions', label: 'Allowed Regions', type: 'csv', help: 'Named regions permitted for binding new risks.' },
      { key: 'excludedRegions', label: 'Excluded Regions', type: 'csv', help: 'Named regions explicitly barred from this capacity.' },
      { key: 'postalCodeRestrictions', label: 'Postal Code Restrictions', type: 'csv', help: 'Specific postal or ZIP codes excluded or restricted.' },
      { key: 'geospatialBoundary', label: 'Geospatial Boundary (GeoJSON)', type: 'json', help: 'GeoJSON polygon limiting where insured risks may be located.' },
      { key: 'radiusRestrictions', label: 'Radius Restrictions', type: 'number', help: 'Radius (km) used to aggregate nearby risks for accumulation control.' },
      { key: 'distanceConstraints', label: 'Distance Constraints', type: 'number', help: 'Minimum separation required between insured locations.' },
    ],
  },
  {
    id: 'scoring',
    label: 'Scoring',
    target: 'riskScoring',
    fields: [
      { key: 'scoreModel', label: 'Score Model', type: 'option', optionKey: 'governance.scoring.model', help: 'Risk-scoring model used to triage incoming submissions.' },
      { key: 'scoreThresholdAccept', label: 'Score Threshold Accept', type: 'number', help: 'Score at or above which a risk is auto-accepted.' },
      { key: 'scoreThresholdReview', label: 'Score Threshold Review', type: 'number', help: 'Score band that routes a risk to manual review.' },
      { key: 'scoreThresholdDecline', label: 'Score Threshold Decline', type: 'number', help: 'Score at or below which a risk is auto-declined.' },
      { key: 'weightDefinitions', label: 'Weight Definitions (JSON)', type: 'json', help: 'JSON weights tuning how each factor contributes to the score.' },
    ],
  },
  {
    id: 'workflow',
    label: 'Workflow',
    target: 'workflowConfig',
    fields: [
      { key: 'allowAutoAccept', label: 'Allow Auto Accept', type: 'bool', help: 'Let qualifying risks bind automatically without underwriter touch.' },
      { key: 'allowAutoDecline', label: 'Allow Auto Decline', type: 'bool', help: 'Let clearly out-of-appetite risks be declined automatically.' },
      { key: 'allowAutoReferral', label: 'Allow Auto Referral', type: 'bool', help: 'Let borderline risks be routed to referral automatically.' },
      { key: 'allowAutoQuote', label: 'Allow Auto Quote', type: 'bool', help: 'Let the system generate quotes without manual sign-off.' },
      { key: 'allowAutoBind', label: 'Allow Auto Bind', type: 'bool', help: 'Let accepted quotes bind coverage automatically.' },
      { key: 'manualReviewRequired', label: 'Manual Review Required', type: 'bool', help: 'Force every submission through human review regardless of score.' },
    ],
  },
]

const DEPLOY_TARGETS = ['testing', 'approval_pending', 'approved', 'scheduled', 'active', 'retired']

export default function CapacityDefinitions() {
  const { user } = useAuthMe()
  const orgId = user?.organizationId ?? null
  const { definitions, loading, error, reload } = useCapacityDefinitions(orgId)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const editing = useMemo(() => definitions.find((d) => d.id === editingId) ?? null, [definitions, editingId])

  if (!orgId) {
    return (
      <S.ContentArea>
        <S.LeftColumn>
          <S.Section>
            <S.SectionHeader><S.SectionTitle>Capacity Definitions</S.SectionTitle><S.SectionRule /></S.SectionHeader>
            <MutedText>No organization is associated with your account.</MutedText>
          </S.Section>
        </S.LeftColumn>
      </S.ContentArea>
    )
  }

  const onNew = async () => {
    setBusy(true)
    try {
      const created = await createCapacityDefinition(orgId, { name: 'New Capacity', status: 'draft' })
      await reload()
      setEditingId(created.id)
    } finally {
      setBusy(false)
    }
  }

  const onClone = async (id: number) => {
    setBusy(true)
    try {
      await cloneCapacityDefinition(orgId, id)
      await reload()
    } finally {
      setBusy(false)
    }
  }

  const onTransition = async (id: number, status?: string, deploymentStatus?: string) => {
    setBusy(true)
    try {
      await transitionCapacityDefinition(orgId, id, { status, deploymentStatus })
      await reload()
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async (id: number) => {
    setBusy(true)
    try {
      await deleteCapacityDefinition(orgId, id)
      if (editingId === id) setEditingId(null)
      await reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <S.ContentArea>
      <S.LeftColumn>
        <S.Section>
          <S.SectionHeader>
            <S.SectionTitle>{editing ? `Edit · ${editing.name}` : 'Capacity Definitions'}</S.SectionTitle>
            <S.SectionRule />
          </S.SectionHeader>

          {loading && <MutedText>Loading…</MutedText>}
          {error && <ErrorText>{error}</ErrorText>}

          {!editing && (
            <>
              <Toolbar>
                <Button variant="primary" disabled={busy} onClick={onNew}>+ New Definition</Button>
                <HelperText>Multiple capacity definitions may coexist; each is independently configurable and versioned.</HelperText>
              </Toolbar>
              <Registry
                definitions={definitions}
                busy={busy}
                onEdit={setEditingId}
                onClone={onClone}
                onTransition={onTransition}
                onDelete={onDelete}
              />
            </>
          )}

          {editing && (
            <Editor
              key={editing.id}
              orgId={orgId}
              definition={editing}
              onClose={() => setEditingId(null)}
              onSaved={reload}
            />
          )}
        </S.Section>
      </S.LeftColumn>
    </S.ContentArea>
  )
}

function Registry({
  definitions,
  busy,
  onEdit,
  onClone,
  onTransition,
  onDelete,
}: {
  definitions: CapacityDefinition[]
  busy: boolean
  onEdit: (id: number) => void
  onClone: (id: number) => void
  onTransition: (id: number, status?: string, deploymentStatus?: string) => void
  onDelete: (id: number) => void
}) {
  const columns: DataTableColumn<CapacityDefinition>[] = [
    { key: 'name', header: 'Name', render: (d) => d.name },
    { key: 'code', header: 'Code', render: (d) => d.code ?? '—' },
    { key: 'version', header: 'Version', render: (d) => d.versionNumber },
    { key: 'status', header: 'Status', render: (d) => <Badge variant={statusTone(d.status) as any}>{d.status}</Badge> },
    { key: 'deploy', header: 'Deployment', render: (d) => <Badge variant={statusTone(d.deploymentStatus) as any}>{d.deploymentStatus}</Badge> },
    { key: 'active', header: 'Active', render: (d) => (d.isActive ? '✓' : '') },
  ]
  return (
    <DataTable<CapacityDefinition>
      columns={columns}
      data={definitions}
      emptyText="No capacity definitions yet."
      rowActions={(d) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button variant="ghost" onClick={() => onEdit(d.id)}>Edit</Button>
          <Button variant="ghost" disabled={busy} onClick={() => onClone(d.id)}>Clone</Button>
          {!d.isActive && <Button variant="ghost" disabled={busy} onClick={() => onTransition(d.id, 'active')}>Activate</Button>}
          {d.isActive && <Button variant="ghost" disabled={busy} onClick={() => onTransition(d.id, 'suspended')}>Suspend</Button>}
          <Button variant="ghost" disabled={busy} onClick={() => onDelete(d.id)}>Delete</Button>
        </div>
      )}
    />
  )
}

function Editor({
  orgId,
  definition,
  onClose,
  onSaved,
}: {
  orgId: number
  definition: CapacityDefinition
  onClose: () => void
  onSaved: () => Promise<void> | void
}) {
  const [tab, setTab] = useState('information')
  const [draft, setDraft] = useState<CapacityDefinition>(definition)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => setDraft(definition), [definition])

  const section = SECTIONS.find((s) => s.id === tab)!

  const getValue = (spec: FieldSpec): unknown => {
    if (section.target === 'root') return (draft as any)[spec.key]
    const block = ((draft as any)[section.target] as Record<string, unknown>) ?? {}
    return block[spec.key]
  }

  const setValue = (spec: FieldSpec, value: unknown) => {
    setDraft((prev) => {
      if (section.target === 'root') return { ...prev, [spec.key]: value } as CapacityDefinition
      const block = { ...(((prev as any)[section.target] as Record<string, unknown>) ?? {}), [spec.key]: value }
      return { ...prev, [section.target]: block } as CapacityDefinition
    })
  }

  const onSave = async () => {
    setSaving(true)
    setErr(null)
    try {
      const patch: CapacityDefinitionPatch = {
        name: draft.name,
        code: draft.code,
        description: draft.description,
        status: draft.status,
        effectiveDate: draft.effectiveDate,
        expirationDate: draft.expirationDate,
        versionNumber: draft.versionNumber,
        lineOfBusiness: draft.lineOfBusiness,
        department: draft.department,
        team: draft.team,
        ownerUserId: draft.ownerUserId,
        backupOwnerUserId: draft.backupOwnerUserId,
        riskManagerUserId: draft.riskManagerUserId,
        approvalCommittee: draft.approvalCommittee,
        geographicControls: draft.geographicControls,
        riskEligibility: draft.riskEligibility,
        exposureConstraints: draft.exposureConstraints,
        portfolioControls: draft.portfolioControls,
        accumulationControls: draft.accumulationControls,
        pricingControls: draft.pricingControls,
        coverageControls: draft.coverageControls,
        distributionControls: draft.distributionControls,
        riskScoring: draft.riskScoring,
        workflowConfig: draft.workflowConfig,
        appetite: draft.appetite,
      }
      await updateCapacityDefinition(orgId, draft.id, patch)
      await onSaved()
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const onDeploy = async (deploymentStatus: string) => {
    setSaving(true)
    try {
      await transitionCapacityDefinition(orgId, draft.id, { deploymentStatus })
      await onSaved()
    } finally {
      setSaving(false)
    }
  }

  const tabs = SECTIONS.map((s) => ({ id: s.id, label: s.label })).concat([{ id: 'lifecycle', label: 'Lifecycle' }])

  return (
    <>
      <Toolbar>
        <Button variant="ghost" onClick={onClose}>← Back to registry</Button>
        <Badge variant={statusTone(draft.status) as any}>{draft.status}</Badge>
        <Badge variant={statusTone(draft.deploymentStatus) as any}>deploy: {draft.deploymentStatus}</Badge>
      </Toolbar>

      <div style={{ marginBottom: 20 }}>
        <SubNavigation tabs={tabs} activeId={tab} onChange={setTab} label={null} />
      </div>

      {err && <ErrorText>{err}</ErrorText>}

      {tab !== 'lifecycle' && (
        <FormGrid $wide>
          {section.id === 'geographic' && (
            <>
              <HelperText>
                Click the map to set each jurisdiction’s appetite stance — Target, Acceptable, Restricted,
                Refer, Decline — cycling through the grades; granularity follows zoom (country → state →
                city). Right-click a region to pick a stance directly or open Regional settings (its
                per-line-of-business limits). The panel over the map lists regions grouped by stance, each
                showing its capacity utilization (deployed ÷ aggregate-cap) inline. Stances and limits
                belong to <strong> this</strong> capacity definition; save to persist them.
              </HelperText>
              <GeographicAppetiteMap
                stances={asStances((draft.appetite as Record<string, unknown>) ?? undefined)}
                onStancesChange={(next) =>
                  setDraft((prev) => {
                    const inclusion = deriveInclusion(next)
                    return {
                      ...prev,
                      appetite: {
                        ...((prev.appetite as Record<string, unknown>) ?? {}),
                        jurisdictionStances: next,
                        // Keep the binary lists in sync so the backend appetite
                        // engine (which still reads them) stays correct.
                        preferredJurisdictions: inclusion.preferred,
                        excludedJurisdictions: inclusion.excluded,
                      },
                    } as CapacityDefinition
                  })
                }
                organizationId={orgId}
                capacityDefinitionId={draft.id}
                currency={String((draft.appetite as Record<string, unknown>)?.currency ?? 'USD')}
                height={520}
              />
            </>
          )}
          {section.id !== 'geographic' &&
            section.fields.map((spec) => {
              // A dependent source (e.g. team → department) reads its parent's
              // current value from the same section so the child list can filter.
              const dependsOn = spec.source?.kind === 'entity' ? spec.source.dependsOn : undefined
              const dependsOnValue = dependsOn
                ? (getValue({ key: dependsOn, label: dependsOn, type: 'text' }) as number | string | null)
                : undefined
              return (
                <FieldEditor
                  key={spec.key}
                  orgId={orgId}
                  spec={spec}
                  value={getValue(spec)}
                  onChange={(v) => setValue(spec, v)}
                  dependsOnValue={dependsOnValue}
                />
              )
            })}
          <SaveRow>
            <Button variant="primary" disabled={saving} onClick={onSave}>{saving ? 'Saving…' : 'Save Definition'}</Button>
          </SaveRow>
        </FormGrid>
      )}

      {tab === 'lifecycle' && (
        <FormGrid $wide>
          <HelperText>
            Deployment lifecycle (Section 19): move the definition through its release stages. Activating it
            makes it the single live capacity definition for the organization and stamps approval metadata.
          </HelperText>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {DEPLOY_TARGETS.map((t) => (
              <Button key={t} variant="secondary" disabled={saving} onClick={() => onDeploy(t)}>{t}</Button>
            ))}
          </div>
          <MutedText>
            Version {draft.versionNumber} · last modified {draft.updatedAt ? new Date(draft.updatedAt).toLocaleString() : '—'}
            {draft.approvalDate ? ` · approved ${new Date(draft.approvalDate).toLocaleDateString()}` : ''}
          </MutedText>
        </FormGrid>
      )}
    </>
  )
}

function asCsv(value: unknown): string {
  return Array.isArray(value) ? value.join(', ') : ''
}
function asList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)) : []
}
/** Read the graded stance map from the appetite block, falling back to seeding it
 *  from any legacy preferred/excluded lists so existing definitions aren't blank. */
function asStances(appetite: Record<string, unknown> | undefined): JurisdictionStances {
  const raw = appetite?.jurisdictionStances
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const out: JurisdictionStances = {}
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const s = normalizeStance(typeof v === 'string' ? v : String(v))
      if (s) out[k] = s
    }
    if (Object.keys(out).length > 0) return out
  }
  return stancesFromInclusion(asList(appetite?.preferredJurisdictions), asList(appetite?.excludedJurisdictions))
}
function csvToList(value: string): string[] {
  return value.split(',').map((v) => v.trim()).filter(Boolean)
}
/**
 * Coerce a stored date to the `YYYY-MM-DD` an HTML `<input type="date">` requires.
 * The backend column is a timestamp, so values round-trip as full ISO strings
 * (e.g. `2026-06-22T00:00:00.000Z`); without trimming, the date input renders
 * blank and edits appear not to persist. Slicing the leading date keeps it
 * timezone-stable (no reinterpretation of the UTC instant).
 */
function toDateInputValue(value: unknown): string {
  if (value == null || value === '') return ''
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10)
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : ''
}

function FieldEditor({
  orgId,
  spec,
  value,
  onChange,
  dependsOnValue,
}: {
  orgId: number
  spec: FieldSpec
  value: unknown
  onChange: (v: unknown) => void
  dependsOnValue?: number | string | null
}) {
  // Each field carries a one-line explanation surfaced through an info icon next
  // to its label so the form is self-describing.
  const hint = spec.help ? <InfoHint text={spec.help} label={`About ${spec.label}`} /> : undefined
  if (spec.type === 'bool') {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          <FieldLabel>{spec.label}</FieldLabel>
        </label>
        {hint}
      </div>
    )
  }
  // 'option' is shorthand for a manageable option set; 'source' carries an explicit
  // FieldSource (entity-backed lists, enums). Both render through one DynamicSelect.
  if (spec.type === 'option' || spec.type === 'source') {
    const source: FieldSource = spec.source ?? { kind: 'optionSet', key: spec.optionKey!, manageable: true }
    return (
      <Field label={spec.label} hint={hint}>
        <DynamicSelect
          organizationId={orgId}
          source={source}
          value={value}
          onChange={onChange}
          multiple={spec.multiple}
          dependsOnValue={dependsOnValue}
        />
      </Field>
    )
  }
  if (spec.type === 'longtext' || spec.type === 'json') {
    const text = spec.type === 'json' && value && typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '')
    return (
      <Field label={spec.label} hint={hint}>
        <Textarea
          value={text}
          onChange={(e: any) => {
            if (spec.type === 'json') {
              try {
                onChange(e.target.value ? JSON.parse(e.target.value) : {})
              } catch {
                onChange(e.target.value) // keep raw while mid-edit; validated on next parse
              }
            } else {
              onChange(e.target.value)
            }
          }}
        />
      </Field>
    )
  }
  if (spec.type === 'csv') {
    return (
      <FormField
        label={`${spec.label} (comma-separated)`}
        hint={hint}
        value={asCsv(value)}
        onChange={(e: any) => onChange(csvToList(e.target.value))}
      />
    )
  }
  const isNum = spec.type === 'number' || spec.type === 'currency' || spec.type === 'percent'
  const suffix = spec.type === 'currency' ? ' ($)' : spec.type === 'percent' ? ' (%)' : ''
  return (
    <FormField
      label={spec.label + suffix}
      hint={hint}
      type={isNum ? 'number' : spec.type === 'date' ? 'date' : 'text'}
      value={spec.type === 'date' ? toDateInputValue(value) : value == null ? '' : String(value)}
      onChange={(e: any) => onChange(isNum ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
    />
  )
}
