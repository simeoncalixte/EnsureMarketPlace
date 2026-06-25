import React, { useEffect, useMemo, useState } from 'react'
import * as S from '../InsurerDashboard/InsurerDashboard.styles'
import DataTable, { DataTableColumn } from '../../xds/components/DataTable'
import Badge from '../../xds/components/Badge'
import Select from '../../xds/components/Select'
import { useAuthMe } from '../../lib/useAuthMe'
import { AuditEntry, listAudit } from '../../api/governance'
import {
  FieldLabel,
  MutedText,
  ErrorText,
  Toolbar,
  HelperText,
  MonoCell,
  statusTone,
  useCapacityDefinitions,
} from './governanceShared'

// Section 17 — Audit and Governance: org-scoped, read-only history of every
// capacity-definition change, optionally filtered to a single definition.
const SNAPSHOT_KEYS = ['name', 'status', 'versionNumber']

function compactSnapshot(snapshot: Record<string, unknown>): string {
  const picked: Record<string, unknown> = {}
  for (const key of SNAPSHOT_KEYS) {
    if (snapshot && key in snapshot) picked[key] = snapshot[key]
  }
  return JSON.stringify(picked)
}

export default function AuditLog() {
  const { user } = useAuthMe()
  const orgId = user?.organizationId ?? null

  const { definitions } = useCapacityDefinitions(orgId)

  const [filterId, setFilterId] = useState<string>('')
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const definitionName = useMemo(() => {
    const map = new Map<number, string>()
    for (const d of definitions) map.set(d.id, d.name)
    return map
  }, [definitions])

  useEffect(() => {
    let alive = true
    if (!orgId) return
    setLoading(true)
    setError(null)
    listAudit(orgId, filterId ? Number(filterId) : undefined)
      .then((rows) => {
        if (alive) setEntries(rows)
      })
      .catch((e: any) => {
        if (alive) setError(e?.message ?? 'Failed to load audit history')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [orgId, filterId])

  if (!orgId) {
    return (
      <S.ContentArea>
        <S.LeftColumn>
          <S.Section>
            <S.SectionHeader><S.SectionTitle>Audit Log</S.SectionTitle><S.SectionRule /></S.SectionHeader>
            <MutedText>No organization is associated with your account.</MutedText>
          </S.Section>
        </S.LeftColumn>
      </S.ContentArea>
    )
  }

  const columns: DataTableColumn<AuditEntry>[] = [
    { key: 'when', header: 'When', render: (e) => new Date(e.createdAt).toLocaleString() },
    { key: 'action', header: 'Action', render: (e) => <Badge variant={statusTone(e.action) as any}>{e.action}</Badge> },
    { key: 'version', header: 'Version', render: (e) => e.versionNumber ?? '—' },
    {
      key: 'definition',
      header: 'Definition',
      render: (e) => definitionName.get(e.capacityDefinitionId) ?? `#${e.capacityDefinitionId}`,
    },
    { key: 'reason', header: 'Change Reason', render: (e) => e.changeReason ?? '—' },
    { key: 'by', header: 'By', render: (e) => e.changedByUserId ?? '—' },
    { key: 'snapshot', header: 'Snapshot', render: (e) => <MonoCell>{compactSnapshot(e.snapshot)}</MonoCell> },
  ]

  return (
    <S.ContentArea>
      <S.LeftColumn>
        <S.Section>
          <S.SectionHeader>
            <S.SectionTitle>Audit Log</S.SectionTitle>
            <S.SectionRule />
          </S.SectionHeader>

          {error && <ErrorText>{error}</ErrorText>}

          <Toolbar>
            <div>
              <FieldLabel>Capacity Definition</FieldLabel>
              <Select value={filterId} onChange={(e: any) => setFilterId(e.target.value)}>
                <option value="">All definitions</option>
                {definitions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <HelperText>Every change is timestamped, versioned, auditable and recoverable.</HelperText>
          </Toolbar>

          {loading && <MutedText>Loading…</MutedText>}

          <DataTable<AuditEntry>
            columns={columns}
            data={entries}
            emptyText="No audit history yet."
          />
        </S.Section>
      </S.LeftColumn>
    </S.ContentArea>
  )
}
