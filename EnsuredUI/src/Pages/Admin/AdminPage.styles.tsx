import styled from 'styled-components';

// ─── Layout ────────────────────────────────────────────────────────────────────

export const Page = styled.div`
  background: #0b1326;
  color: #dae2fd;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  min-height: auto;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
`;

export const Sidebar = styled.aside`
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 16rem;
  border-right: 1px solid rgba(65, 71, 85, 0.15);
  background: #131b2e;
  display: flex;
  flex-direction: column;
  z-index: 50;
  font-family: 'Manrope', sans-serif;
  letter-spacing: -0.01em;
`;

export const SidebarBrandWrap = styled.div`
  padding: 1.5rem;
`;

export const SidebarBrandTitle = styled.div`
  font-size: 1.125rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  color: #60a5fa;
`;

export const SidebarBrandSub = styled.div`
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #64748b;
  margin-top: 0.25rem;
  font-family: 'JetBrains Mono', monospace;
`;

export const SidebarNav = styled.nav`
  flex: 1;
  padding: 0 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const SidebarNavItem = styled.div<{ active?: boolean }>`
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 150ms, color 150ms;
  color: ${({ active }) => (active ? '#93c5fd' : '#94a3b8')};
  background: ${({ active }) => (active ? '#171f33' : 'transparent')};
  border-left: ${({ active }) => (active ? '2px solid #60a5fa' : '2px solid transparent')};
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  &:hover {
    color: ${({ active }) => (active ? '#93c5fd' : '#f1f5f9')};
    background: ${({ active }) => (active ? '#171f33' : '#222a3d')};
  }
  &:active { transform: scale(0.95); }
  .material-symbols-outlined {
    font-size: 1rem;
    margin-right: 0.75rem;
  }
`;

export const SidebarDeployWrap = styled.div`
  padding: 0 1.5rem 1.5rem;
`;

export const SidebarDeployBtn = styled.button`
  width: 100%;
  background: #4b8eff;
  color: #002e69;
  padding: 0.625rem 0;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  border: none;
  cursor: pointer;
  transition: filter 120ms, transform 80ms;
  &:hover { filter: brightness(1.1); }
  &:active { transform: scale(0.95); }
