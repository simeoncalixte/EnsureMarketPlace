import React, { useEffect, useState } from 'react'
import * as S from '../InsurerDashboard/InsurerDashboard.styles'
import Button from '../../xds/components/Button'
import DataTable, { DataTableColumn } from '../../xds/components/DataTable'
import FormField from '../../xds/components/FormField'
import Select from '../../xds/components/Select'
import Textarea from '../../xds/components/Textarea'
import Badge from '../../xds/components/Badge'
import { useAuthMe } from '../../lib/useAuthMe'
import {
  ReferralRule,
  ReferralRuleInput,
  listReferralRules,
  createReferralRule,
  updateReferralRule,
  deleteReferralRule,
} from '../../api/governance'
import {
  Field,
  FieldLabel,
  MutedText,
  ErrorText,
  FormGrid,
  Toolbar,
  HelperText,
  MonoCell,
  statusTone,
  OptionSelect,
  useCapacityDefinitions,
  useSelectedDefinition,
  DefinitionPicker,
} from './governanceShared'

type Draft = {
  name: string
  description: string
  severity: string
  triggerConditions: Record<string, unknown>
  triggerRaw: string
  referralDestinationType: string
  referralDestinationId: string
  activeFlag: boolean
  sortOrder: number
}

const EMPTY_DRAFT: Draft = {
  name: '',
  description: '',
  severity: '',
  triggerConditions: {},
  triggerRaw: '{}',
  referralDestinationType: '',
  referralDestinationId: '',
  activeFlag: true,
  sortOrder: 0,
}

