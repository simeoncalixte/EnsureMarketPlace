import React from 'react'
import styled, { css } from 'styled-components'
import { Link, useInRouterContext } from 'react-router'
import type { AuthUser } from '../../lib/useAuthMe'
import { colors, withAlpha } from '../colors'
import { ThemeToggle } from './ThemeToggle'

const Header = styled.header`
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: ${withAlpha(colors.surfaceDeep, 0.85)};
  backdrop-filter: saturate(140%) blur(12px);
  border-bottom: 1px solid ${withAlpha(colors.neutral[400], 0.12)};
  box-shadow: 0 1px 0 ${withAlpha(colors.black, 0.2)}, 0 8px 24px -16px ${withAlpha(colors.black, 0.6)};
  font-family: 'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif;
  letter-spacing: -0.01em;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
`

const Divider = styled.span`
  width: 1px;
  height: 1.5rem;
  background: ${withAlpha(colors.neutral[400], 0.18)};
  flex: none;

  @media (max-width: 480px) {
    display: none;
  }
`

const BrandLink = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  min-width: 0;
`

const BrandMark = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex: none;
  border-radius: 0.6rem;
  background: linear-gradient(135deg, ${colors.primary}, ${colors.brand[700]});
  color: ${colors.neutral[0]};
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  box-shadow: inset 0 1px 0 ${withAlpha(colors.white, 0.25)}, 0 2px 8px -2px ${withAlpha(colors.primary, 0.6)};
`

const BrandText = styled.span`
  color: ${colors.onSurfaceStrong};
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  white-space: nowrap;

  @media (max-width: 480px) {
    display: none;
  }
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const UserSummary = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.35rem 0.6rem 0.35rem 0.45rem;
  border-radius: 0.75rem;
  background: ${withAlpha(colors.surfaceHigh, 0.6)};
  border: 1px solid ${withAlpha(colors.neutral[400], 0.14)};
  min-width: 0;
`

const Avatar = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex: none;
  border-radius: 50%;
  background: linear-gradient(135deg, ${withAlpha(colors.primary, 0.9)}, ${colors.brand[600]});
  color: ${colors.neutral[0]};
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
`

const UserMeta = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.05rem;
  min-width: 0;

  @media (max-width: 600px) {
    display: none;
  }
`

const UserName = styled.span`
  color: ${colors.onSurfaceStrong};
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 12rem;
`

const UserOrg = styled.span`
  color: ${colors.onSurfaceVariant};
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
`

const MenuButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  flex: none;
  padding: 0;
  border: 1px solid ${withAlpha(colors.neutral[400], 0.16)};
  border-radius: 0.7rem;
  background: ${withAlpha(colors.surfaceHigh, 0.5)};
  color: ${colors.onSurfaceMuted};
  transition: background-color 180ms ease, transform 100ms ease, border-color 180ms ease, color 180ms ease;
  cursor: pointer;

  &:hover {
    background: ${colors.surfaceRaised};
    border-color: ${withAlpha(colors.primarySoft, 0.35)};
    color: ${colors.primarySoft};
  }

  &:focus-visible {
    outline: none;
    border-color: ${withAlpha(colors.primarySoft, 0.55)};
    box-shadow: 0 0 0 3px ${withAlpha(colors.primary, 0.25)};
  }

  &:active {
    transform: scale(0.94);
  }
`

const Bars = styled.span<{ $open?: boolean }>`
  position: relative;
  width: 1.125rem;
  height: 0.875rem;
  flex: none;

  span {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    border-radius: 2px;
    background: currentColor;
    transition: transform 220ms ease, opacity 140ms ease, top 220ms ease;
  }

  span:nth-child(1) {
    top: 0;
  }
  span:nth-child(2) {
    top: 0.375rem;
  }
  span:nth-child(3) {
    top: 0.75rem;
  }

  ${(p) =>
    p.$open &&
    css`
      span:nth-child(1) {
        top: 0.375rem;
        transform: rotate(45deg);
      }
      span:nth-child(2) {
        opacity: 0;
      }
      span:nth-child(3) {
        top: 0.375rem;
        transform: rotate(-45deg);
      }
    `}
`

const AuthActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
`

const authLinkStyles = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border: 1px solid ${withAlpha(colors.neutral[400], 0.16)};
  border-radius: 0.7rem;
  background: ${withAlpha(colors.surfaceHigh, 0.5)};
  color: ${colors.onSurfaceStrong};
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  text-decoration: none;
  transition: background-color 180ms ease, transform 100ms ease, border-color 180ms ease;

  &:hover {
    background: ${colors.surfaceRaised};
    border-color: ${withAlpha(colors.primarySoft, 0.35)};
  }

  &:active {
    transform: scale(0.97);
  }
`

const AuthLinkBase = styled.a`
  ${authLinkStyles}
`

const AuthPrimaryLink = styled.a`
  ${authLinkStyles}
  border-color: ${withAlpha(colors.primary, 0.4)};
  background: ${colors.primary};
  color: ${colors.onPrimary};
  box-shadow: 0 6px 18px -8px ${withAlpha(colors.primary, 0.8)};

  &:hover {
    background: ${colors.brand[400]};
    border-color: ${withAlpha(colors.primary, 0.6)};
  }
`

function AuthActionLink({ to, primary = false, children }: { to: string; primary?: boolean; children: React.ReactNode }) {
  const inRouter = useInRouterContext();
  const LinkComponent = primary ? AuthPrimaryLink : AuthLinkBase;

  if (inRouter) {
    return (
      <LinkComponent as={Link} to={to}>
        {children}
      </LinkComponent>
    );
  }

  return (
    <LinkComponent href={to}>
      {children}
    </LinkComponent>
  );
}

function initialsFor(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const TopNavBar: React.FC<{ isSidebarOpen?: boolean; onToggleSidebar?: () => void; user?: AuthUser | null }> = ({ isSidebarOpen, onToggleSidebar, user }) => {
  const displayName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || 'Authenticated session' : ''
  const organizationLabel = user?.organizationId != null ? `Org ${user.organizationId}` : 'No organization'

  return (
    <Header>
      <HeaderLeft>
        {onToggleSidebar && (
          <>
            <MenuButton
              type="button"
              onClick={onToggleSidebar}
              aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isSidebarOpen}
            >
              <Bars $open={isSidebarOpen} aria-hidden>
                <span />
                <span />
                <span />
              </Bars>
            </MenuButton>
            <Divider />
          </>
        )}

        <BrandLink>
          <BrandMark aria-hidden>SR</BrandMark>
          <BrandText>Sovereign Re</BrandText>
        </BrandLink>
      </HeaderLeft>

      <Actions>
        <ThemeToggle iconOnly />
        {user ? (
          <UserSummary aria-label={`${organizationLabel} ${displayName}`}>
            <Avatar aria-hidden>{initialsFor(displayName)}</Avatar>
            <UserMeta>
              <UserName title={displayName}>{displayName}</UserName>
              <UserOrg>{organizationLabel}</UserOrg>
            </UserMeta>
          </UserSummary>
        ) : (
          <AuthActions>
            <AuthActionLink to="/auth/login">Sign in</AuthActionLink>
            <AuthActionLink to="/auth/register" primary>Register</AuthActionLink>
          </AuthActions>
        )}
      </Actions>
    </Header>
  )
}

export default TopNavBar
