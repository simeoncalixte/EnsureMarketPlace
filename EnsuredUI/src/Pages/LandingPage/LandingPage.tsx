import React from 'react'
import styled from 'styled-components'
import { Link, useNavigate } from 'react-router'
import HeroHeader from '../../xds/components/HeroHeader'
import MetricCard from '../../xds/components/MetricCard'
import BentoStep from '../../xds/components/BentoStep'
import { SubmitDecoration, UnderwriteDecoration, PriceDecoration } from '../../xds/components/bentoDecorations'
import SelectionCard from '../../xds/components/SelectionCard'
import InfoCard from '../../xds/components/InfoCard'
import Button from '../../xds/components/Button'
import { colors, withAlpha } from '../../xds/colors'
import { spacing, typography } from '../../xds/tokens'
import earthAtNight from '../../assets/earth-at-night.jpg'

const Page = styled.main`
  padding: 0;
`

// --- Hero -------------------------------------------------------------------

const HeroSection = styled.section`
  position: relative;
  min-height: 640px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  padding: ${spacing.xl}px;

  @media (max-width: 768px) {
    min-height: auto;
    padding: ${spacing.xl}px ${spacing.lg}px;
  }
`

const HeroImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 38%;
  opacity: 0.5;
`

/** Legibility scrim: fades the imagery into the page background at the edges. */
const HeroOverlay = styled.div`
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, ${withAlpha(colors.background, 0.55)} 0%, ${withAlpha(colors.background, 0.25)} 45%, ${colors.background} 100%),
    radial-gradient(ellipse at 20% 40%, transparent 0%, ${withAlpha(colors.background, 0.45)} 100%);
`

const HeroInner = styled.div`
  position: relative;
  z-index: 10;
  
  margin: 0 auto;
  width: 100%;
`

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${spacing.sm}px;
  margin-top: ${spacing.xl}px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const HeroActions = styled.div`
  margin-top: ${spacing.xl}px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${spacing.md}px;
`

const HeroReassurance = styled.p`
  margin: ${spacing.md}px 0 0;
  color: ${colors.text.secondary};
  font-size: ${typography.sizes.sm}px;
`

// --- Shared section scaffolding ----------------------------------------------

const Section = styled.section`
  padding: ${spacing.xl}px;

  @media (max-width: 768px) {
    padding: ${spacing.lg}px ${spacing.md}px;
  }
`

const SectionInner = styled.div`
  
  margin: 0 auto;
`

const SectionHeadingBlock = styled.div`
  margin-bottom: ${spacing.lg}px;
`

const Eyebrow = styled.div`
  font-family: ui-monospace, Menlo, monospace;
  color: ${colors.primarySoft};
  font-size: ${typography.sizes.xs}px;
  text-transform: uppercase;
  letter-spacing: 1px;
`

const SectionTitle = styled.h2`
  font-size: ${typography.sizes.xl}px;
  margin: ${spacing.sm}px 0;
  color: ${colors.text.primary};
`

const SectionLede = styled.p`
  margin: 0;
  max-width: 640px;
  color: ${colors.text.secondary};
  font-size: ${typography.sizes.md}px;
  line-height: 1.6;
`

const BentoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${spacing.md}px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

// --- Roles -------------------------------------------------------------------

const RolesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${spacing.md}px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const RolePoints = styled.ul`
  margin: ${spacing.sm}px 0 0;
  padding-left: 18px;
  color: ${colors.text.secondary};
  font-size: ${typography.sizes.sm}px;
  line-height: 1.7;
`

// --- Compliance strip ----------------------------------------------------------

const ComplianceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${spacing.md}px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const ComplianceNote = styled.p`
  margin: 0;
  color: ${colors.text.secondary};
  font-size: ${typography.sizes.sm}px;
  line-height: 1.6;
`

// --- Closing CTA ---------------------------------------------------------------

const ClosingSection = styled.section`
  padding: ${spacing.xl}px;
`

const ClosingInner = styled.div`
  
  margin: 0 auto;
  text-align: center;
  border: 1px solid ${colors.outlineVariant};
  border-radius: 16px;
  background: ${colors.surfaceContainerLow};
  padding: ${spacing.xl}px ${spacing.lg}px;
`

const ClosingTitle = styled.h2`
  margin: 0 0 ${spacing.sm}px;
  color: ${colors.text.primary};
  font-size: ${typography.sizes.xl}px;
`

const ClosingActions = styled.div`
  margin-top: ${spacing.lg}px;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: ${spacing.md}px;
`

// --- Footer ---------------------------------------------------------------------

const Footer = styled.footer`
  border-top: 1px solid ${colors.outlineVariant};
  padding: ${spacing.xl}px;
`

const FooterInner = styled.div`
  
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${spacing.lg}px;
  flex-wrap: wrap;
`

const FooterBrand = styled.div`
  max-width: 360px;
`

const FooterBrandName = styled.div`
  color: ${colors.text.primary};
  font-weight: 700;
  margin-bottom: ${spacing.sm}px;
