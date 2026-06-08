import React from 'react'
import styled from 'styled-components'
import Badge from '../../xds/components/Badge'
import Button from '../../xds/components/Button'
import { PageTitle, PageSubtitle, SmallText } from '../../xds/components/Typography'
import { colors, withAlpha } from '../../xds/colors'

/**
 * Shared dark "step shell" used by the registration step pages
 * (OrganizationStructure, AccountAccess, CapitalProfile, ...).
 *
 * This is a page-local composite (NOT a design-system primitive): it is built
 * here from styled-components and composed from xds Badge / Button / Typography.
 * It owns the TopBar (brand + role Badge + "Step N of M" pill), the page title
 * block, the 7fr/5fr content grid, and the back/continue footer.
 */

const Page = styled.main`
  display: flex;
  min-height: 100vh;
  background: ${colors.surfaceDeep};
  color: ${colors.onSurfaceStrong};
  font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
`

const Content = styled.section`
  width: 100%;
`

const TopBar = styled.header`
  background: ${colors.surfaceDeep};
  padding: 16px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const TopBarInner = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`

const Brand = styled.div`
  font-family: Manrope, sans-serif;
  font-weight: 800;
  color: ${colors.primarySoft};
`

const StepPill = styled.div`
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: ${withAlpha(colors.primary, 0.14)};
  color: ${colors.primarySoft};
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const Container = styled.div`
  padding: 32px;
  max-width: 1240px;
  margin: 0 auto;
`

const IntroNote = styled(SmallText)`
  margin-bottom: 24px;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 1080px) {
    grid-template-columns: 7fr 5fr;
  }
`

const FooterActions = styled.footer`
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid ${withAlpha(colors.border, 0.1)};
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
`

const FooterContinue = styled.div`
  display: grid;
  justify-items: end;
  gap: 8px;
`

export type RegistrationStepLayoutProps = {
  /** Accessible role / context label shown as a Badge next to the brand. */
  roleTag: string
  /** Current step number, e.g. 3. */
  stepNumber: number
  /** Total number of steps, e.g. 5. */
  totalSteps?: number
  title: string
  subtitle?: React.ReactNode
  /** Optional small note rendered under the subtitle. */
  note?: React.ReactNode
  /** Main 7fr/5fr grid content. */
  children: React.ReactNode
  /** Footer back button. Omit to hide. */
  backLabel?: string
  onBack?: () => void
  /** Footer continue button. Omit to hide. */
  continueLabel?: string
  onContinue?: () => void
  /** Small helper text under the continue button. */
  continueNote?: React.ReactNode
}

export const RegistrationStepLayout: React.FC<RegistrationStepLayoutProps> = ({
  roleTag,
  stepNumber,
  totalSteps = 5,
  title,
  subtitle,
  note,
  children,
  backLabel,
  onBack,
  continueLabel,
  onContinue,
  continueNote,
}) => {
  return (
    <Page>
      <Content>
        <TopBar>
          <TopBarInner>
            <Brand>Sovereign Re</Brand>
            <Badge variant="primary">{roleTag}</Badge>
          </TopBarInner>
          <StepPill>{`Step ${stepNumber} of ${totalSteps}`}</StepPill>
        </TopBar>

        <Container>
          <PageTitle>{title}</PageTitle>
          {subtitle && <PageSubtitle>{subtitle}</PageSubtitle>}
          {note && <IntroNote>{note}</IntroNote>}

          <Grid>{children}</Grid>

          {(backLabel || continueLabel) && (
            <FooterActions>
              {backLabel ? (
                <Button type="button" variant="outline" onClick={onBack}>
                  {backLabel}
                </Button>
              ) : (
                <span />
              )}

              {continueLabel && (
                <FooterContinue>
                  <Button type="button" variant="primary" onClick={onContinue}>
                    {continueLabel}
                  </Button>
                  {continueNote && <SmallText>{continueNote}</SmallText>}
                </FooterContinue>
              )}
            </FooterActions>
          )}
        </Container>
      </Content>
    </Page>
  )
}

export default RegistrationStepLayout
