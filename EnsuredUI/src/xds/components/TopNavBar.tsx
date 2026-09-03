import React from 'react'
import styled from 'styled-components'
import { Link, useInRouterContext } from 'react-router'
import type { AuthUser } from '../../lib/useAuthMe'
import { colors, withAlpha } from '../colors'
import { typography } from '../tokens'
import ThemeToggle from './ThemeToggle'

const PublicHeader = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  border-bottom: 1px solid ${colors.border};
  background: ${withAlpha(colors.surfaceRaised, 0.98)};
  color: ${colors.text.primary};
  box-shadow: 0 1px 12px ${withAlpha(colors.scrim, 0.1)};
  backdrop-filter: blur(18px);
`

const DispatchBar = styled.div`
  min-height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.3rem clamp(1rem, 3vw, 2.5rem);
  border-bottom: 1px solid ${colors.border};
  background: ${colors.surfaceDeep};
  color: ${colors.onSurfaceVariant};
  font-family: ${typography.labelFamily};
  font-size: 0.56rem;
  letter-spacing: 0.12em;
  line-height: 1.4;
  text-transform: uppercase;

  @media (max-width: 760px) {
    justify-content: center;
  }
`

const DispatchGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 1.25rem;

  @media (max-width: 760px) {
    &:last-child {
      display: none;
    }
  }
`

const DispatchItem = styled.span<{ $accent?: 'primary' | 'secondary' | 'danger' }>`
  color: ${({ $accent }) => {
    if ($accent === 'primary') return colors.primarySoft
    if ($accent === 'secondary') return colors.secondary
    if ($accent === 'danger') return colors.danger
    return 'inherit'
  }};
  font-weight: ${({ $accent }) => ($accent ? 700 : 400)};
  white-space: nowrap;
`

const LiveDot = styled.span`
  display: inline-block;
  width: 0.38rem;
  height: 0.38rem;
  margin-right: 0.42rem;
  background: ${colors.primary};
`

const PublicMain = styled.div`
  min-height: 4.75rem;
  display: grid;
  grid-template-columns: minmax(15rem, auto) 1fr auto;
  align-items: center;
  gap: clamp(1rem, 2vw, 2rem);
  padding: 0.75rem clamp(1rem, 3vw, 2.5rem);

  @media (max-width: 1080px) {
    grid-template-columns: 1fr auto;
  }
`

const BrandLockup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
`

const BrandSeal = styled.div`
  width: 2.3rem;
  height: 2.3rem;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid ${colors.primary};
  background: ${colors.primaryContainer};
  color: ${colors.onPrimaryContainer};
  font-family: ${typography.headlineFamily};
  font-size: 1rem;
  font-weight: 700;
`

const BrandCopy = styled.div`
  min-width: 0;
`

const BrandTitle = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
  color: ${colors.primarySoft};
  font-family: ${typography.headlineFamily};
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
`

const BrandDivision = styled.span`
  color: ${colors.onSurfaceVariant};
  font-family: ${typography.labelFamily};
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.08em;

  @media (max-width: 560px) {
    display: none;
  }
`

const BrandSubtitle = styled.div`
  margin-top: 0.14rem;
  color: ${colors.onSurfaceVariant};
  font-family: ${typography.labelFamily};
  font-size: 0.48rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  @media (max-width: 560px) {
    display: none;
  }
`

const PublicNav = styled.nav`
  justify-self: center;
  display: flex;
  align-items: center;
  border: 1px solid ${colors.border};
  background: ${colors.surfaceContainer};

  @media (max-width: 1080px) {
    display: none;
  }
`

const PublicNavLink = styled.a`
  padding: 0.58rem 0.78rem;
  color: ${colors.onSurfaceVariant};
  font-family: ${typography.labelFamily};
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-decoration: none;
  text-transform: uppercase;
  transition: background 160ms ease, color 160ms ease;

  &:first-child {
    background: ${colors.primaryContainer};
    color: ${colors.onPrimaryContainer};
  }

  &:hover,
  &:focus-visible {
    background: ${colors.surfaceContainerHigh};
    color: ${colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
`

const AuthActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  @media (max-width: 520px) {
    display: none;
  }
`

const authLinkStyles = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  padding: 0 0.9rem;
  border: 1px solid ${colors.border};
  border-radius: 0;
  background: ${colors.surfaceContainer};
  color: ${colors.text.primary};
  font-family: ${typography.labelFamily};
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-decoration: none;
  text-transform: uppercase;
  transition: background-color 180ms ease, border-color 180ms ease;

  &:hover {
    background: ${colors.surfaceContainerHigh};
    border-color: ${colors.outline};
  }

  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }
`

const AuthLinkBase = styled.a`
  ${authLinkStyles}
`