`;

export const SidebarFooter = styled.div`
  border-top: 1px solid rgba(65, 71, 85, 0.15);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const SidebarFooterItem = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  color: #94a3b8;
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: background 150ms, color 150ms;
  &:hover { background: #222a3d; color: #f1f5f9; }
  .material-symbols-outlined {
    font-size: 1rem;
    margin-right: 0.75rem;
  }
`;

// ─── TopBar ────────────────────────────────────────────────────────────────────

export const TopBar = styled.header`
  position: fixed;
  top: 0;
  right: 0;
  left: 16rem;
  height: 4rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
  z-index: 40;
  background: rgba(11, 19, 38, 0.6);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(65, 71, 85, 0.15);
  box-shadow: 0 40px 40px -15px rgba(173, 198, 255, 0.08);
`;

export const TopBarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
`;

export const TopBarTitle = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #fff;
  font-family: 'Manrope', sans-serif;
`;

export const TopBarNav = styled.nav`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

export const TopBarNavLink = styled.a<{ active?: boolean }>`
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: -0.02em;
  height: 4rem;
  display: flex;
  align-items: center;
  text-decoration: none;
  color: ${({ active }) => (active ? '#60a5fa' : '#94a3b8')};
  font-weight: ${({ active }) => (active ? '700' : '400')};
  border-bottom: ${({ active }) => (active ? '2px solid #60a5fa' : '2px solid transparent')};
  transition: color 150ms;
  &:hover { color: #93c5fd; }
`;

export const TopBarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

export const TopBarIconGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: 1rem;
`;

export const TopBarIcon = styled.span`
  color: #94a3b8;
  cursor: pointer;
  font-size: 1.25rem;
  transition: color 150ms;
  &:hover { color: #93c5fd; }
`;

export const TopBarBtn = styled.button<{ variant?: 'ghost' | 'primary' }>`
  padding: 0.375rem 1rem;
  border-radius: 0.125rem;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  border: none;
  cursor: pointer;
  transition: all 120ms;
  ${({ variant }) =>
    variant === 'primary'
      ? `
    background: #4b8eff;
    color: #002e69;
    &:hover { filter: brightness(1.1); }
  `
      : `
    background: #171f33;
    color: #60a5fa;
    border: 1px solid rgba(96, 165, 250, 0.2);
    &:hover { background: rgba(96, 165, 250, 0.1); }
  `}
`;

export const TopBarAvatar = styled.div`
  width: 2rem;
  height: 2rem;
  border-radius: 0.125rem;
  background: #2d3449;
  border: 1px solid rgba(65, 71, 85, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  img {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 9999px;
  }
`;

// ─── Main Canvas ───────────────────────────────────────────────────────────────

export const Main = styled.main`
  width: 100%;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

// ─── Macro Stats ───────────────────────────────────────────────────────────────

export const MacroGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1.5rem;
  @media (min-width: 768px) { grid-template-columns: repeat(4, 1fr); }
`;

export const MacroCard = styled.div<{ accentColor?: string; dim?: boolean }>`
  background: #171f33;
  padding: 1.25rem;
  border-radius: 0.5rem;
  border-left: 2px solid ${({ accentColor }) => accentColor || '#4b8eff'};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  opacity: ${({ dim }) => (dim ? 0.85 : 1)};
`;

export const MacroCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

export const MacroCardLabel = styled.span`
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  color: #c1c6d7;
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

export const MacroCardIcon = styled.span<{ color?: string }>`
  color: ${({ color }) => color || '#adc6ff'};
  font-size: 1.125rem;
`;

export const MacroCardValue = styled.div`
  font-size: 1.875rem;
  font-weight: 700;
  font-family: 'Manrope', sans-serif;
`;

export const MacroCardNote = styled.div<{ color?: string }>`
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  color: ${({ color }) => color || '#c1c6d7'};
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  .material-symbols-outlined { font-size: 0.625rem; }
`;

export const AvatarStack = styled.div`
  display: flex;
  margin-top: 0.5rem;
  & > * + * { margin-left: -0.5rem; }
`;

export const AvatarStackImg = styled.img`
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  border: 1px solid #0b1326;
  background: #2d3449;
`;

export const AvatarStackCount = styled.div`
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  border: 1px solid #0b1326;
  background: #222a3d;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.5rem;
  font-weight: 700;
`;

// ─── Middle Grid ───────────────────────────────────────────────────────────────

export const MiddleGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  @media (min-width: 1024px) { grid-template-columns: 2fr 1fr; }
`;

// ─── Simulation Engine ─────────────────────────────────────────────────────────

export const SimCard = styled.section`
  background: #171f33;
  padding: 2rem;
  border-radius: 0.5rem;
  position: relative;
  overflow: hidden;
`;

export const SimBgIcon = styled.span`
  position: absolute;
  top: 0;
  right: 0;
  padding: 1rem;
  opacity: 0.1;
  font-size: 6rem;
  line-height: 1;
  pointer-events: none;
`;

export const SimHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2rem;
  position: relative;
  z-index: 1;
`;

export const SimTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  font-family: 'Manrope', sans-serif;
  letter-spacing: -0.02em;
  margin: 0 0 0.25rem;
`;

export const SimSub = styled.p`
  font-size: 0.875rem;
  color: #c1c6d7;
  margin: 0;
`;

export const SimBadge = styled.span`
  background: rgba(147, 0, 26, 0.2);
  color: #ffb4ab;
  padding: 0.25rem 0.75rem;
  border-radius: 0.125rem;
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  border: 1px solid rgba(147, 0, 26, 0.4);
  white-space: nowrap;
`;

export const SimScenarioGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
  position: relative;
  z-index: 1;
  @media (min-width: 768px) { grid-template-columns: repeat(3, 1fr); }
`;

export const SimScenarioCard = styled.div`
  background: #222a3d;
  padding: 1rem;
  border-radius: 0.25rem;
  border: 1px solid rgba(65, 71, 85, 0.1);
  transition: border-color 200ms;
  &:hover { border-color: rgba(173, 198, 255, 0.4); }
`;

export const SimScenarioTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
`;

export const SimScenarioIcon = styled.span`
  color: #adc6ff;
  font-size: 1.5rem;
`;

export const ToggleWrap = styled.label`
  position: relative;
  display: inline-block;
  width: 2rem;
  height: 1rem;
  cursor: pointer;
`;

export const ToggleInput = styled.input.attrs({ type: 'checkbox' })`
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
  &:checked + span { background: #adc6ff; }
  &:checked + span::after { transform: translateX(1rem); }
`;

export const ToggleSlider = styled.span`
  position: absolute;
  inset: 0;
  background: #131b2e;
  border-radius: 9999px;
  transition: background 200ms;
  &::after {
    content: '';
    position: absolute;
    width: 0.75rem;
    height: 0.75rem;
    left: 0.125rem;
    top: 0.125rem;
    background: white;
    border-radius: 9999px;
    transition: transform 200ms;
  }
`;

export const SimScenarioTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 700;
  font-family: 'Manrope', sans-serif;
  margin: 0 0 0.25rem;
`;

export const SimScenarioDesc = styled.p`
  font-size: 0.625rem;
  color: #c1c6d7;
  margin: 0;
  line-height: 1.5;
`;

export const SimBottomGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: flex-end;
  position: relative;
  z-index: 1;
`;

export const SimImpactLabel = styled.h4`
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #c1c6d7;
  margin: 0 0 1rem;
`;

export const ImpactRow = styled.div`
  margin-bottom: 0.5rem;
`;

export const ImpactMeta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 0.25rem;
`;

export const ImpactTrack = styled.div`
  width: 100%;
  background: #2d3449;
  height: 4px;
  border-radius: 9999px;
  overflow: hidden;
`;

export const ImpactFill = styled.div<{ width: string; color: string }>`
  height: 100%;
  width: ${({ width }) => width};
  background: ${({ color }) => color};
`;

export const SimActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

export const SimDryRunBtn = styled.button`
  padding: 0.75rem 1.5rem;
  border: 1px solid rgba(65, 71, 85, 0.3);
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  background: transparent;
  color: #dae2fd;
  cursor: pointer;
  transition: background 120ms;
  &:hover { background: #2d3449; }
`;

export const SimTriggerBtn = styled.button`
  padding: 0.75rem 1.5rem;
  background: #93001a;
  color: #ffdad6;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(255, 180, 171, 0.1);
  transition: filter 120ms;
  &:hover { filter: brightness(1.1); }
`;

// ─── Data Seeding ──────────────────────────────────────────────────────────────

export const SeedingSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export const SeedingSectionLabel = styled.h3`
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #c1c6d7;
  margin: 0 0 0 0.25rem;
`;

export const SeedList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

export const SeedItem = styled.div<{ dim?: boolean }>`
  background: #171f33;
  padding: 1rem;
  border-radius: 0.25rem;
  border-left: 4px solid ${({ dim }) => (dim ? '#414755' : '#4b8eff')};
  opacity: ${({ dim }) => (dim ? 0.5 : 1)};
`;

export const SeedItemInner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const SeedItemLeft = styled.div`
  display: flex;
  align-items: center;
`;

export const SeedItemIcon = styled.span<{ color?: string }>`
  color: ${({ color }) => color || '#4b8eff'};
  font-size: 1.25rem;
  margin-right: 0.75rem;
`;

export const SeedItemTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
`;

export const SeedItemSub = styled.div`
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  color: #c1c6d7;
  margin-top: 0.1rem;
`;

export const SeedItemActions = styled.div`
  display: flex;
  gap: 0.25rem;
`;

export const SeedIconBtn = styled.button<{ color?: string }>`
  padding: 0.375rem;
  border-radius: 0.25rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${({ color }) => color || '#c1c6d7'};
  font-size: 0.875rem;
  transition: background 120ms;
  &:hover { background: #2d3449; }
  .material-symbols-outlined { font-size: 1rem; }
`;

export const IntegrityBox = styled.div`
  background: rgba(34, 42, 61, 0.4);
  border-radius: 0.5rem;
  padding: 1rem;
  border: 1px solid rgba(173, 198, 255, 0.1);
`;

export const IntegrityHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

export const IntegrityIcon = styled.span`
  color: #4edea3;
  font-size: 1.125rem;
`;

export const IntegrityLabel = styled.span`
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #4edea3;
`;

export const IntegrityText = styled.p`
  font-size: 0.625rem;
  color: #c1c6d7;
  font-style: italic;
  line-height: 1.5;
  margin: 0;
`;

// ─── Tranches Table ────────────────────────────────────────────────────────────

export const TrancheSection = styled.section`
  background: #171f33;
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
`;

export const TrancheSectionHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(65, 71, 85, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const TrancheSectionTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 700;
  font-family: 'Manrope', sans-serif;
  margin: 0;
`;

export const TrancheLegend = styled.div`
  display: flex;
  gap: 1rem;
`;

export const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  color: #c1c6d7;
`;

export const LegendDot = styled.span<{ color: string }>`
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: ${({ color }) => color};
  display: inline-block;
`;

export const TableWrap = styled.div`
  overflow-x: auto;
`;

export const Table = styled.table`
  width: 100%;
  text-align: left;
  font-family: 'JetBrains Mono', monospace;
  border-collapse: collapse;
`;

export const THead = styled.thead``;

export const THeadTr = styled.tr`
  background: #131b2e;
`;

export const TH = styled.th`
  padding: 1rem 1.5rem;
  font-size: 0.625rem;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #c1c6d7;
  white-space: nowrap;
`;

export const TBody = styled.tbody`
  & > tr {
    border-bottom: 1px solid rgba(65, 71, 85, 0.05);
    transition: background 150ms;
    font-size: 0.75rem;
    &:hover { background: #222a3d; }
  }
`;

export const TD = styled.td`
  padding: 1rem 1.5rem;
`;

export const TrancheName = styled.div`
  font-weight: 700;
  color: #adc6ff;
`;

export const TrancheSub = styled.div`
  font-size: 0.625rem;
  color: #c1c6d7;
`;

export const UtilizationWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

export const UtilizationTrack = styled.div`
  width: 6rem;
  background: #2d3449;
  height: 6px;
  border-radius: 9999px;
  overflow: hidden;
`;

export const UtilizationFill = styled.div<{ width: string; color: string }>`
  height: 100%;
  width: ${({ width }) => width};
  background: ${({ color }) => color};
`;

export const StatusBadge = styled.span<{
  variant: 'performing' | 'rebalancing' | 'margin' | 'halted';
}>`
  padding: 0.125rem 0.5rem;
  border-radius: 0.125rem;
  font-size: 0.5625rem;
  font-weight: 700;
  border: 1px solid;
  ${({ variant }) => {
    switch (variant) {
      case 'performing':
        return `background: rgba(78,222,163,0.1); color: #4edea3; border-color: rgba(78,222,163,0.2);`;
      case 'rebalancing':
        return `background: rgba(255,179,173,0.1); color: #ffb3ad; border-color: rgba(255,179,173,0.2);`;
      case 'margin':
        return `background: rgba(147,0,26,0.2); color: #ffb4ab; border-color: rgba(147,0,26,0.4);`;
      case 'halted':
        return `background: rgba(255,0,0,0.1); color: #ff6b6b; border-color: rgba(255,0,0,0.2);`;
    }
  }}
`;

export const YTM = styled.span<{ color: string }>`
  color: ${({ color }) => color};
`;

export const ActionBtn = styled.button<{ danger?: boolean }>`
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: -0.01em;
  cursor: pointer;
  border: none;
  background: transparent;
  color: ${({ danger }) => (danger ? '#ffb4ab' : '#ff5451')};
  transition: all 120ms;
  ${({ danger }) =>
    danger &&
    `
    background: rgba(255, 180, 171, 0.1);
    padding: 0.25rem 0.75rem;
    border-radius: 0.125rem;
    &:hover { background: rgba(255, 180, 171, 0.2); }
  `}
`;

export const TableFooter = styled.div`
  padding: 1rem;
  background: #060e20;
  border-top: 1px solid rgba(65, 71, 85, 0.1);
  display: flex;
  justify-content: center;
`;

export const ViewAllBtn = styled.button`
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  color: #c1c6d7;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: color 150ms;
  &:hover { color: #fff; }
  .material-symbols-outlined { font-size: 0.75rem; }
`;

// ─── Bottom Grid ───────────────────────────────────────────────────────────────

export const BottomGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  padding-bottom: 3rem;
  @media (min-width: 768px) { grid-template-columns: 1fr 1fr; }
`;

// ─── User Stats Panel ──────────────────────────────────────────────────────────

export const Panel = styled.section`
  background: #171f33;
  padding: 1.5rem;
  border-radius: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const PanelTitle = styled.h3`
  font-size: 0.75rem;
  font-weight: 700;
  font-family: 'Manrope', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin: 0;
`;

export const PanelLink = styled.button`
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  color: #adc6ff;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  .material-symbols-outlined { font-size: 0.75rem; }
`;

export const UserStatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
`;

export const UserStatBox = styled.div`
  background: #222a3d;
  padding: 1rem;
  border-radius: 0.25rem;
  text-align: center;
`;

export const UserStatLabel = styled.div`
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  color: #c1c6d7;
  margin-bottom: 0.25rem;
`;

export const UserStatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  font-family: 'Manrope', sans-serif;
`;

export const UserStatNote = styled.div<{ color?: string }>`
  font-size: 0.625rem;
  color: ${({ color }) => color || '#c1c6d7'};
  margin-top: 0.5rem;
`;

export const ApprovalList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

export const ApprovalItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: #131b2e;
  border-radius: 0.125rem;
  border: 1px solid rgba(65, 71, 85, 0.1);
`;

export const ApprovalItemLeft = styled.div`
  display: flex;
  align-items: center;
`;

export const ApprovalAvatar = styled.div<{ gradient: string }>`
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  background: ${({ gradient }) => gradient};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.625rem;
  flex-shrink: 0;
`;

export const ApprovalInfo = styled.div`
  margin-left: 0.75rem;
`;

export const ApprovalName = styled.div`
  font-size: 0.6875rem;
  font-weight: 700;
`;

export const ApprovalRole = styled.div`
  font-size: 0.5625rem;
  font-family: 'JetBrains Mono', monospace;
  color: #c1c6d7;
`;

export const ApprovalActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

export const ApprovalBtn = styled.button<{ variant: 'approve' | 'reject' }>`
  padding: 0.375rem;
  border-radius: 0.25rem;
  border: none;
  cursor: pointer;
  background: transparent;
  transition: background 120ms;
  color: ${({ variant }) => (variant === 'approve' ? '#4edea3' : '#ffb4ab')};
  .material-symbols-outlined { font-size: 1rem; }
  &:hover {
    background: ${({ variant }) =>
      variant === 'approve'
        ? 'rgba(0, 165, 114, 0.2)'
        : 'rgba(147, 0, 26, 0.2)'};
  }
`;

// ─── Event Ledger ──────────────────────────────────────────────────────────────

export const LedgerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.625rem;
`;

export const LedgerRow = styled.div`
  display: flex;
  gap: 1rem;
`;

export const LedgerTime = styled.span`
  color: #c1c6d7;
  white-space: nowrap;
`;

export const LedgerTag = styled.span<{ color: string }>`
  color: ${({ color }) => color};
`;

export const LedgerText = styled.span`
  color: #dae2fd;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const LedgerFooter = styled.div`
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(65, 71, 85, 0.1);
`;

export const LedgerFooterRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.6875rem;
  font-family: 'JetBrains Mono', monospace;
  color: #c1c6d7;
`;
