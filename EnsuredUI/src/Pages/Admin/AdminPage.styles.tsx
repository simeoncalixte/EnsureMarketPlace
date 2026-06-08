import styled from 'styled-components';
import { colors, withAlpha } from '../../xds/colors';

// ─── Layout ────────────────────────────────────────────────────────────────────

export const Page = styled.div`
  background: ${colors.surfaceDeep};
  color: ${colors.onSurfaceStrong};
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
  border-right: 1px solid ${withAlpha(colors.border, 0.15)};
  background: ${colors.surfacePanel};
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
  color: ${colors.dataViz.blueLight};
`;

export const SidebarBrandSub = styled.div`
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: ${colors.neutral[500]};
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
  color: ${({ active }) => (active ? colors.dataViz.blueLight : colors.neutral[400])};
  background: ${({ active }) => (active ? colors.surfaceRaised : 'transparent')};
  border-left: ${({ active }) => (active ? `2px solid ${colors.dataViz.blueLight}` : '2px solid transparent')};
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  &:hover {
    color: ${({ active }) => (active ? colors.dataViz.blueLight : colors.neutral[100])};
    background: ${({ active }) => (active ? colors.surfaceRaised : colors.surfaceHigh)};
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
  background: ${colors.primary};
  color: ${colors.onPrimary};
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
  border-top: 1px solid ${withAlpha(colors.border, 0.15)};
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const SidebarFooterItem = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  color: ${colors.neutral[400]};
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: background 150ms, color 150ms;
  &:hover { background: ${colors.surfaceHigh}; color: ${colors.neutral[100]}; }
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
  background: ${withAlpha(colors.surfaceDeep, 0.6)};
  backdrop-filter: blur(20px);
  border-bottom: 1px solid ${withAlpha(colors.border, 0.15)};
  box-shadow: 0 40px 40px -15px ${withAlpha(colors.primarySoft, 0.08)};
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
  color: ${colors.white};
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
  color: ${({ active }) => (active ? colors.dataViz.blueLight : colors.neutral[400])};
  font-weight: ${({ active }) => (active ? '700' : '400')};
  border-bottom: ${({ active }) => (active ? `2px solid ${colors.dataViz.blueLight}` : '2px solid transparent')};
  transition: color 150ms;
  &:hover { color: ${colors.dataViz.blueLight}; }
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
  color: ${colors.neutral[400]};
  cursor: pointer;
  font-size: 1.25rem;
  transition: color 150ms;
  &:hover { color: ${colors.dataViz.blueLight}; }
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
    background: ${colors.primary};
    color: ${colors.onPrimary};
    &:hover { filter: brightness(1.1); }
  `
      : `
    background: ${colors.surfaceRaised};
    color: ${colors.dataViz.blueLight};
    border: 1px solid ${withAlpha(colors.dataViz.blueLight, 0.2)};
    &:hover { background: ${withAlpha(colors.dataViz.blueLight, 0.1)}; }
  `}
`;

export const TopBarAvatar = styled.div`
  width: 2rem;
  height: 2rem;
  border-radius: 0.125rem;
  background: ${colors.surfaceElevated};
  border: 1px solid ${withAlpha(colors.border, 0.3)};
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

// Big value rendered inside the Approval Queue card.
export const MacroBigValue = styled.span`
  font-size: 1.875rem;
  font-weight: 700;
`;

// Mono affix shown after a value (e.g. "Pending").
export const MacroValueAffixMono = styled.span`
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 400;
  color: ${colors.onSurfaceMuted};
  margin-left: 4px;
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
  background: ${colors.surfaceRaised};
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

export const SimHeaderText = styled.div`
  display: flex;
  flex-direction: column;
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
  color: ${colors.onSurfaceMuted};
  margin: 0;
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
  background: ${colors.surfaceHigh};
  padding: 1rem;
  border-radius: 0.25rem;
  border: 1px solid ${withAlpha(colors.border, 0.1)};
  transition: border-color 200ms;
  &:hover { border-color: ${withAlpha(colors.primarySoft, 0.4)}; }
`;

export const SimScenarioTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
`;

export const SimScenarioIcon = styled.span`
  color: ${colors.primarySoft};
  font-size: 1.5rem;
`;

export const SimScenarioTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 700;
  font-family: 'Manrope', sans-serif;
  margin: 0 0 0.25rem;
`;

export const SimScenarioDesc = styled.p`
  font-size: 0.625rem;
  color: ${colors.onSurfaceMuted};
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
  color: ${colors.onSurfaceMuted};
  margin: 0 0 1rem;
`;

// Impact row: a labelled ProgressBar with a colored value readout.
export const ImpactRow = styled.div`
  & + & { margin-top: 0.5rem; }
`;

export const ImpactMeta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 0.25rem;
`;

export const ImpactValue = styled.span<{ color: string }>`
  color: ${({ color }) => color};
`;

export const SimActions = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.75rem;
`;

export const SimApplyLabel = styled.label`
  margin-left: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: ${colors.onSurfaceMuted};
`;

// ─── Data Seeding (consumed by SeedingPanel) ─────────────────────────────────────

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
  color: ${colors.onSurfaceMuted};
  margin: 0 0 0 0.25rem;
`;

export const SeedList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

