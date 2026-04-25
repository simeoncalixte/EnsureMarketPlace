import React from 'react'
import styled from 'styled-components'

const Header = styled.header`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 auto;
  padding: 1rem 2rem;
  background: #0b1326;
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
  color: #adc6ff;
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
  color: #c1c6d7;
  text-decoration: none;
  transition: color 180ms ease;
  cursor: text;

  &:hover {
    color: #adc6ff;
  }
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

const MenuButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.9rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 0.75rem;
  background: rgba(34, 42, 61, 0.92);
  color: #dae2fd;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  transition: background-color 200ms ease, transform 100ms ease, border-color 200ms ease;
  cursor: pointer;

  &:hover {
    background: #171f33;
    border-color: rgba(173, 198, 255, 0.3);
  }

  &:active {
    transform: scale(0.98);
  }
`

const LoginButton = styled.button`
  background: #222a3d;
  color: #dae2fd;
  border: 0;
  border-radius: 0.375rem;
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  transition: background-color 200ms ease, transform 100ms ease;
  cursor: text;

  &:hover {
    background: #171f33;
  }

  &:active {
    transform: scale(0.95);
  }
`

export const TopNavBar: React.FC<{ isSidebarOpen?: boolean; onToggleSidebar?: () => void }> = ({ isSidebarOpen, onToggleSidebar }) => {
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
        <LoginButton contentEditable={true} spellCheck={false} data-stitch-editable-idx="5" data-stitch-added-classes="cursor-text">
          Institutional Login
        </LoginButton>
      </Actions>
    </Header>
  )
}

export default TopNavBar
