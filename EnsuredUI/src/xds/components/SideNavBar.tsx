import React from 'react'
import styled from 'styled-components'
import Navigation from './Navigation'
import type { NavItem } from './Navigation'
import { colors, withAlpha } from '../colors'

const Aside = styled.aside<{ $isOpen?: boolean; $layoutMode: 'overlay' | 'grid' }>`
  position: ${({ $layoutMode }) => ($layoutMode === 'grid' ? 'sticky' : 'fixed')};
  left: ${({ $layoutMode }) => ($layoutMode === 'grid' ? 'auto' : '0')};
  top: ${({ $layoutMode }) => ($layoutMode === 'grid' ? '0' : '4rem')};
  z-index: ${({ $layoutMode }) => ($layoutMode === 'grid' ? '10' : '40')};
  width: ${({ $layoutMode }) => ($layoutMode === 'grid' ? '100%' : 'min(18rem, calc(100vw - 2rem))')};
  height: calc(100vh - 4rem);
  padding: 1.5rem 0;
  background: ${colors.surfacePanel};
  flex-direction: column;
  display: flex;
  overflow: hidden;
  box-shadow: 0 24px 60px ${withAlpha(colors.scrim, 0.28)};
  transform: ${({ $layoutMode, $isOpen }) => ($layoutMode === 'grid' ? 'none' : `translateX(${$isOpen ? '0' : '-100%'})`)};
  opacity: ${({ $layoutMode, $isOpen }) => ($layoutMode === 'grid' ? 1 : ($isOpen ? 1 : 0))};
  visibility: ${({ $layoutMode, $isOpen }) => ($layoutMode === 'grid' ? 'visible' : ($isOpen ? 'visible' : 'hidden'))};
  pointer-events: ${({ $layoutMode, $isOpen }) => ($layoutMode === 'grid' ? 'auto' : ($isOpen ? 'auto' : 'none'))};
  transition: transform 220ms ease, opacity 180ms ease;

  @media (min-width: 1024px) {
    border-right: ${({ $layoutMode }) => ($layoutMode === 'grid' ? `1px solid ${withAlpha(colors.primarySoft, 0.1)}` : '0')};
    box-shadow: ${({ $layoutMode }) => ($layoutMode === 'grid' ? 'none' : `0 24px 60px ${withAlpha(colors.scrim, 0.28)}`)};
  }
`

const HeaderBlock = styled.div`
  padding: 0 2rem;
  margin-bottom: 1.5rem;
`

const Title = styled.div`
  margin-bottom: 0.25rem;
  color: ${colors.primarySoft};
  font-size: 1.125rem;
  font-weight: 900;
  cursor: text;
`

const Subtitle = styled.div`
  color: ${colors.onSurfaceVariant};
  font-size: 0.75rem;
  font-weight: 500;
  cursor: text;
`

const Nav = styled.nav`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const NavItem = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: text;
  transition: background-color 180ms ease, color 180ms ease;
  background: ${({ $active }) => ($active ? colors.surfaceHigh : 'transparent')};
  color: ${({ $active }) => ($active ? colors.primarySoft : colors.onSurfaceMuted)};
  border-left: ${({ $active }) => ($active ? `4px solid ${colors.primary}` : '4px solid transparent')};

  &:hover {
    background: ${({ $active }) => ($active ? colors.surfaceHigh : colors.surfaceRaised)};
    color: ${colors.primarySoft};
  }
`

const Icon = styled.span`
  margin-right: 1rem;
`

const FooterActions = styled.div`
  margin-top: auto;
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const SaveButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 0;
  border-radius: 0.375rem;
  padding: 0.75rem;
  background: ${colors.surfaceHigh};
  color: ${colors.primarySoft};
  font-size: 0.875rem;
  font-weight: 700;
  transition: background-color 200ms ease, transform 200ms ease;
  cursor: text;

  &:hover {
    background: ${colors.surfaceRaised};
  }

  &:active {
    transform: translateX(1px);
  }
`

const LogoutButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1px solid ${withAlpha(colors.errorSoft, 0.24)};
  border-radius: 0.375rem;
  padding: 0.75rem;
  background: ${withAlpha(colors.errorSoft, 0.1)};
  color: ${colors.errorSoft};
  font-size: 0.875rem;
  font-weight: 700;
  transition: background-color 200ms ease, transform 200ms ease, border-color 200ms ease;
  cursor: pointer;

  &:hover {
    background: ${withAlpha(colors.errorSoft, 0.16)};
    border-color: ${withAlpha(colors.errorSoft, 0.34)};
  }

  &:active {
    transform: translateX(1px);
  }
`

const SaveIcon = styled.span`
  font-size: 0.875rem;
`

type SideNavBarProps = {
  items?: NavItem[];
  title?: string;
  subtitle?: string;
  isOpen?: boolean;
  layoutMode?: 'overlay' | 'grid';
  onRequestClose?: () => void;
  onLogout?: () => void;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({ items, title, subtitle, isOpen = false, layoutMode = 'overlay', onRequestClose, onLogout }) => {
  const hasCustom = Array.isArray(items) && items.length > 0

  return (
    <Aside data-stitch-vh="h-[1024px]===h-screen" $isOpen={isOpen} $layoutMode={layoutMode}>
      <HeaderBlock>
        <Title contentEditable={false} spellCheck={false} data-stitch-editable-idx="6" data-stitch-added-classes="cursor-text">
          {title ?? 'Registration'}
        </Title>
        <Subtitle contentEditable={false} spellCheck={false} data-stitch-editable-idx="7" data-stitch-added-classes="cursor-text">
          {subtitle ?? 'Step 1 of 5: Account Selection'}
        </Subtitle>
      </HeaderBlock>

      {hasCustom ? (
        <div style={{ padding: '0 1.5rem', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <Navigation items={items!} onItemClick={onRequestClose} />
        </div>
      ) : (
        <Nav>
          <NavItem $active={true} contentEditable={true} spellCheck={false} data-stitch-editable-idx="8" data-stitch-added-classes="cursor-text">
            <Icon className="material-symbols-outlined" aria-hidden data-icon="account_balance">account_balance</Icon>
            Account Type
          </NavItem>
          <NavItem contentEditable={true} spellCheck={false} data-stitch-editable-idx="9" data-stitch-added-classes="cursor-text">
            <Icon className="material-symbols-outlined" aria-hidden data-icon="domain">domain</Icon>
            Business Details
          </NavItem>
          <NavItem contentEditable={true} spellCheck={false} data-stitch-editable-idx="10" data-stitch-added-classes="cursor-text">
            <Icon className="material-symbols-outlined" aria-hidden data-icon="verified_user">verified_user</Icon>
            KYC Verification
          </NavItem>
          <NavItem contentEditable={true} spellCheck={false} data-stitch-editable-idx="11" data-stitch-added-classes="cursor-text">
            <Icon className="material-symbols-outlined" aria-hidden data-icon="monitoring">monitoring</Icon>
            Capital Profile
          </NavItem>
          <NavItem contentEditable={true} spellCheck={false} data-stitch-editable-idx="12" data-stitch-added-classes="cursor-text">
            <Icon className="material-symbols-outlined" aria-hidden data-icon="fact_check">fact_check</Icon>
            Final Review
          </NavItem>
        </Nav>
      )}

      <FooterActions>
        <SaveButton contentEditable={false} spellCheck={false} data-stitch-editable-idx="13" data-stitch-added-classes="cursor-text">
          <SaveIcon className="material-symbols-outlined" aria-hidden data-icon="save">save</SaveIcon>
          Save Progress
        </SaveButton>
        {onLogout && (
          <LogoutButton type="button" onClick={onLogout} aria-label="Log out of the application">
            <SaveIcon className="material-symbols-outlined" aria-hidden data-icon="logout">logout</SaveIcon>
            Log out
          </LogoutButton>
        )}
      </FooterActions>
    </Aside>
  )
}

export default SideNavBar