export default function ReferralRules() {
  const { user } = useAuthMe()
  const orgId = user?.organizationId ?? null
  const { definitions } = useCapacityDefinitions(orgId)
  const { selectedId, select } = useSelectedDefinition(definitions)

  const [rules, setRules] = useState<ReferralRule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)

  const reload = async () => {
    if (!orgId || !selectedId) {
      setRules([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      setRules(await listReferralRules(orgId, selectedId))
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load referral rules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let alive = true
    if (!orgId || !selectedId) {
      setRules([])
      return
    }
    setLoading(true)
    setError(null)
    listReferralRules(orgId, selectedId)
      .then((rows) => {
        if (alive) setRules(rows)
      })
      .catch((e: any) => {
        if (alive) setError(e?.message ?? 'Failed to load referral rules')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, selectedId])

  if (!orgId) {
    return (
      <S.ContentArea>
        <S.LeftColumn>
          <S.Section>
            <S.SectionHeader><S.SectionTitle>Referral Rules</S.SectionTitle><S.SectionRule /></S.SectionHeader>
            <MutedText>No organization is associated with your account.</MutedText>
          </S.Section>
        </S.LeftColumn>
      </S.ContentArea>
    )
  }

  const onToggleActive = async (r: ReferralRule, next: boolean) => {
    await updateReferralRule(orgId, r.id, { activeFlag: next })
    await reload()
  }

  const onDelete = async (r: ReferralRule) => {
    await deleteReferralRule(orgId, r.id)
    await reload()
  }

  const onAdd = async () => {
    if (!selectedId) return
    const input: ReferralRuleInput = {
      name: draft.name,
      description: draft.description || null,
      severity: draft.severity,
      triggerConditions: draft.triggerConditions,
      referralDestinationType: draft.referralDestinationType || null,
      referralDestinationId: draft.referralDestinationId || null,
      activeFlag: draft.activeFlag,
      sortOrder: draft.sortOrder,
    }
    await createReferralRule(orgId, selectedId, input)
    setDraft(EMPTY_DRAFT)
    await reload()
  }

  const columns: DataTableColumn<ReferralRule>[] = [
    { key: 'name', header: 'Name', render: (r) => r.name },
    { key: 'severity', header: 'Severity', render: (r) => <Badge variant={statusTone(r.severity) as any}>{r.severity}</Badge> },
    { key: 'description', header: 'Description', render: (r) => r.description ?? '—' },
    {
      key: 'destination',
      header: 'Destination',
      render: (r) => `${r.referralDestinationType ?? '—'}:${r.referralDestinationId ?? ''}`,
    },
    { key: 'trigger', header: 'Trigger', render: (r) => <MonoCell>{JSON.stringify(r.triggerConditions)}</MonoCell> },
    {
      key: 'active',
      header: 'Active',
      render: (r) => (
        <input
          type="checkbox"
          checked={r.activeFlag}
          onChange={(e: any) => onToggleActive(r, e.target.checked)}
        />
      ),
    },
  ]

  return (
    <S.ContentArea>
      <S.LeftColumn>
        <S.Section>
          <S.SectionHeader>
            <S.SectionTitle>Referral Rules</S.SectionTitle>
            <S.SectionRule />
          </S.SectionHeader>

          <Toolbar>
            <DefinitionPicker definitions={definitions} selectedId={selectedId} onSelect={select} />
            <HelperText>
              Referral rules escalate submissions for manual review. Severity levels (Low / Medium / High / Critical)
              drive escalation: higher severities route to more senior destinations and block automated decisions.
            </HelperText>
          </Toolbar>

          {loading && <MutedText>Loading…</MutedText>}
          {error && <ErrorText>{error}</ErrorText>}

          <DataTable<ReferralRule>
            columns={columns}
            data={rules}
            emptyText="No referral rules yet."
            rowActions={(r) => (
              <div style={{ display: 'flex', gap: 6 }}>
                <Button variant="ghost" onClick={() => onDelete(r)}>Delete</Button>
              </div>
            )}
          />

          <div style={{ marginTop: 24 }}>
            <S.SectionHeader><S.SectionTitle>Add Referral Rule</S.SectionTitle><S.SectionRule /></S.SectionHeader>
            <FormGrid>
              <FormField
                label="Name"
                value={draft.name}
                onChange={(e: any) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
              <FormField
                label="Description"
                value={draft.description}
                onChange={(e: any) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
              <Field label="Severity">
                <OptionSelect
                  organizationId={orgId}
                  optionKey="governance.referral.severity"
                  value={draft.severity}
                  onChange={(v) => setDraft((d) => ({ ...d, severity: v }))}
                  includeBlank="—"
                />
              </Field>
              <Field label="Referral Destination Type">
                <Select
                  value={draft.referralDestinationType}
                  onChange={(e: any) => setDraft((d) => ({ ...d, referralDestinationType: e.target.value }))}
                >
                  <option value="">—</option>
                  <option value="user">user</option>
                  <option value="group">group</option>
                </Select>
              </Field>
              <FormField
                label="Referral Destination Id"
                value={draft.referralDestinationId}
                onChange={(e: any) => setDraft((d) => ({ ...d, referralDestinationId: e.target.value }))}
              />
              <Field label="Trigger Conditions (JSON)">
                <Textarea
                  value={draft.triggerRaw}
                  onChange={(e: any) => {
                    const raw = e.target.value
                    try {
                      const parsed = raw ? JSON.parse(raw) : {}
                      setDraft((d) => ({ ...d, triggerRaw: raw, triggerConditions: parsed }))
                    } catch {
                      setDraft((d) => ({ ...d, triggerRaw: raw })) // keep raw while mid-edit; validated on next parse
                    }
                  }}
                />
              </Field>
              <FormField
                label="Sort Order"
                type="number"
                value={String(draft.sortOrder)}
                onChange={(e: any) => setDraft((d) => ({ ...d, sortOrder: e.target.value === '' ? 0 : Number(e.target.value) }))}
              />
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={draft.activeFlag}
                  onChange={(e: any) => setDraft((d) => ({ ...d, activeFlag: e.target.checked }))}
                />
                <FieldLabel>Active</FieldLabel>
              </label>
              <div style={{ marginTop: 8 }}>
                <Button variant="primary" disabled={!selectedId} onClick={onAdd}>Add Referral Rule</Button>
              </div>
            </FormGrid>
          </div>
        </S.Section>
      </S.LeftColumn>
    </S.ContentArea>
  )
}