`

const FooterTagline = styled.p`
  margin: 0;
  color: ${colors.text.secondary};
  font-size: ${typography.sizes.sm}px;
  line-height: 1.6;
`

const FooterLinks = styled.nav`
  display: flex;
  gap: ${spacing.xl}px;
  flex-wrap: wrap;
`

const FooterColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.sm}px;
`

const FooterColumnTitle = styled.div`
  font-family: ui-monospace, Menlo, monospace;
  color: ${colors.primarySoft};
  font-size: ${typography.sizes.xs}px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
`

const FooterLink = styled.a`
  color: ${colors.text.secondary};
  text-decoration: none;
  font-size: ${typography.sizes.sm}px;

  &:hover,
  &:focus-visible {
    color: ${colors.text.primary};
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
    border-radius: 2px;
  }
`

const FooterMeta = styled.div`
  
  margin: ${spacing.lg}px auto 0;
  padding-top: ${spacing.lg}px;
  border-top: 1px solid ${withAlpha(colors.outlineVariant, 0.5)};
  display: flex;
  justify-content: space-between;
  gap: ${spacing.md}px;
  flex-wrap: wrap;
  color: ${colors.text.secondary};
  font-size: ${typography.sizes.xs}px;
`

// --- Content ----------------------------------------------------------------------

