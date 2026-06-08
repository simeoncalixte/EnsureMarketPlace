import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import * as S from './InsurerDashboard.styles'
import SubNavigation from '../../xds/components/SubNavigation'
import Button from '../../xds/components/Button'
import DataTable, { DataTableColumn } from '../../xds/components/DataTable'
import { colors } from '../../xds/colors'
import { useAuthMe } from '../../lib/useAuthMe'
import {
  useOrganizationAppetite,
  AppetiteProfile,
  AppetiteProfilePatch,
  ValidationRule,
  ValidationRuleInput,
} from '../../lib/useOrganizationAppetite'

const TABS = [
  { id: 'capital', label: 'Investment & Capital' },
  { id: 'risk', label: 'Risk Appetite' },
  { id: 'geo', label: 'Geographic Appetite' },
  { id: 'rules', label: 'Validation Rules' },
]

const RULE_FIELDS = ['riskType', 'limit', 'expectedYield', 'jurisdiction', 'lineOfBusiness', 'dataQualityScore']
const RULE_OPERATORS = ['in', 'not_in', 'eq', 'neq', 'gte', 'lte', 'gt', 'lt', 'required', 'between']
const RULE_SEVERITIES = ['reject', 'flag', 'warn']

function csvToList(value: string): string[] {
  return value.split(',').map((v) => v.trim()).filter((v) => v.length > 0)
}

function listToCsv(value: string[] | undefined): string {
  return Array.isArray(value) ? value.join(', ') : ''
}

// ─── Page-local styled composites ───────────────────────────────────────────
const FieldLabel = styled.label`
  font-size: 10px;
  text-transform: uppercase;
  color: ${colors.onSurfaceVariant};
  font-weight: 700;
  letter-spacing: 0.04em;
`

const MutedText = styled.div`
  color: ${colors.onSurfaceVariant};
`

const ErrorText = styled.div`
  color: ${colors.error};
  margin-bottom: 12px;
`

const TabBar = styled.div`
  margin-bottom: 24px;
`

const FormGrid = styled.div`
  display: grid;
  gap: 16px;
  max-width: 720px;
`

const CapacityRows = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 8px;
`

const CapacityRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: center;
`

const SaveRow = styled.div`
  margin-top: 24px;
`

const HelperText = styled.div`
  font-size: 13px;
  color: ${colors.onSurfaceVariant};
`

const SummaryBody = styled.div`
  padding: 16px;
  font-size: 13px;
  color: ${colors.text.primary};
  display: grid;
  gap: 6px;
`

const SummaryFootnote = styled.div`
  margin-top: 8px;
  color: ${colors.onSurfaceVariant};
`

const RulesRoot = styled.div`
  display: grid;
  gap: 16px;
`

const RulesIntro = styled.div`
  font-size: 13px;
  color: ${colors.onSurfaceVariant};
`

const Reject = styled.strong`
  color: ${colors.error};
`

const Flag = styled.strong`
  color: ${colors.warning};
`

const AddRuleBlock = styled.div`
  border-top: 1px solid ${colors.outlineVariant};
  padding-top: 16px;
`

const AddRuleGrid = styled.div`
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1.2fr 1fr auto;
  gap: 8px;
  align-items: end;
  margin-top: 8px;
`

const MonoCell = styled.span`
  font-family: monospace;
`

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  )
}

