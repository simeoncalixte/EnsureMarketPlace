import React, { useState } from 'react'
import styled from 'styled-components'
import { Button } from '../../xds/components/Button'
import SelectionCard from '../../xds/components/SelectionCard'
import InfoCard from '../../xds/components/InfoCard'
import { colors } from '../../xds/colors'

type ProfileType = 'institutional' | 'retail' | null

const PageHeader = styled.section`
  margin-bottom: 40px;
`

const PageTitle = styled.h1`
  font-size: 40px;
  margin: 0;
  font-weight: 900;
`

const GradientText = styled.span`
  background: linear-gradient(90deg, ${colors.primary}, ${colors.secondary});
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`

const PageLede = styled.p`
  color: ${colors.onSurfaceVariant};
  margin-top: 10px;
  max-width: 680px;
`

const CardsGrid = styled.section`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 28px;
`

const SummaryGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 12px;
`

const CardIntro = styled.p`
  color: ${colors.onSurfaceVariant};
  margin-bottom: 18px;
`

const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
`

const FeatureItem = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`

const FeatureCheck = styled.span`
  color: ${colors.secondary};
`

const FeatureLabel = styled.div`
  font-size: 12px;
  color: ${colors.onSurface};
`

const Footer = styled.footer`
  margin-top: 28px;
  border-top: 1px solid ${colors.outlineVariant};
  padding-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const SecurityNote = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`

const LockBadge = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: ${colors.surfaceContainerHighest};
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
`

const SecurityText = styled.p`
  max-width: 520px;
  color: ${colors.onSurfaceVariant};
  font-size: 13px;
`

const FooterActions = styled.div`
  display: flex;
  gap: 12px;
`

const BackButton = styled(Button)`
  background: transparent;
  border: 1px solid ${colors.outlineVariant};
  color: ${colors.onSurfaceVariant};
`

const ContinueButton = styled(Button)`
  padding: 10px 20px;
  font-weight: 800;
`

const CardFeatures: React.FC<{ intro: string; features: string[] }> = ({ intro, features }) => (
  <>
    <CardIntro>{intro}</CardIntro>
    <FeatureList>
      {features.map((feature) => (
        <FeatureItem key={feature}>
          <FeatureCheck>✔</FeatureCheck>
          <FeatureLabel>{feature}</FeatureLabel>
        </FeatureItem>
      ))}
    </FeatureList>
  </>
)

const InvestmentType: React.FC = () => {
	const [selected, setSelected] = useState<ProfileType>(null)

	return (
			<main>
				<PageHeader>
					<PageTitle>Define Your <GradientText>Investment Architecture.</GradientText></PageTitle>
					<PageLede>Select your operational profile to access specialized tranches, custom liquidity pools, and programmable risk parameters.</PageLede>
				</PageHeader>

				<CardsGrid>
					<SelectionCard
						title="Institutional"
						subtitle="High Density Access"
						icon={'🏛️'}
						accentColor={colors.primary}
						active={selected === 'institutional'}
						onClick={() => setSelected('institutional')}
						footerLabel="Requires LEI Verification"
						ctaText="Configure Entity"
					>
						<CardFeatures
							intro="For entities, sovereign wealth funds, and corporate treasuries requiring programmatic capital allocation and direct ledger interaction."
							features={['Bespoke Risk Tranches', 'Tax-Optimized Structures', 'Full API Node Access']}
						/>
					</SelectionCard>

					<SelectionCard
						title="Retail Accredited"
						subtitle="Verified Individual"
						icon={'👤'}
						accentColor={colors.secondary}
						active={selected === 'retail'}
						onClick={() => setSelected('retail')}
						footerLabel="Accreditation Auto-Check"
						ctaText="Proceed as Individual"
					>
						<CardFeatures
							intro="For professional individual investors seeking institutional-grade reinsurance yield through a streamlined, low-latency interface."
							features={['Curated Opportunity Funds', 'Simplified Dashboard UI', 'Lower Minimum Thresholds']}
						/>
					</SelectionCard>
				</CardsGrid>

				<SummaryGrid>
					<InfoCard title="Global TVL Index" value="$1.24B" tone="primary" />
					<InfoCard title="Active Claims Pool" value="312" tone="secondary" />
					<InfoCard title="Epoch Status" value="Settling" tone="secondary" />
				</SummaryGrid>

				<Footer>
					<SecurityNote>
						<LockBadge>🔒</LockBadge>
						<SecurityText>Programmable Capital utilizes end-to-end encryption for all identity verification. Your data is stored on-ledger with zero-knowledge proof protocols.</SecurityText>
					</SecurityNote>

					<FooterActions>
						<BackButton variant="ghost">Back</BackButton>
						<ContinueButton variant="primary" onClick={() => selected ? alert(`Proceeding as ${selected}`) : alert('Please select a profile')}>{selected ? 'Continue' : 'Skip for now'}</ContinueButton>
					</FooterActions>
				</Footer>
			</main>
	)
}

export default InvestmentType