/** Minimal stroke icon, tinted by the role's accent. */
const RoleIcon: React.FC<{ d: string; color: string }> = ({ d, color }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d={d} stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ICON_PATHS = {
  shield: 'M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z',
  send: 'M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z',
  gauge: 'M4 14a8 8 0 1 1 16 0M12 14l4-4M12 14h.01',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5',
} as const

const ROLES = [
  {
    id: 'insurer',
    title: 'Insurers & MGAs',
    subtitle: 'Automate intake. Keep the judgment.',
    accent: colors.primary,
    iconPath: ICON_PATHS.shield,
    points: ['Submissions arrive structured, not scattered', 'Appetite and validation checks up front', 'Every AI suggestion stays reviewable'],
  },
  {
    id: 'broker',
    title: 'Brokers',
    subtitle: 'Submit once. Track everything.',
    accent: colors.dataViz.teal,
    iconPath: ICON_PATHS.send,
    points: ['Send risks by email, upload, or feed', 'Follow each submission stage by stage', 'Fewer re-keying rounds with markets'],
  },
  {
    id: 'underwriter',
    title: 'Underwriters',
    subtitle: 'A workbench, not a paper chase.',
    accent: colors.dataViz.amber,
    iconPath: ICON_PATHS.gauge,
    points: ['Extracted exposures, geocoded locations', 'Forms tailored to each line of business', 'Transparent pricing with provenance'],
  },
  {
    id: 'investor',
    title: 'Capital providers',
    subtitle: 'Modeled risk, in the open.',
    accent: colors.secondary,
    iconPath: ICON_PATHS.layers,
    points: ['Deals with documented loss modeling', 'Clear terms, audited settlement logic', 'KYC-gated, institution-grade onboarding'],
  },
] as const

const COMPLIANCE_ITEMS = [
  {
    title: 'KYC & AML onboarding',
    note: 'Role-appropriate identity and business verification before any transaction — not a checkbox after.',
  },
  {
    title: 'Role-based access',
    note: 'Server-authoritative navigation and permissions. People see exactly what their role allows.',
  },
  {
    title: 'Audit trail by design',
    note: 'Every pipeline stage records its inputs and outputs, so each decision can be replayed and explained.',
  },
  {
    title: 'Human-in-the-loop AI',
    note: 'AI drafts, extracts, and suggests. Underwriters review and decide. Nothing binds without a person.',
  },
] as const

const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const goToRegister = () => navigate('/auth/register')
  // Role cards pre-select the role for registration via `?role=`.
  const goToRegisterAs = (role: string) => navigate(`/auth/register?role=${encodeURIComponent(role)}`)
  const goToSignIn = () => navigate('/auth/login')

  return (
    <Page>
      <HeroSection>
        <HeroImage src={earthAtNight} alt="" aria-hidden="true" />
        <HeroOverlay />
        <HeroInner>
          <HeroHeader
            tag="AI-native underwriting infrastructure"
            title={'From submission inbox\nto priced deal'}
            subtitle={'Ensured turns the documents insurers actually receive — emails, PDFs, spreadsheets — into structured, validated, priced submissions. Built for insurers, MGAs, brokers, and the capital behind them.'}
          />

          <MetricsGrid>
            <MetricCard label="Submission intake" value="Minutes" delta="PDFs, email & spreadsheets → structured data" />
            <MetricCard label="Pipeline" value="9 stages" delta="Ingestion → pricing, fully auditable" />
            <MetricCard label="Lines of business" value="Any" delta="Configured, not hard-coded" />
          </MetricsGrid>

          <HeroActions>
            <Button variant="primary" onClick={goToRegister}>Create your workspace</Button>
            <Button variant="outline" onClick={goToSignIn}>Sign in</Button>
          </HeroActions>
          <HeroReassurance>Guided setup — choose your role and we tailor the rest.</HeroReassurance>
        </HeroInner>
      </HeroSection>

      <Section>
        <SectionInner>
          <SectionHeadingBlock>
            <Eyebrow>How it works</Eyebrow>
            <SectionTitle>Submission to settlement, one pipeline</SectionTitle>
            <SectionLede>
              No portals to retrain your partners on. Risks come in however they come in — the platform does the structuring.
            </SectionLede>
          </SectionHeadingBlock>

          <BentoGrid>
            <BentoStep
              index={1}
              title={'Submit anything'}
              body={'Email, SFTP, message queue, or upload. OCR and AI extraction read the documents and produce one clean, structured submission.'}
              decoration={<SubmitDecoration />}
            />
            <BentoStep
              index={2}
              title={'Underwrite with context'}
              body={'Classification, validation, and geocoded exposure give underwriters the full picture — with every AI suggestion held for review.'}
              accent={colors.secondary}
              decoration={<UnderwriteDecoration />}
            />
            <BentoStep
              index={3}
              title={'Price and place'}
              body={'Risk models and rating produce transparent pricing with provenance, and matched capital settles on terms everyone can audit.'}
              accent={colors.dataViz.amber}
              decoration={<PriceDecoration />}
            />
          </BentoGrid>
        </SectionInner>
      </Section>

      <Section>
        <SectionInner>
          <SectionHeadingBlock>
            <Eyebrow>Built for you</Eyebrow>
            <SectionTitle>Pick your side of the desk</SectionTitle>
            <SectionLede>
              One marketplace, four ways in. Registration adapts to the work you do.
            </SectionLede>
          </SectionHeadingBlock>

          <RolesGrid>
            {ROLES.map((role) => (
              <SelectionCard
                key={role.id}
                selectionId={role.id}
                title={role.title}
                subtitle={role.subtitle}
                icon={<RoleIcon d={role.iconPath} color={role.accent} />}
                accentColor={role.accent}
                ctaText="Get started"
                onClick={() => goToRegisterAs(role.id)}
              >
                <RolePoints>
                  {role.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </RolePoints>
              </SelectionCard>
            ))}
          </RolesGrid>
        </SectionInner>
      </Section>

      <Section>
        <SectionInner>
          <SectionHeadingBlock>
            <Eyebrow>Compliance-proper</Eyebrow>
            <SectionTitle>Built like the regulators are watching</SectionTitle>
          </SectionHeadingBlock>

          <ComplianceGrid>
            {COMPLIANCE_ITEMS.map((item) => (
              <InfoCard key={item.title} title={item.title} tone="info">
                <ComplianceNote>{item.note}</ComplianceNote>
              </InfoCard>
            ))}
          </ComplianceGrid>
        </SectionInner>
      </Section>

      <ClosingSection>
        <ClosingInner>
          <Eyebrow>Ready when you are</Eyebrow>
          <ClosingTitle>See your own submissions, structured</ClosingTitle>
          <SectionLede style={{ margin: '0 auto' }}>
            Create a workspace in a few guided steps, or sign in to pick up where you left off.
          </SectionLede>
          <ClosingActions>
            <Button variant="primary" onClick={goToRegister}>Create your workspace</Button>
            <Button variant="outline" onClick={goToSignIn}>Sign in</Button>
          </ClosingActions>
        </ClosingInner>
      </ClosingSection>

      <Footer>
        <FooterInner>
          <FooterBrand>
            <FooterBrandName>Ensured Marketplace</FooterBrandName>
            <FooterTagline>
              AI-native underwriting infrastructure: submission intake, risk modeling, pricing, and capital — in one auditable pipeline.
            </FooterTagline>
          </FooterBrand>

          <FooterLinks aria-label="Footer">
            <FooterColumn>
              <FooterColumnTitle>Get started</FooterColumnTitle>
              {/* Internal routes use react-router Link for client-side navigation
                  (consistent with the hero CTAs and top nav); the mailto below
                  stays a plain anchor. */}
              <FooterLink as={Link} to="/auth/register">Create your workspace</FooterLink>
              <FooterLink as={Link} to="/auth/login">Sign in</FooterLink>
            </FooterColumn>
            <FooterColumn>
              <FooterColumnTitle>Contact</FooterColumnTitle>
              <FooterLink href="mailto:hello@ensuredmarketplace.com">hello@ensuredmarketplace.com</FooterLink>
            </FooterColumn>
          </FooterLinks>
        </FooterInner>

        <FooterMeta>
          <span>© 2026 Ensured Marketplace. All rights reserved.</span>
          <span>Hero imagery: NASA Earth Observatory “Black Marble” (public domain).</span>
        </FooterMeta>
      </Footer>
    </Page>
  )
}

export default LandingPage
