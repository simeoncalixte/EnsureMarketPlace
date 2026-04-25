import React from 'react'
import * as S from './InsurerDashboard.styles'

export default function Reports() {
  return (
    <S.ContentArea>
      <S.LeftColumn>
        <S.Section>
          <S.SectionHeader>
            <S.SectionTitle>Reports</S.SectionTitle>
            <S.SectionRule />
          </S.SectionHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#0f1724', padding: 16, borderRadius: 8 }}>
              <div style={{ fontWeight: 800 }}>Monthly Exposure Report</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Generated: Apr 14, 2026 • CSV</div>
            </div>

            <div style={{ background: '#0f1724', padding: 16, borderRadius: 8 }}>
              <div style={{ fontWeight: 800 }}>Loss Expectancy Summary</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Generated: Apr 10, 2026 • PDF</div>
            </div>
          </div>
        </S.Section>
      </S.LeftColumn>

      <S.RightAside>
        <S.SummaryCard>
          <S.SummaryInner>
            <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Recent Reports</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>2</div>
          </S.SummaryInner>
          <div style={{ padding: 16, fontSize: 13, color: '#94a3b8' }}>Export, download, or schedule automated reports for your insurer portfolio.</div>
        </S.SummaryCard>
      </S.RightAside>
    </S.ContentArea>
  )
}