export const SeedItem = styled.div<{ dim?: boolean }>`
  background: ${colors.surfaceRaised};
  padding: 1rem;
  border-radius: 0.25rem;
  border-left: 4px solid ${({ dim }) => (dim ? colors.border : colors.primary)};
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
  color: ${({ color }) => color || colors.primary};
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
  color: ${colors.onSurfaceMuted};
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
  color: ${({ color }) => color || colors.onSurfaceMuted};
  font-size: 0.875rem;
  transition: background 120ms;
  &:hover { background: ${colors.surfaceElevated}; }
  .material-symbols-outlined { font-size: 1rem; }
`;

export const IntegrityBox = styled.div`
  background: ${withAlpha(colors.surfaceHigh, 0.4)};
  border-radius: 0.5rem;
  padding: 1rem;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.1)};
`;

export const IntegrityHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

export const IntegrityIcon = styled.span`
  color: ${colors.accent};
  font-size: 1.125rem;
`;

export const IntegrityLabel = styled.span`
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: ${colors.accent};
`;

export const IntegrityText = styled.p`
  font-size: 0.625rem;
  color: ${colors.onSurfaceMuted};
  font-style: italic;
  line-height: 1.5;
  margin: 0;
`;

// ─── Tranches Table ────────────────────────────────────────────────────────────

export const TrancheSection = styled.section`
  background: ${colors.surfaceRaised};
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px ${withAlpha(colors.black, 0.4)};
`;

export const TrancheSectionHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid ${withAlpha(colors.border, 0.1)};
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
  color: ${colors.onSurfaceMuted};
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
  background: ${colors.surfacePanel};
`;

export const TH = styled.th`
  padding: 1rem 1.5rem;
  font-size: 0.625rem;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: ${colors.onSurfaceMuted};
  white-space: nowrap;
`;

export const TBody = styled.tbody`
  & > tr {
    border-bottom: 1px solid ${withAlpha(colors.border, 0.05)};
    transition: background 150ms;
    font-size: 0.75rem;
    &:hover { background: ${colors.surfaceHigh}; }
  }
`;

export const TD = styled.td`
  padding: 1rem 1.5rem;
`;

export const TrancheName = styled.div`
  font-weight: 700;
  color: ${colors.primarySoft};
`;

export const TrancheSub = styled.div`
  font-size: 0.625rem;
  color: ${colors.onSurfaceMuted};
`;

// Utilization cell: a fixed-width ProgressBar paired with a percentage readout.
export const UtilizationWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

export const UtilizationBar = styled.div`
  width: 6rem;
`;

export const UtilizationValue = styled.span<{ color?: string }>`
  color: ${({ color }) => color || 'inherit'};
`;

export const YTM = styled.span<{ color: string }>`
  color: ${({ color }) => color};
`;

export const CellRight = styled.div`
  text-align: right;
`;

export const TableFooter = styled.div`
  padding: 1rem;
  background: ${colors.background};
  border-top: 1px solid ${withAlpha(colors.border, 0.1)};
  display: flex;
  justify-content: center;
`;

export const ViewAllBtn = styled.button`
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  color: ${colors.onSurfaceMuted};
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: color 150ms;
  &:hover { color: ${colors.white}; }
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
  background: ${colors.surfaceRaised};
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
  color: ${colors.primarySoft};
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  .material-symbols-outlined { font-size: 0.75rem; }
`;

export const PanelLiveTag = styled.span`
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  color: ${colors.onSurfaceMuted};
`;

export const UserStatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
`;

export const UserStatBox = styled.div`
  background: ${colors.surfaceHigh};
  padding: 1rem;
  border-radius: 0.25rem;
  text-align: center;
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
  background: ${colors.surfacePanel};
  border-radius: 0.125rem;
  border: 1px solid ${withAlpha(colors.border, 0.1)};
`;

export const ApprovalItemLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

export const ApprovalInfo = styled.div``;

export const ApprovalName = styled.div`
  font-size: 0.6875rem;
  font-weight: 700;
`;

export const ApprovalRole = styled.div`
  font-size: 0.5625rem;
  font-family: 'JetBrains Mono', monospace;
  color: ${colors.onSurfaceMuted};
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
  color: ${({ variant }) => (variant === 'approve' ? colors.accent : colors.errorSoft)};
  .material-symbols-outlined { font-size: 1rem; }
  &:hover {
    background: ${({ variant }) =>
      variant === 'approve'
        ? withAlpha(colors.accentStrong, 0.2)
        : withAlpha(colors.danger, 0.2)};
  }
`;

// ─── Event Ledger ──────────────────────────────────────────────────────────────

export const LedgerFooter = styled.div`
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${withAlpha(colors.border, 0.1)};
`;

export const LedgerFooterRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.6875rem;
  font-family: 'JetBrains Mono', monospace;
  color: ${colors.onSurfaceMuted};
`;

export const LedgerStatusValue = styled.span`
  color: ${colors.accent};
`;

// ─── Line of Business sub-view nav ───────────────────────────────────────────────

export const SubViewBar = styled.div`
  padding: 12px 24px;
  border-bottom: 1px solid ${colors.surfaceRaised};
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const SubViewBackBtn = styled.button`
  background: none;
  border: 1px solid ${colors.surfaceElevated};
  border-radius: 6px;
  color: ${colors.primarySoft};
  padding: 4px 12px;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 6px;
  .material-symbols-outlined { font-size: 1rem; }
`;

export const SubViewLabel = styled.span`
  color: ${colors.onSurfaceMuted};
  font-size: 0.85rem;
`;