export default function AppetiteSettings() {
  const { user } = useAuthMe()
  const orgId = user?.organizationId ?? null
  const { profile, rules, loading, saving, error, saveProfile, createRule, updateRule, deleteRule } =
    useOrganizationAppetite(orgId)

  const [tab, setTab] = useState('capital')
  const [draft, setDraft] = useState<AppetiteProfile | null>(null)

  useEffect(() => {
    if (profile) setDraft(profile)
  }, [profile])

  const set = (patch: Partial<AppetiteProfile>) => setDraft((prev) => (prev ? { ...prev, ...patch } : prev))

  const capacityRows = useMemo(
    () => Object.entries(draft?.capacityByPeril ?? {}),
    [draft?.capacityByPeril],
  )

  if (!orgId) {
    return (
      <S.ContentArea>
        <S.LeftColumn>
          <S.Section>
            <S.SectionHeader><S.SectionTitle>Underwriting Appetite</S.SectionTitle><S.SectionRule /></S.SectionHeader>
            <MutedText>No organization is associated with your account.</MutedText>
          </S.Section>
        </S.LeftColumn>
      </S.ContentArea>
    )
  }

  const onSave = async () => {
    if (!draft) return
    const patch: AppetiteProfilePatch = {
      name: draft.name,
      description: draft.description,
      currency: draft.currency,
      totalDeployableCapital: draft.totalDeployableCapital,
      minTargetYield: draft.minTargetYield,
      maxLineSize: draft.maxLineSize,
      minCoverageLimit: draft.minCoverageLimit,
      maxCoverageLimit: draft.maxCoverageLimit,
      capacityByPeril: draft.capacityByPeril,
      preferredPerils: draft.preferredPerils,
      excludedPerils: draft.excludedPerils,
      allowedLinesOfBusiness: draft.allowedLinesOfBusiness,
      preferredJurisdictions: draft.preferredJurisdictions,
      excludedJurisdictions: draft.excludedJurisdictions,
      minDataQualityScore: draft.minDataQualityScore,
      requiredFields: draft.requiredFields,
    }
    await saveProfile(patch)
  }

  return (
    <S.ContentArea>
      <S.LeftColumn>
        <S.Section>
          <S.SectionHeader>
            <S.SectionTitle>Underwriting Appetite</S.SectionTitle>
            <S.SectionRule />
          </S.SectionHeader>

          <TabBar>
            <SubNavigation tabs={TABS} activeId={tab} onChange={setTab} label={null} />
          </TabBar>

          {loading && <MutedText>Loading appetite…</MutedText>}
          {error && <ErrorText>{error}</ErrorText>}

          {draft && tab === 'capital' && (
            <FormGrid>
              <S.GridTwo>
                <Field label="Profile Name">
                  <S.Input value={draft.name ?? ''} onChange={(e: any) => set({ name: e.target.value })} />
                </Field>
                <Field label="Currency">
                  <S.Select value={draft.currency ?? 'USD'} onChange={(e: any) => set({ currency: e.target.value })}>
                    <option>USD</option><option>EUR</option><option>GBP</option><option>JPY</option><option>CHF</option>
                  </S.Select>
                </Field>
                <Field label="Total Deployable Capital">
                  <S.Input type="number" value={draft.totalDeployableCapital ?? ''} onChange={(e: any) => set({ totalDeployableCapital: e.target.value })} />
                </Field>
                <Field label="Min Target Yield (e.g. 0.08 = 8%)">
                  <S.Input type="number" step="0.01" value={draft.minTargetYield ?? ''} onChange={(e: any) => set({ minTargetYield: e.target.value })} />
                </Field>
                <Field label="Max Line Size (per risk)">
                  <S.Input type="number" value={draft.maxLineSize ?? ''} onChange={(e: any) => set({ maxLineSize: e.target.value })} />
                </Field>
                <Field label="Min Coverage Limit">
                  <S.Input type="number" value={draft.minCoverageLimit ?? ''} onChange={(e: any) => set({ minCoverageLimit: e.target.value })} />
                </Field>
                <Field label="Max Coverage Limit">
                  <S.Input type="number" value={draft.maxCoverageLimit ?? ''} onChange={(e: any) => set({ maxCoverageLimit: e.target.value })} />
                </Field>
                <Field label="Min Data Quality Score (0-100)">
                  <S.Input type="number" value={draft.minDataQualityScore ?? ''} onChange={(e: any) => set({ minDataQualityScore: e.target.value === '' ? null : Number(e.target.value) })} />
                </Field>
              </S.GridTwo>

              <div>
                <FieldLabel>Capacity by Peril</FieldLabel>
                <CapacityRows>
                  {capacityRows.map(([peril, cap], i) => (
                    <CapacityRow key={i}>
                      <S.Input
                        value={peril}
                        onChange={(e: any) => {
                          const next: Record<string, number> = {}
                          capacityRows.forEach(([k, v], idx) => { next[idx === i ? e.target.value : k] = v })
                          set({ capacityByPeril: next })
                        }}
                      />
                      <S.Input
                        type="number"
                        value={cap}
                        onChange={(e: any) => {
                          const next = { ...draft.capacityByPeril, [peril]: Number(e.target.value) }
                          set({ capacityByPeril: next })
                        }}
                      />
                      <Button variant="ghost" onClick={() => {
                        const next = { ...draft.capacityByPeril }
                        delete next[peril]
                        set({ capacityByPeril: next })
                      }}>Remove</Button>
                    </CapacityRow>
                  ))}
                  <Button variant="ghost" onClick={() => set({ capacityByPeril: { ...draft.capacityByPeril, ['new_peril']: 0 } })}>+ Add peril capacity</Button>
                </CapacityRows>
              </div>
            </FormGrid>
          )}

          {draft && tab === 'risk' && (
            <FormGrid>
              <Field label="Preferred Perils (comma-separated)">
                <S.Input value={listToCsv(draft.preferredPerils)} onChange={(e: any) => set({ preferredPerils: csvToList(e.target.value) })} />
              </Field>
              <Field label="Excluded Perils (comma-separated)">
                <S.Input value={listToCsv(draft.excludedPerils)} onChange={(e: any) => set({ excludedPerils: csvToList(e.target.value) })} />
              </Field>
              <Field label="Allowed Lines of Business (comma-separated)">
                <S.Input value={listToCsv(draft.allowedLinesOfBusiness)} onChange={(e: any) => set({ allowedLinesOfBusiness: csvToList(e.target.value) })} />
              </Field>
              <Field label="Required Fields (comma-separated)">
                <S.Input value={listToCsv(draft.requiredFields)} onChange={(e: any) => set({ requiredFields: csvToList(e.target.value) })} />
              </Field>
            </FormGrid>
          )}

          {draft && tab === 'geo' && (
            <FormGrid>
              <Field label="Preferred Jurisdictions (comma-separated)">
                <S.Input value={listToCsv(draft.preferredJurisdictions)} onChange={(e: any) => set({ preferredJurisdictions: csvToList(e.target.value) })} />
              </Field>
              <Field label="Excluded Jurisdictions (comma-separated)">
                <S.Input value={listToCsv(draft.excludedJurisdictions)} onChange={(e: any) => set({ excludedJurisdictions: csvToList(e.target.value) })} />
              </Field>
              <HelperText>
                Use ISO country codes or region names (e.g. <code>US, FL, JP</code>). Matching is case-insensitive and partial.
              </HelperText>
            </FormGrid>
          )}

          {tab === 'rules' && (
            <RulesTab
              rules={rules}
              onCreate={createRule}
              onUpdate={updateRule}
              onDelete={deleteRule}
            />
          )}

          {tab !== 'rules' && (
            <SaveRow>
              <Button variant="primary" disabled={saving} onClick={onSave}>
                {saving ? 'Saving…' : 'Save Appetite'}
              </Button>
            </SaveRow>
          )}
        </S.Section>
      </S.LeftColumn>

      <S.RightAside>
        <S.SummaryCard>
          <S.SummaryInner>
            <FieldLabel>Active Appetite</FieldLabel>
            <S.StatValue>{draft?.name ?? '—'}</S.StatValue>
          </S.SummaryInner>
          <SummaryBody>
            <div>Preferred perils: <strong>{draft?.preferredPerils?.length ?? 0}</strong></div>
            <div>Excluded perils: <strong>{draft?.excludedPerils?.length ?? 0}</strong></div>
            <div>Excluded jurisdictions: <strong>{draft?.excludedJurisdictions?.length ?? 0}</strong></div>
            <div>Custom rules: <strong>{rules.length}</strong></div>
            <div>Min data quality: <strong>{draft?.minDataQualityScore ?? '—'}</strong></div>
            <SummaryFootnote>
              These limits are enforced during the validation stage of every incoming submission.
            </SummaryFootnote>
          </SummaryBody>
        </S.SummaryCard>
      </S.RightAside>
    </S.ContentArea>
  )
}

