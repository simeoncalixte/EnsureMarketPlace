import React from 'react'
import { Link } from 'react-router'
import * as S from '../InsurerDashboard/InsurerDashboard.styles'

const sampleClaims = [
  { id: 'CL-001', claimant: 'Acme Corp', amount: 125000, status: 'Open' },
  { id: 'CL-002', claimant: 'Beta Holdings', amount: 420000, status: 'Under Review' },
  { id: 'CL-003', claimant: 'Gamma Re', amount: 98000, status: 'Settled' }
]

export default function ClaimsDashboard() {
  return (
    <>
      <S.ContentArea>
        <S.LeftColumn>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: 24 }}>Claims</h1>
            <Link to="/" style={{ color: '#4b8eff', textDecoration: 'none' }}>Back to Dashboard</Link>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {sampleClaims.map((c) => (
              <div key={c.id} style={{ background: '#0f1724', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.claimant} <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>{c.id}</span></div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{c.status} • {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c.amount)}</div>
                </div>
                <div>
                  <Link to={`/insurer/claims/${c.id}`} style={{ color: '#4edea3', textDecoration: 'none' }}>View</Link>
                </div>
              </div>
            ))}
          </div>
        </S.LeftColumn>

        <S.RightAside>
          <S.SummaryCard>
            <S.SummaryInner>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Recent Claims</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>3 Items</div>
            </S.SummaryInner>
          </S.SummaryCard>
        </S.RightAside>
      </S.ContentArea>
    </>
  )
}
