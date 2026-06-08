import React from 'react'
import styled from 'styled-components'
import { Link, useInRouterContext } from 'react-router'
import type { AuthUser } from '../../lib/useAuthMe'
import { colors, withAlpha } from '../colors'

const Header = styled.header`
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 auto;
  padding: 1rem 2rem;
  background: ${colors.surfaceDeep};
  font-family: 'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif;
  letter-spacing: -0.01em;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
`

const Brand = styled.div`
  color: ${colors.primarySoft};
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  cursor: text;
`

const Nav = styled.nav`
  display: none;
  align-items: center;
  gap: 2rem;

  @media (min-width: 768px) {
    display: flex;
  }
`

const NavLink = styled.a`
  color: ${colors.onSurfaceMuted};
  text-decoration: none;
  transition: color 180ms ease;
  cursor: text;

  &:hover {
    color: ${colors.primarySoft};
  }
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

const UserSummary = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.125rem;
  padding: 0.5rem 0.85rem;
  border-radius: 0.75rem;
  background: ${withAlpha(colors.surfaceHigh, 0.92)};
  border: 1px solid ${withAlpha(colors.neutral[400], 0.18)};
  min-width: 0;
`

const UserOrg = styled.span`
  color: ${colors.onSurfaceVariant};
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`

const UserName = styled.span`
  color: ${colors.onSurfaceStrong};
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 14rem;
`

const MenuButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.9rem;
  border: 1px solid ${withAlpha(colors.neutral[400], 0.18)};
  border-radius: 0.75rem;
  background: ${withAlpha(colors.surfaceHigh, 0.92)};
  color: ${colors.onSurfaceStrong};
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  transition: background-color 200ms ease, transform 100ms ease, border-color 200ms ease;
  cursor: pointer;

  &:hover {
    background: ${colors.surfaceRaised};
    border-color: ${withAlpha(colors.primarySoft, 0.3)};
  }

  &:active {
    transform: scale(0.98);
  }
`

const AuthActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const authLinkStyles = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.55rem 0.95rem;
  border: 1px solid ${withAlpha(colors.neutral[400], 0.18)};
  border-radius: 0.75rem;
  background: ${withAlpha(colors.surfaceHigh, 0.92)};
  color: ${colors.onSurfaceStrong};
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-decoration: none;
  transition: background-color 200ms ease, transform 100ms ease, border-color 200ms ease;

  &:hover {
    background: ${colors.surfaceRaised};
    border-color: ${withAlpha(colors.primarySoft, 0.3)};
  }

  &:active {
    transform: scale(0.98);
  }
`

const AuthLinkBase = styled.a`
  ${authLinkStyles}
`

const AuthPrimaryLink = styled.a`
  ${authLinkStyles}
  border-color: ${withAlpha(colors.primary, 0.35)};
  background: ${colors.primary};
  color: ${colors.onPrimaryContainer};

  &:hover {
    background: ${colors.primary};
    border-color: ${withAlpha(colors.primary, 0.55)};
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

export const TopNavBar: React.FC<{ isSidebarOpen?: boolean; onToggleSidebar?: () => void; user?: AuthUser | null }> = ({ isSidebarOpen, onToggleSidebar, user }) => {
  const displayName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || 'Authenticated session' : ''
  const organizationLabel = user?.organizationId != null ? `Organization ID ${user.organizationId}` : 'Organization ID —'

  return (
    <Header>
      <HeaderLeft>
        {onToggleSidebar && (
          <MenuButton
            type="button"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            <span aria-hidden>{isSidebarOpen ? '×' : '☰'}</span>
            <span>{isSidebarOpen ? 'Close menu' : 'Open menu'}</span>
          </MenuButton>
        )}

        <Brand contentEditable={true} spellCheck={false} data-stitch-editable-idx="0" data-stitch-added-classes="cursor-text">
          Sovereign Re
        </Brand>
      </HeaderLeft>

      <Nav>
        <NavLink href="#" contentEditable={true} spellCheck={false} data-stitch-editable-idx="1" data-stitch-added-classes="cursor-text">Platform</NavLink>
        <NavLink href="#" contentEditable={true} spellCheck={false} data-stitch-editable-idx="2" data-stitch-added-classes="cursor-text">Liquidity</NavLink>
        <NavLink href="#" contentEditable={true} spellCheck={false} data-stitch-editable-idx="3" data-stitch-added-classes="cursor-text">Governance</NavLink>
        <NavLink href="#" contentEditable={true} spellCheck={false} data-stitch-editable-idx="4" data-stitch-added-classes="cursor-text">Documentation</NavLink>
      </Nav>

      <Actions>
        {user ? (
          <UserSummary aria-label={`${organizationLabel} ${displayName}`}>
            <UserOrg>{organizationLabel}</UserOrg>
            <UserName title={displayName}>{displayName}</UserName>
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