const AuthPrimaryLink = styled.a`
  ${authLinkStyles}
  border-color: ${colors.primary};
  background: ${colors.primary};
  color: ${colors.onPrimary};

  &:hover {
    background: ${colors.primaryHover};
    border-color: ${colors.primaryHover};
    color: ${colors.white};
  }
`

const AuthenticatedHeader = styled.header`
  position: relative;
  z-index: 40;
  min-height: 4rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 2rem;
  border-bottom: 1px solid ${colors.border};
  background: ${colors.surfaceDeep};
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
`

const MenuButton = styled.button`
  min-height: 2.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.9rem;
  border: 1px solid ${colors.border};
  background: ${colors.surfaceContainer};
  color: ${colors.text.primary};
  font-family: ${typography.labelFamily};
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
`

const UserSummary = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.12rem;
  padding: 0.45rem 0.75rem;
  border: 1px solid ${colors.border};
  background: ${colors.surfaceContainer};
`

const UserOrg = styled.span`
  color: ${colors.onSurfaceVariant};
  font-family: ${typography.labelFamily};
  font-size: 0.52rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`

const UserName = styled.span`
  max-width: 14rem;
  overflow: hidden;
  color: ${colors.text.primary};
  font-size: 0.84rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
`

function AuthActionLink({ to, primary = false, children }: { to: string; primary?: boolean; children: React.ReactNode }) {
  const inRouter = useInRouterContext()
  const LinkComponent = primary ? AuthPrimaryLink : AuthLinkBase

  if (inRouter) {
    return (
      <LinkComponent as={Link} to={to}>
        {children}
      </LinkComponent>
    )
  }

  return <LinkComponent href={to}>{children}</LinkComponent>
}

export const TopNavBar: React.FC<{
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
  user?: AuthUser | null
}> = ({ isSidebarOpen, onToggleSidebar, user }) => {
  if (!user) {
    return (
      <PublicHeader>
        <DispatchBar>
          <DispatchGroup>
            <DispatchItem><LiveDot />Dispatch: No. 4,892-R</DispatchItem>
            <DispatchItem>LDN 10:42 GMT</DispatchItem>
            <DispatchItem>ZRH 11:42 CET</DispatchItem>
          </DispatchGroup>
          <DispatchGroup>
            <DispatchItem $accent="primary">Solvency II: 284.6%</DispatchItem>
            <DispatchItem $accent="secondary">Proven reserves: $14.28B</DispatchItem>
          </DispatchGroup>
        </DispatchBar>

        <PublicMain>
          <BrandLockup>
            <BrandSeal aria-hidden="true">ER</BrandSeal>
            <BrandCopy>
              <BrandTitle>
                Ensured Re <BrandDivision>// Sovereign Clearing</BrandDivision>
              </BrandTitle>
              <BrandSubtitle>Actuarial underwriting &amp; reinsurance settlement</BrandSubtitle>
            </BrandCopy>
          </BrandLockup>

          <PublicNav aria-label="Landing page navigation">
            <PublicNavLink href="#orderbook">Marketplace</PublicNavLink>
            <PublicNavLink href="#architecture">Architecture</PublicNavLink>
            <PublicNavLink href="#mechanics">Mechanics</PublicNavLink>
            <PublicNavLink href="#reserves">Reserves</PublicNavLink>
          </PublicNav>

          <Actions>
            <ThemeToggle />
            <AuthActions>
              <AuthActionLink to="/auth/login">Sign in</AuthActionLink>
              <AuthActionLink to="/auth/register" primary>Register</AuthActionLink>
            </AuthActions>
          </Actions>
        </PublicMain>
      </PublicHeader>
    )
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || 'Authenticated session'
  const organizationLabel = user.organizationId != null ? `Organization ID ${user.organizationId}` : 'Organization ID —'

  return (
    <AuthenticatedHeader>
      <HeaderLeft>
        {onToggleSidebar ? (
          <MenuButton
            type="button"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            <span aria-hidden>{isSidebarOpen ? '×' : '☰'}</span>
            <span>{isSidebarOpen ? 'Close menu' : 'Open menu'}</span>
          </MenuButton>
        ) : null}
        <BrandLockup>
          <BrandSeal aria-hidden="true">ER</BrandSeal>
          <BrandTitle>Ensured Re</BrandTitle>
        </BrandLockup>
      </HeaderLeft>

      <Actions>
        <ThemeToggle />
        <UserSummary aria-label={`${organizationLabel} ${displayName}`}>
          <UserOrg>{organizationLabel}</UserOrg>
          <UserName title={displayName}>{displayName}</UserName>
        </UserSummary>
      </Actions>
    </AuthenticatedHeader>
  )
}

export default TopNavBar
