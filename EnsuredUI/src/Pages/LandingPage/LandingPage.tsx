import React from 'react'
import styled from 'styled-components'
import HeroHeader from '../../xds/components/HeroHeader'
import MetricCard from '../../xds/components/MetricCard'
import BentoStep from '../../xds/components/BentoStep'
import DealCard from '../../xds/components/DealCard'
import MapPanel from '../../xds/components/MapPanel'
import Button from '../../xds/components/Button'
import { colors } from '../../xds/colors'
import { spacing } from '../../xds/tokens'

const Page = styled.main`
  padding: 0 ${spacing.lg}px;
  padding-bottom: 80px;
`

const HeroSection = styled.section`
  position: relative;
  min-height: 520px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 ${spacing.xl}px;
`

const HeroInner = styled.div`
  z-index: 10;
`

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${spacing.sm}px;
  margin-top: ${spacing.lg}px;
`

const HeroActions = styled.div`
  margin-top: 20px;
  display: flex;
  gap: 12px;
`

const Section = styled.section`
  padding: 48px 40px;
`

const SectionInner = styled.div`
  margin: 0 auto;
`

const SectionHeadingBlock = styled.div`
  margin-bottom: 32px;
`

const SectionHeadingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: ${spacing.lg}px;
`

const Eyebrow = styled.div`
  font-family: ui-monospace, Menlo, monospace;
  color: ${colors.primary};
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 2px;
`

const SectionTitle = styled.h2`
  font-size: 28px;
  margin: 12px 0;
  color: ${colors.text.primary};
`

const ViewAllLink = styled.a`
  color: ${colors.primary};
  font-family: ui-monospace, Menlo, monospace;
  text-decoration: none;
`

const BentoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${spacing.md}px;
`

const DealList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const LandingPage: React.FC = () => {
  return (
    <Page>
      <HeroSection>
        <HeroInner>
          <HeroHeader title={'Programmable\nReinsurance Capital'} subtitle={'The sovereign infrastructure for parametric risk. Deploy capital into algorithmic tranches or hedge global catastrophes with real-time settlement logic.'} />

          <MetricsGrid>
            <MetricCard label="Total Capital Locked" value="$1.28B" delta="+14.2% YoY" accent={undefined} />
            <MetricCard label="Active Deals" value="142" delta="Verified Tranches" />
            <MetricCard label="Avg. Returns" value="12.4%" delta="NET APY" />
          </MetricsGrid>

          <HeroActions>
            <Button variant="primary">Deploy Capital</Button>
            <Button variant="outline">Transfer Risk</Button>
          </HeroActions>
        </HeroInner>
      </HeroSection>

      <Section>
        <SectionInner>
          <SectionHeadingBlock>
            <Eyebrow>Architecture</Eyebrow>
            <SectionTitle>Systemic Liquidity Flow</SectionTitle>
          </SectionHeadingBlock>

          <BentoGrid>
            <BentoStep index={1} title={'Tokenize Risk'} body={'Underwriters define catastrophe parameters. Risk is fractionalized into smart-contract tranches with transparent loss-exceedance curves.'} accent={undefined} />
            <BentoStep index={2} title={'Pool Capital'} body={'Institutional liquidity providers deposit stablecoins into automated vaults, matching risk profiles with capital requirements.'} accent={colors.secondary} />
            <BentoStep index={3} title={'Execute Triggers'} body={'Oracles monitor real-time weather and tectonic data. Payouts are instant and automated when parameters are met.'} accent={colors.dataViz.amber} />
          </BentoGrid>
        </SectionInner>
      </Section>

      <Section>
        <SectionInner>
          <SectionHeadingRow>
            <div>
              <Eyebrow>Marketplace</Eyebrow>
              <SectionTitle>Active Capital Tranches</SectionTitle>
            </div>
            <ViewAllLink href="#">VIEW ALL DEALS →</ViewAllLink>
          </SectionHeadingRow>

          <DealList>
            <DealCard title={'Gulf Coast Windstorm 24-B'} subtitle={'TX-FL | CAT 4+ THRESHOLD'} yieldText={'14.2% APY'} capacity={'$45.0M / $50M'} riskLevel={2} />
            <DealCard title={'Pacific Basin Seismic'} subtitle={'RING OF FIRE | 7.2 MW'} yieldText={'9.8% APY'} capacity={'$120.0M / $200M'} riskLevel={1} />
            <DealCard title={'EU Precipitation Hedge'} subtitle={'WESTERN EUROPE | INDEXED'} yieldText={'11.5% APY'} capacity={'$12.4M / $15M'} riskLevel={3} />
          </DealList>
        </SectionInner>
      </Section>

      <Section>
        <SectionInner>
          <MapPanel title={'Global Risk Feed'} stats={[{ label: 'TOTAL TVL MAP', value: '$4.2B' }, { label: 'ACTIVE TRANCHES', value: '142' }]} />
        </SectionInner>
      </Section>
    </Page>
  )
}

export default LandingPage
