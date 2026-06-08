import React from 'react'
import { Link } from 'react-router'
import styled from 'styled-components'
import * as S from '../InsurerDashboard/InsurerDashboard.styles'
import SectionHeader from '../../xds/components/SectionHeader'
import StatCard from '../../xds/components/StatCard'
import Badge from '../../xds/components/Badge'
import DataTable, { DataTableColumn } from '../../xds/components/DataTable'
import { colors } from '../../xds/colors'
import { spacing, radii } from '../../xds/tokens'

type Claim = { id: string; claimant: string; amount: number; status: string }

const sampleClaims: Claim[] = [
  { id: 'CL-001', claimant: 'Acme Corp', amount: 125000, status: 'Open' },
  { id: 'CL-002', claimant: 'Beta Holdings', amount: 420000, status: 'Under Review' },
  { id: 'CL-003', claimant: 'Gamma Re', amount: 98000, status: 'Settled' }
]

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${spacing.lg}px;
`

const BackLink = styled(Link)`
  color: ${colors.primary};
  text-decoration: none;
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }
`

const TableShell = styled.div`
  border: 1px solid ${colors.outlineVariant};
  border-radius: ${radii.lg}px;
  overflow: hidden;
`

const ViewLink = styled(Link)`
  color: ${colors.secondary};
  text-decoration: none;
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }
`

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function statusVariant(status: string): 'primary' | 'warning' | 'success' | 'neutral' {
  if (status === 'Open') return 'primary'
  if (status === 'Under Review') return 'warning'
  if (status === 'Settled') return 'success'
  return 'neutral'
}

const columns: DataTableColumn<Claim>[] = [
  {
    key: 'claimant',
    header: 'Claimant',
    render: (c) => (
      <span>
        {c.claimant} <span className="mono-data">{c.id}</span>
      </span>
    )
  },
  { key: 'amount', header: 'Amount', align: 'right', render: (c) => currencyFormatter.format(c.amount) },
  {
    key: 'status',
    header: 'Status',
    render: (c) => <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
  }
]

export default function ClaimsDashboard() {
  return (
    <>
      <S.ContentArea>
        <S.LeftColumn>
          <HeaderRow>
            <SectionHeader title="Claims" subtitle="Recent claim activity" />
            <BackLink to="/">Back to Dashboard</BackLink>
          </HeaderRow>

          <TableShell>
            <DataTable<Claim>
              columns={columns}
              data={sampleClaims}
              emptyText="No claims yet."
              rowActions={(c) => <ViewLink to={`/insurer/claims/${c.id}`}>View</ViewLink>}
            />
          </TableShell>
        </S.LeftColumn>

        <S.RightAside>
          <StatCard label="Recent Claims" value="3" note="Items" />
        </S.RightAside>
      </S.ContentArea>
    </>
  )
}
