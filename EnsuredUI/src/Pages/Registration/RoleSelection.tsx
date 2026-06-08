import React, { useCallback, useState } from 'react'
import styled from 'styled-components'
import { useNavigate } from 'react-router'
import SelectionCard from '../../xds/components/SelectionCard'
import InfoCard from '../../xds/components/InfoCard'
import { Button } from '../../xds/components/Button'
import { colors } from '../../xds/colors'

type RoleType = 'institutional' | 'insurer' | 'underwriter' | 'claims' | 'broker' | 'admin' | null

type RoleCard = {
  id: Exclude<RoleType, null>
  title: string
  subtitle: string
  icon: React.ReactNode
  accentColor: string
  footerLabel: string
  ctaText: string
  features: string[]
  intro: string
}

type StatCard = {
  title: string
  value: string
  tone: 'primary' | 'secondary'
}

type RegistrationSession = {
  selectedRole: Exclude<RoleType, null>
  currentStep: 'role-selection' | 'kyc'
  updatedAt: string
}

const REGISTRATION_SESSION_KEY = 'registrationSession'

function readRegistrationSession(): RegistrationSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(REGISTRATION_SESSION_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as RegistrationSession
    if (!parsed?.selectedRole) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeRegistrationSession(session: RegistrationSession): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(REGISTRATION_SESSION_KEY, JSON.stringify(session))
}

const roleCards: RoleCard[] = [
  {
    id: 'institutional',
    title: 'Institutional Investor',
    subtitle: 'Entity / Treasury',
    icon: '🏛️',
    accentColor: colors.primary,
    footerLabel: 'Requires Entity Verification',
    ctaText: 'Configure Entity',
    intro: 'Deploy programmable capital into diversified reinsurance tranches with high-fidelity risk transparency.',
    features: [
      'Direct access to CAT-risk yields',
      'Automated capital calls and distributions',
      'Real-time loss curve monitoring',
    ],
  },
  {
    id: 'insurer',
    title: 'Insurer / MGA',
    subtitle: 'Capacity Partner',
    icon: '🛡️',
    accentColor: colors.secondary,
    footerLabel: 'Subject to KYC',
    ctaText: 'Connect Capacity',
    intro: 'Access on-demand reinsurance capacity and transfer risk through cryptographically secure smart contracts.',
    features: [
      'Instant capacity provisioning',
      'Programmable claims logic',
      'Reduced brokerage overhead',
    ],
  },
  {
    id: 'underwriter',
    title: 'Underwriter',
    subtitle: 'Risk Analysis',
    icon: '🔬',
    accentColor: colors.primary,
    footerLabel: 'Review and price submissions',
    ctaText: 'Open Underwriting',
    intro: 'Assess submissions, structure terms, and validate exposure before capacity is released.',
    features: [
      'Submission triage and workflow control',
      'Pricing and structure review',
      'Approval and audit trail visibility',
    ],
  },
  {
    id: 'claims',
    title: 'Claims Handler',
    subtitle: 'Loss Operations',
    icon: '📝',
    accentColor: colors.secondary,
    footerLabel: 'Manage incidents and payouts',
    ctaText: 'Open Claims',
    intro: 'Track reported events, document losses, and coordinate settlement workflows across stakeholders.',
    features: [
      'Incident intake and documentation',
      'Settlement and reserve coordination',
      'Stakeholder communication log',
    ],
  },
  {
    id: 'broker',
    title: 'Broker / Distribution',
    subtitle: 'Placement Partner',
    icon: '🤝',
    accentColor: colors.primary,
    footerLabel: 'Source and distribute risk',
    ctaText: 'Open Distribution',
    intro: 'Source deals, place capacity, and coordinate between cedents, carriers, and capital providers.',
    features: [
      'Deal sourcing and placement support',
      'Capacity matching and coordination',
      'Pipeline and distribution tracking',
    ],
  },
  {
    id: 'admin',
    title: 'Platform Admin',
    subtitle: 'Operations Control',
    icon: '🧭',
    accentColor: colors.secondary,
    footerLabel: 'Govern access and workflows',
    ctaText: 'Open Admin',
    intro: 'Manage user access, oversee platform configuration, and keep audit, policy, and routing controls in sync.',
    features: [
      'User and organization administration',
      'Policy and audit oversight',
      'System configuration and support',
    ],
  },
]

const summaryCards: StatCard[] = [
  { title: 'Global TVL Index', value: '$1.24B', tone: 'primary' },
  { title: 'Active Claims Pool', value: '312', tone: 'secondary' },
  { title: 'Epoch Status', value: 'Settling', tone: 'secondary' },
]

const RoleCardsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(240px, 320px));
  justify-content: center;
  gap: 24px;
  margin-bottom: 28px;

  @media (max-width: 1400px) {
    grid-template-columns: repeat(3, minmax(240px, 320px));
  }

  @media (max-width: 1080px) {
    grid-template-columns: repeat(2, minmax(240px, 320px));
  }

  @media (max-width: 720px) {
    grid-template-columns: minmax(240px, 1fr);
  }
`

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

const SummaryGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 12px;
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

const RoleSelection: React.FC = () => {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<RoleType>(() => readRegistrationSession()?.selectedRole ?? null)

  const handleSelect = useCallback((selectionId: string) => {
    const role = selectionId as Exclude<RoleType, null>
    setSelected(role)
    writeRegistrationSession({
      selectedRole: role,
      currentStep: 'role-selection',
      updatedAt: new Date().toISOString(),
    })
  }, [])

  const handleContinue = useCallback(() => {
    if (!selected) {
      alert('Please select a profile')
      return
    }

    writeRegistrationSession({
      selectedRole: selected,
      currentStep: 'kyc',
      updatedAt: new Date().toISOString(),
    })

    navigate('/auth/register/kyc')
  }, [navigate, selected])

  return (
    <main>
      <PageHeader>
        <PageTitle>Define Your Role in the <GradientText>Capital Stack</GradientText></PageTitle>
        <PageLede>Select your operational profile to access Sovereign Re’s institutional reinsurance liquidity and risk modeling framework.</PageLede>
      </PageHeader>

      <RoleCardsGrid>
        {roleCards.map((card) => (
          <SelectionCard
            key={card.id}
            selectionId={card.id}
            title={card.title}
            subtitle={card.subtitle}
            icon={card.icon}
            accentColor={card.accentColor}
            active={selected === card.id}
            onSelect={handleSelect}
            footerLabel={card.footerLabel}
            ctaText={card.ctaText}
          >
            <CardFeatures intro={card.intro} features={card.features} />
          </SelectionCard>
        ))}
      </RoleCardsGrid>

      <SummaryGrid>
        {summaryCards.map((card) => (
          <InfoCard key={card.title} title={card.title} value={card.value} tone={card.tone} />
        ))}
      </SummaryGrid>

      <Footer>
        <SecurityNote>
          <LockBadge>🔒</LockBadge>
          <SecurityText>SOC2 Type II & GDPR-compliant infrastructure. Identity and KYC data are protected.</SecurityText>
        </SecurityNote>

        <FooterActions>
          <BackButton variant="ghost">Back</BackButton>
          <ContinueButton variant="primary" onClick={handleContinue}>{selected ? 'Continue' : 'Continue'}</ContinueButton>
        </FooterActions>
      </Footer>
    </main>
  )
}

export default RoleSelection
