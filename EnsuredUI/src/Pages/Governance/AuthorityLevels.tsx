import React, { useCallback, useEffect, useState } from 'react'
import * as S from '../InsurerDashboard/InsurerDashboard.styles'
import Button from '../../xds/components/Button'
import DataTable, { DataTableColumn } from '../../xds/components/DataTable'
import FormField from '../../xds/components/FormField'
import Input from '../../xds/components/Input'
import { useAuthMe } from '../../lib/useAuthMe'
import {
  AuthorityLevel,
  AuthorityLevelInput,
  listAuthorityLevels,
  createAuthorityLevel,
  deleteAuthorityLevel,
} from '../../api/governance'
import {
  Field,
  MutedText,
  ErrorText,
  FormGrid,
  Toolbar,
  HelperText,
  useCapacityDefinitions,
  useSelectedDefinition,
  DefinitionPicker,
} from './governanceShared'

type Draft = {
  name: string
  maxPremiumAuthority: string
  maxExposureAuthority: string
  maxPricingDeviation: string
  maxDiscountAuthority: string
  maxCreditAuthority: string
  referralThreshold: string
  sortOrder: string
}

const EMPTY_DRAFT: Draft = {
  name: '',
  maxPremiumAuthority: '',
  maxExposureAuthority: '',
  maxPricingDeviation: '',
  maxDiscountAuthority: '',
  maxCreditAuthority: '',
  referralThreshold: '',
  sortOrder: '',
}

function num(value: string): number | undefined {
  if (value.trim() === '') return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}

function showNum(value: string | null): string {
  return value == null || value === '' ? '—' : String(value)
}

