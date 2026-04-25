import React, { useState } from 'react'
import SelectionCard from '../../xds/components/SelectionCard'
import InfoCard from '../../xds/components/InfoCard'
import { Button } from '../../xds/components/Button'
import { colors } from '../../xds/colors'

type RoleType = 'institutional' | 'insurer' | null

const RoleSelection: React.FC = () => {
  const [selected, setSelected] = useState<RoleType>(null)

  return (
    <main>
      <section style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 40, margin: 0, fontWeight: 900 }}>Define Your Role in the <span style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`, WebkitBackgroundClip: 'text' as any, color: 'transparent' }}>Capital Stack</span></h1>
        <p style={{ color: colors.onSurfaceVariant, marginTop: 10, maxWidth: 680 }}>Select your operational profile to access Sovereign Re’s institutional reinsurance liquidity and risk modeling framework.</p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
        <SelectionCard
          title="Institutional Investor"
          subtitle="Entity / Treasury"
          icon={'🏛️'}
          accentColor={colors.primary}
          active={selected === 'institutional'}
          onClick={() => setSelected('institutional')}
          footerLabel="Requires Entity Verification"
          ctaText="Configure Entity"
        >
          <p style={{ color: colors.onSurfaceVariant, marginBottom: 18 }}>Deploy programmable capital into diversified reinsurance tranches with high-fidelity risk transparency.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ color: colors.secondary }}>✔</span><div style={{ fontSize: 12, color: colors.onSurface }}>Direct access to CAT-risk yields</div></div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ color: colors.secondary }}>✔</span><div style={{ fontSize: 12, color: colors.onSurface }}>Automated capital calls and distributions</div></div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ color: colors.secondary }}>✔</span><div style={{ fontSize: 12, color: colors.onSurface }}>Real-time loss curve monitoring</div></div>
          </div>
        </SelectionCard>

        <SelectionCard
          title="Insurer / MGA"
          subtitle="Capacity Partner"
          icon={'🛡️'}
          accentColor={colors.secondary}
          active={selected === 'insurer'}
          onClick={() => setSelected('insurer')}
          footerLabel="Subject to KYC"
          ctaText="Connect Capacity"
        >
          <p style={{ color: colors.onSurfaceVariant, marginBottom: 18 }}>Access on-demand reinsurance capacity and transfer risk through cryptographically secure smart contracts.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ color: colors.secondary }}>✔</span><div style={{ fontSize: 12, color: colors.onSurface }}>Instant capacity provisioning</div></div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ color: colors.secondary }}>✔</span><div style={{ fontSize: 12, color: colors.onSurface }}>Programmable claims logic</div></div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ color: colors.secondary }}>✔</span><div style={{ fontSize: 12, color: colors.onSurface }}>Reduced brokerage overhead</div></div>
          </div>
        </SelectionCard>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
        <InfoCard title="Global TVL Index" value="$1.24B" tone="primary" />
        <InfoCard title="Active Claims Pool" value="312" tone="secondary" />
        <InfoCard title="Epoch Status" value="Settling" tone="secondary" />
      </section>

      <footer style={{ marginTop: 28, borderTop: `1px solid ${colors.outlineVariant}`, paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 8, background: colors.surfaceContainerHighest, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
            🔒
          </div>
          <p style={{ maxWidth: 520, color: colors.onSurfaceVariant, fontSize: 13 }}>SOC2 Type II & GDPR-compliant infrastructure. Identity and KYC data are protected.</p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="ghost" style={{ background: 'transparent', border: `1px solid ${colors.outlineVariant}`, color: colors.onSurfaceVariant }}>Back</Button>
          <Button variant="primary" onClick={() => selected ? alert(`Proceeding as ${selected}`) : alert('Please select a profile')} style={{ padding: '10px 20px', fontWeight: 800 }}>{selected ? 'Continue' : 'Continue'}</Button>
        </div>
      </footer>
    </main>
  )
}

export default RoleSelection
