import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import * as S from './InsurerDashboard.styles'
import StatCard from '../../xds/components/StatCard'
import { colors } from '../../xds/colors'
import { getPolicies } from '../../api/underwriting'

type PolicySummary = {
  id: number
  policyNumber: string
  status: string | null
  policyType: string
  premium: number
  coverageLimit: number | null
  deductible: number | null
  insuredValue: number | null
  effectiveDate: string | null
  expirationDate: string | null
  currentVersionNumber: number | null
  submissionId: number | null
}

type PoliciesResponse = { items: PolicySummary[]; counts: { total: number; in_force: number } }

const CoverageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const CoverageRow = styled.div`
  background: ${colors.surfaceContainerHigh};
  padding: 16px;
  border-radius: 8px;
`

const CoverageHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
`

const CoverageTitle = styled.div`
  font-weight: 800;
`

const CoverageMeta = styled.div`
  color: ${colors.onSurfaceVariant};
  font-size: 13px;
`

const StatusPill = styled.span<{ $status: string | null }>`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
  color: ${({ $status }) => ($status === 'in_force' ? colors.success : colors.onSurfaceVariant)};
  background: ${({ $status }) =>
    $status === 'in_force' ? 'rgba(31, 157, 87, 0.12)' : 'rgba(120, 120, 120, 0.12)'};
`

const AsideNote = styled.div`
  padding: 16px;
  font-size: 13px;
  color: ${colors.onSurfaceVariant};
`

const StateNote = styled.div`
  padding: 24px 16px;
  text-align: center;
  color: ${colors.onSurfaceVariant};
  font-size: 14px;
`

const money = (value: number | null | undefined): string =>
  value == null
    ? '—'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

const humanizeStatus = (status: string | null): string =>
  status ? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Unknown'

const humanizeType = (type: string): string => type.replace(/\b\w/g, (c) => c.toUpperCase())

export default function ActiveCoverage() {
  const [data, setData] = useState<PoliciesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await getPolicies()
        if (!response.ok) {
          if (active) setError(`Unable to load policies (${response.status}).`)
          return
        }
        const body = (await response.json()) as PoliciesResponse
        if (active) setData(body)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : String(loadError))
      } finally {
        if (active) setIsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // In-force policies first, then everything else (cancelled/expired), newest-first within.
  const policies = (data?.items ?? [])
    .slice()
    .sort((a, b) => (a.status === 'in_force' ? 0 : 1) - (b.status === 'in_force' ? 0 : 1))
  const inForceCount = data?.counts.in_force ?? 0

  return (
    <S.ContentArea>
      <S.LeftColumn>
        <S.Section>
          <S.SectionHeader>
            <S.SectionTitle>Active Coverage</S.SectionTitle>
            <S.SectionRule />
          </S.SectionHeader>

          {isLoading ? (
            <StateNote>Loading the in-force book…</StateNote>
          ) : error ? (
            <StateNote>{error}</StateNote>
          ) : policies.length === 0 ? (
            <StateNote>
              No policies yet. Bind an accepted quote on the Incoming Submissions board to issue the first
              in-force policy.
            </StateNote>
          ) : (
            <CoverageList>
              {policies.map((policy) => (
                <CoverageRow key={policy.id}>
                  <CoverageHead>
                    <CoverageTitle>
                      {policy.policyNumber} • {humanizeType(policy.policyType)}
                    </CoverageTitle>
                    <StatusPill $status={policy.status}>{humanizeStatus(policy.status)}</StatusPill>
                  </CoverageHead>
                  <CoverageMeta>
                    Premium: {money(policy.premium)} • Limit: {money(policy.coverageLimit)} • Deductible:{' '}
                    {money(policy.deductible)}
                  </CoverageMeta>
                  <CoverageMeta>
                    Period: {policy.effectiveDate ?? '—'} → {policy.expirationDate ?? '—'}
                    {policy.currentVersionNumber ? ` • v${policy.currentVersionNumber}` : ''}
                  </CoverageMeta>
                </CoverageRow>
              ))}
            </CoverageList>
          )}
        </S.Section>
      </S.LeftColumn>

      <S.RightAside>
        <S.SummaryCard>
          <StatCard label="In-force Policies" value={String(inForceCount)} />
          <AsideNote>View and manage currently active coverage across your portfolio.</AsideNote>
        </S.SummaryCard>
      </S.RightAside>
    </S.ContentArea>
  )
}
