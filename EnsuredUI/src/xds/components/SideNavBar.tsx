import React from 'react'
import styled from 'styled-components'
import Navigation from './Navigation'
import type { NavItem } from './Navigation'

const Aside = styled.aside<{ $isOpen?: boolean }>`
  position: fixed;
  left: 0;
  top: 4rem;
  z-index: 40;
  width: min(18rem, calc(100vw - 2rem));
  height: calc(100vh - 4rem);
  padding: 2rem 0;
  background: #131b2e;
  flex-direction: column;
  display: flex;
  overflow-y: auto;
  box-shadow: 0 24px 60px rgba(2, 8, 23, 0.28);
  transform: translateX(${({ $isOpen }) => ($isOpen ? '0' : '-100%')});
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};
  transition: transform 220ms ease, opacity 180ms ease;
`

const HeaderBlock = styled.div`
  padding: 0 2rem;
  margin-bottom: 2.5rem;
`

const Title = styled.div`
  margin-bottom: 0.25rem;
  color: #adc6ff;
  font-size: 1.125rem;
  font-weight: 900;
  cursor: text;
`

const Subtitle = styled.div`
  color: #9aa3bb;
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
  background: ${({ $active }) => ($active ? '#222a3d' : 'transparent')};
  color: ${({ $active }) => ($active ? '#adc6ff' : '#c1c6d7')};
  border-left: ${({ $active }) => ($active ? '4px solid #4b8eff' : '4px solid transparent')};

  &:hover {
    background: ${({ $active }) => ($active ? '#222a3d' : '#171f33')};
    color: #adc6ff;
  }
`

const Icon = styled.span`
  margin-right: 1rem;
`

const FooterActions = styled.div`
  margin-top: auto;
  padding: 0 1.5rem;
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
  background: #222a3d;
  color: #adc6ff;
  font-size: 0.875rem;
  font-weight: 700;
  transition: background-color 200ms ease, transform 200ms ease;
  cursor: text;

  &:hover {
    background: #171f33;
  }

  &:active {
    transform: translateX(1px);
  }
`

const SaveIcon = styled.span`
  font-size: 0.875rem;
`

export const SideNavBar: React.FC<{ items?: NavItem[]; title?: string; subtitle?: string; isOpen?: boolean; onRequestClose?: () => void }> = ({ items, title, subtitle, isOpen = false, onRequestClose }) => {
  const hasCustom = Array.isArray(items) && items.length > 0

  return (
    <Aside data-stitch-vh="h-[1024px]===h-screen" $isOpen={isOpen}>
      <HeaderBlock>
        <Title contentEditable={false} spellCheck={false} data-stitch-editable-idx="6" data-stitch-added-classes="cursor-text">
          {title ?? 'Registration'}
        </Title>
        <Subtitle contentEditable={false} spellCheck={false} data-stitch-editable-idx="7" data-stitch-added-classes="cursor-text">
          {subtitle ?? 'Step 1 of 5: Account Selection'}
        </Subtitle>
      </HeaderBlock>

      {hasCustom ? (
        <div style={{ padding: '0 1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
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
      </FooterActions>
    </Aside>
  )
}

export default SideNavBar
