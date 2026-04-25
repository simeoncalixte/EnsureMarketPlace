import React from 'react'
import HeroHeader from '../../xds/components/HeroHeader'
import MetricCard from '../../xds/components/MetricCard'
import BentoStep from '../../xds/components/BentoStep'
import DealCard from '../../xds/components/DealCard'
import MapPanel from '../../xds/components/MapPanel'
import { spacing } from '../../xds/tokens'

const LandingPage: React.FC = () => {
  return (
    <main style={{ paddingTop: 64, paddingBottom: 80, padding: `0 ${spacing.lg}px` }}>
      <section style={{ position: 'relative', minHeight: 520, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `0 ${spacing.xl}px` }}>
        <div style={{  zIndex: 10 }}>
          <HeroHeader title={'Programmable\nReinsurance Capital'} subtitle={'The sovereign infrastructure for parametric risk. Deploy capital into algorithmic tranches or hedge global catastrophes with real-time settlement logic.'} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 24 }}>
            <MetricCard label="Total Capital Locked" value="$1.28B" delta="+14.2% YoY" accent={undefined} />
            <MetricCard label="Active Deals" value="142" delta="Verified Tranches" />
            <MetricCard label="Avg. Returns" value="12.4%" delta="NET APY" />
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button style={{ padding: '12px 24px', background: '#4b8eff', color: '#05204b', fontWeight: 800, borderRadius: 8 }}>Deploy Capital</button>
            <button style={{ padding: '12px 24px', border: '1px solid rgba(148,163,184,0.2)', background: 'transparent', color: '#e6eef8', fontWeight: 700, borderRadius: 8 }}>Transfer Risk</button>
          </div>
        </div>
      </section>

      <section style={{ padding: '48px 40px', background: 'transparent' }}>
        <div style={{  margin: '0 auto' }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', color: '#4b8eff', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 }}>Architecture</div>
            <h2 style={{ fontSize: 28, margin: '12px 0' }}>Systemic Liquidity Flow</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            <BentoStep index={1} title={'Tokenize Risk'} body={'Underwriters define catastrophe parameters. Risk is fractionalized into smart-contract tranches with transparent loss-exceedance curves.'} accent={undefined} />
            <BentoStep index={2} title={'Pool Capital'} body={'Institutional liquidity providers deposit stablecoins into automated vaults, matching risk profiles with capital requirements.'} accent={'#7ee787'} />
            <BentoStep index={3} title={'Execute Triggers'} body={'Oracles monitor real-time weather and tectonic data. Payouts are instant and automated when parameters are met.'} accent={'#ffd166'} />
          </div>
        </div>
      </section>

      <section style={{ padding: '48px 40px' }}>
        <div style={{  margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
            <div>
              <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', color: '#4b8eff', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 }}>Marketplace</div>
              <h2 style={{ fontSize: 28, margin: '12px 0' }}>Active Capital Tranches</h2>
            </div>
            <a href="#" style={{ color: '#4b8eff', fontFamily: 'ui-monospace, Menlo, monospace' }}>VIEW ALL DEALS →</a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <DealCard title={'Gulf Coast Windstorm 24-B'} subtitle={'TX-FL | CAT 4+ THRESHOLD'} yieldText={'14.2% APY'} capacity={'$45.0M / $50M'} riskLevel={2} />
            <DealCard title={'Pacific Basin Seismic'} subtitle={'RING OF FIRE | 7.2 MW'} yieldText={'9.8% APY'} capacity={'$120.0M / $200M'} riskLevel={1} />
            <DealCard title={'EU Precipitation Hedge'} subtitle={'WESTERN EUROPE | INDEXED'} yieldText={'11.5% APY'} capacity={'$12.4M / $15M'} riskLevel={3} />
          </div>
        </div>
      </section>

      <section style={{ padding: '48px 40px' }}>
        <div style={{  margin: '0 auto' }}>
          <MapPanel title={'Global Risk Feed'} stats={[{ label: 'TOTAL TVL MAP', value: '$4.2B' }, { label: 'ACTIVE TRANCHES', value: '142' }]} />
        </div>
      </section>
    </main>
  )
}

export default LandingPage