function RulesTab({
  rules,
  onCreate,
  onUpdate,
  onDelete,
}: {
  rules: ValidationRule[]
  onCreate: (input: ValidationRuleInput) => Promise<void>
  onUpdate: (id: number, input: ValidationRuleInput) => Promise<void>
  onDelete: (id: number) => Promise<void>
}) {
  const [draft, setDraft] = useState<ValidationRuleInput>({
    name: '', field: 'riskType', operator: 'in', value: '', severity: 'flag', enabled: true,
  })
  const [busy, setBusy] = useState(false)

  const parseValue = (operator: string, raw: unknown): unknown => {
    const s = String(raw ?? '')
    if (operator === 'in' || operator === 'not_in' || operator === 'between') return csvToList(s)
    if (['gte', 'lte', 'gt', 'lt'].includes(operator)) return s === '' ? null : Number(s)
    return s
  }

  const add = async () => {
    if (!draft.field || !draft.operator) return
    setBusy(true)
    try {
      await onCreate({ ...draft, value: parseValue(String(draft.operator), draft.value) })
      setDraft({ name: '', field: 'riskType', operator: 'in', value: '', severity: 'flag', enabled: true })
    } catch {
      // Validation error is surfaced via the hook's `error` state; keep the
      // draft so the user can correct it.
    } finally {
      setBusy(false)
    }
  }

  const columns: DataTableColumn<ValidationRule>[] = [
    { key: 'name', header: 'Name', render: (r) => r.name },
    { key: 'field', header: 'Field', render: (r) => r.field },
    { key: 'operator', header: 'Operator', render: (r) => r.operator },
    {
      key: 'value',
      header: 'Value',
      render: (r) => <MonoCell>{Array.isArray(r.value) ? r.value.join(', ') : String(r.value ?? '')}</MonoCell>,
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (r) => (
        <S.Select value={r.severity} onChange={(e: any) => onUpdate(r.id, { severity: e.target.value as any })}>
          {RULE_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </S.Select>
      ),
    },
    {
      key: 'enabled',
      header: 'Enabled',
      render: (r) => (
        <input type="checkbox" checked={r.enabled} onChange={(e) => onUpdate(r.id, { enabled: e.target.checked })} />
      ),
    },
  ]

  return (
    <RulesRoot>
      <RulesIntro>
        Custom rules run during validation. <Reject>reject</Reject> takes a submission out of appetite,
        <Flag> flag</Flag> routes it for review, <strong>warn</strong> records only.
      </RulesIntro>

      <DataTable<ValidationRule>
        columns={columns}
        data={rules}
        emptyText="No custom rules yet."
        rowActions={(r) => (
          <Button variant="ghost" onClick={() => onDelete(r.id)}>Delete</Button>
        )}
      />

      <AddRuleBlock>
        <FieldLabel>Add Rule</FieldLabel>
        <AddRuleGrid>
          <S.Input placeholder="Rule name" value={String(draft.name ?? '')} onChange={(e: any) => setDraft({ ...draft, name: e.target.value })} />
          <S.Select value={draft.field} onChange={(e: any) => setDraft({ ...draft, field: e.target.value })}>
            {RULE_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
          </S.Select>
          <S.Select value={draft.operator} onChange={(e: any) => setDraft({ ...draft, operator: e.target.value })}>
            {RULE_OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
          </S.Select>
          <S.Input placeholder="value (csv for in/between)" value={String(draft.value ?? '')} onChange={(e: any) => setDraft({ ...draft, value: e.target.value })} />
          <S.Select value={draft.severity} onChange={(e: any) => setDraft({ ...draft, severity: e.target.value as any })}>
            {RULE_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </S.Select>
          <Button variant="primary" disabled={busy} onClick={add}>Add</Button>
        </AddRuleGrid>
      </AddRuleBlock>
    </RulesRoot>
  )
}
