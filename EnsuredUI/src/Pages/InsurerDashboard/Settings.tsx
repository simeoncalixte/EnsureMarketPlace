import React, { useState } from 'react'
import * as S from './InsurerDashboard.styles'

export default function Settings() {
  const [companyName, setCompanyName] = useState('Acme Re')
  const [timezone, setTimezone] = useState('UTC')

  return (
    <S.ContentArea>
      <S.LeftColumn>
        <S.Section>
          <S.SectionHeader>
            <S.SectionTitle>Settings</S.SectionTitle>
            <S.SectionRule />
          </S.SectionHeader>

          <div style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
            <div>
              <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Company Name</label>
              <S.Input value={companyName} onChange={(e: any) => setCompanyName(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Timezone</label>
              <S.Select value={timezone} onChange={(e: any) => setTimezone(e.target.value)}>
                <option>UTC</option>
                <option>America/New_York</option>
                <option>Europe/London</option>
              </S.Select>
            </div>

            <div style={{ marginTop: 8 }}>
              <button style={{ background: '#4b8eff', color: '#001a41', padding: '0.6rem 1rem', borderRadius: 8, border: 'none', fontWeight: 800 }}>Save Settings</button>
            </div>
          </div>
        </S.Section>
      </S.LeftColumn>

      <S.RightAside>
        <S.SummaryCard>
          <S.SummaryInner>
            <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Preferences</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>{companyName}</div>
          </S.SummaryInner>
          <div style={{ padding: 16, fontSize: 13, color: '#94a3b8' }}>Update basic insurer account settings and preferences.</div>
        </S.SummaryCard>
      </S.RightAside>
    </S.ContentArea>
  )
}