export default function AuthorityLevels() {
  const { user } = useAuthMe()
  const orgId = user?.organizationId ?? null
  const { definitions } = useCapacityDefinitions(orgId)
  const { selectedId, select } = useSelectedDefinition(definitions)

  const [levels, setLevels] = useState<AuthorityLevel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)

  const reload = useCallback(async () => {
    if (!orgId || !selectedId) {
      setLevels([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      setLevels(await listAuthorityLevels(orgId, selectedId))
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load authority levels')
    } finally {
      setLoading(false)
    }
  }, [orgId, selectedId])

  useEffect(() => {
    reload()
  }, [reload])

  if (!orgId) {
    return (
      <S.ContentArea>
        <S.LeftColumn>
          <S.Section>
            <S.SectionHeader><S.SectionTitle>Authority Levels</S.SectionTitle><S.SectionRule /></S.SectionHeader>
            <MutedText>No organization is associated with your account.</MutedText>
          </S.Section>
        </S.LeftColumn>
      </S.ContentArea>
    )
  }

  const onDelete = async (rowId: number) => {
    setBusy(true)
    try {
      await deleteAuthorityLevel(orgId, rowId)
      await reload()
    } finally {
      setBusy(false)
    }
  }

  const onAdd = async () => {
    if (!selectedId) return
    setBusy(true)
    setError(null)
    try {
      const input: AuthorityLevelInput = {
        name: draft.name.trim() || 'Untitled level',
        maxPremiumAuthority: num(draft.maxPremiumAuthority) as any,
        maxExposureAuthority: num(draft.maxExposureAuthority) as any,
        maxPricingDeviation: num(draft.maxPricingDeviation) as any,
        maxDiscountAuthority: num(draft.maxDiscountAuthority) as any,
        maxCreditAuthority: num(draft.maxCreditAuthority) as any,
        referralThreshold: num(draft.referralThreshold) as any,
        sortOrder: num(draft.sortOrder),
      }
      await createAuthorityLevel(orgId, selectedId, input)
      setDraft(EMPTY_DRAFT)
      await reload()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to add authority level')
    } finally {
      setBusy(false)
    }
  }

  const columns: DataTableColumn<AuthorityLevel>[] = [
    { key: 'name', header: 'Name', render: (r) => r.name },
    { key: 'maxPremiumAuthority', header: 'Max Premium Authority', render: (r) => showNum(r.maxPremiumAuthority) },
    { key: 'maxExposureAuthority', header: 'Max Exposure Authority', render: (r) => showNum(r.maxExposureAuthority) },
    { key: 'maxPricingDeviation', header: 'Max Pricing Deviation (%)', render: (r) => showNum(r.maxPricingDeviation) },
    { key: 'maxDiscountAuthority', header: 'Max Discount Authority (%)', render: (r) => showNum(r.maxDiscountAuthority) },
    { key: 'maxCreditAuthority', header: 'Max Credit Authority (%)', render: (r) => showNum(r.maxCreditAuthority) },
    { key: 'referralThreshold', header: 'Referral Threshold', render: (r) => showNum(r.referralThreshold) },
  ]

  return (
    <S.ContentArea>
      <S.LeftColumn>
        <S.Section>
          <S.SectionHeader>
            <S.SectionTitle>Authority Levels</S.SectionTitle>
            <S.SectionRule />
          </S.SectionHeader>

          <Toolbar>
            <DefinitionPicker definitions={definitions} selectedId={selectedId} onSelect={select} />
            <HelperText>Must support multiple authority levels.</HelperText>
          </Toolbar>

          {loading && <MutedText>Loading…</MutedText>}
          {error && <ErrorText>{error}</ErrorText>}

          <DataTable<AuthorityLevel>
            columns={columns}
            data={levels}
            emptyText="No authority levels yet."
            rowActions={(r) => (
              <Button variant="ghost" disabled={busy} onClick={() => onDelete(r.id)}>Delete</Button>
            )}
          />

          <S.SectionHeader>
            <S.SectionTitle>Add Authority Level</S.SectionTitle>
            <S.SectionRule />
          </S.SectionHeader>

          <FormGrid>
            <Field label="Name">
              <Input
                value={draft.name}
                onChange={(e: any) => setDraft((p) => ({ ...p, name: e.target.value }))}
              />
            </Field>
            <FormField
              label="Max Premium Authority ($)"
              type="number"
              value={draft.maxPremiumAuthority}
              onChange={(e: any) => setDraft((p) => ({ ...p, maxPremiumAuthority: e.target.value }))}
            />
            <FormField
              label="Max Exposure Authority ($)"
              type="number"
              value={draft.maxExposureAuthority}
              onChange={(e: any) => setDraft((p) => ({ ...p, maxExposureAuthority: e.target.value }))}
            />
            <FormField
              label="Max Pricing Deviation (%)"
              type="number"
              value={draft.maxPricingDeviation}
              onChange={(e: any) => setDraft((p) => ({ ...p, maxPricingDeviation: e.target.value }))}
            />
            <FormField
              label="Max Discount Authority (%)"
              type="number"
              value={draft.maxDiscountAuthority}
              onChange={(e: any) => setDraft((p) => ({ ...p, maxDiscountAuthority: e.target.value }))}
            />
            <FormField
              label="Max Credit Authority (%)"
              type="number"
              value={draft.maxCreditAuthority}
              onChange={(e: any) => setDraft((p) => ({ ...p, maxCreditAuthority: e.target.value }))}
            />
            <FormField
              label="Referral Threshold ($)"
              type="number"
              value={draft.referralThreshold}
              onChange={(e: any) => setDraft((p) => ({ ...p, referralThreshold: e.target.value }))}
            />
            <FormField
              label="Sort Order"
              type="number"
              value={draft.sortOrder}
              onChange={(e: any) => setDraft((p) => ({ ...p, sortOrder: e.target.value }))}
            />
            <div>
              <Button variant="primary" disabled={busy || !selectedId} onClick={onAdd}>Add</Button>
            </div>
          </FormGrid>
        </S.Section>
      </S.LeftColumn>
    </S.ContentArea>
  )
}
