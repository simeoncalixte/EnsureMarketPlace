import styled from 'styled-components';

export const PageWrapper = styled.div`
  /* Design tokens inspired by Tailwind prototype */
  --surface: #0b1326;
  --on-surface: #dae2fd;
  --on-surface-variant: #98a6bf;
  --primary: #adc6ff;
  --primary-strong: #4b8eff;
  --secondary: #4edea3;
  --surface-container: #171f33;
  --surface-container-highest: #2d3449;
  --outline: #8b90a0;
  --surface-container-low: #131b2e;
  --primary-container: #4b8eff;
  --secondary-container: #00a572;
  --tertiary-container: #ff5451;
  --surface-dim: #0b1326;
  display: flex;
  min-height: 100vh;
  overflow: hidden;
  background: var(--surface);
  color: var(--on-surface);
  font-family: var(--font-body, Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial);
`;

export const SideNav = styled.aside`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 18rem;
  position: fixed;
  left: 0;
  top: 0;
  padding: 1.5rem;
  background: #131b2e;
  border-right: 1px solid rgba(65,71,85,0.15);
  z-index: 40;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
`;

export const SideNavHeader = styled.div`
  padding: 0 0.5rem;
  margin-bottom: 2.5rem;
`;

export const SideNavTitle = styled.h2`
  color: var(--on-surface, #dae2fd);
  font-family: var(--font-headline, Manrope, sans-serif);
  font-weight: 800;
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  margin-bottom: 0.25rem;
`;

export const SideNavSub = styled.p`
  font-size: 0.625rem;
  color: var(--primary, #adc6ff);
  font-family: monospace;
`;

export const SideNavNav = styled.nav`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0 0.5rem;
`;

export const NavItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  color: #c1c6d7;
  border-radius: 0.125rem;
  cursor: pointer;
  transition: background 0.16s, color 0.16s;
  &:hover { background: #171f33; color: #e6eef8; }
`;

export const ActiveNavItem = styled(NavItem)`
  background: #222a3d;
  color: #4b8eff;
  border-left: 4px solid #4b8eff;
  font-weight: 700;
`;

export const SideNavFooter = styled.div`
  padding: 0 0.5rem;
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const SaveDraftButton = styled.button`
  width: 100%;
  background: #4b8eff;
  color: #001a41;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  cursor: pointer;
  border: none;
`;

export const Main = styled.main`
  margin-left: 18rem;
  min-height: 100vh;
  background: var(--surface, #0b1326);
  position: relative;
  flex: 1;
  overflow-y: auto;
`;

export const TopHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
  height: 64px;
  position: sticky;
  top: 0;
  z-index: 50;
  background: #0b1326;
  border-bottom: 1px solid rgba(65,71,85,0.15);
  box-shadow: 0 40px 40px -15px rgba(173,198,255,0.08);
  font-family: var(--font-headline, Manrope, sans-serif);
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
`;

export const Brand = styled.span`
  font-size: 1.125rem;
  font-weight: 800;
  color: #adc6ff;
`;

export const HeaderNav = styled.nav`
  display: none;
  gap: 1.5rem;
  align-items: center;
  @media (min-width: 768px) { display: flex; }
`;

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

export const SearchInput = styled.input`
  background: #171f33;
  border: none;
  font-size: 0.75rem;
  border-radius: 9999px;
  padding: 0.5rem 1rem;
  width: 16rem;
  color: var(--on-surface-variant, #94a3b8);
`;

export const ContentArea = styled.div`
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
`;

export const LeftColumn = styled.div`
  flex: 1;
  max-width: 64rem;
`;

export const Form = styled.form`
  display: block;
  gap: 2rem;
`;

export const Section = styled.section`
  margin-bottom: 2rem;
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 1rem;
`;

export const SectionTitle = styled.h3`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--on-surface);
`;

export const SectionRule = styled.div`
  flex: 1;
  height: 1px;
  background: rgba(65,71,85,0.12);
`;

export const GridTwo = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem 2rem;
`;

export const Input = styled.input`
  width: 100%;
  background: transparent;
  border-bottom: 1px solid rgba(65,71,85,0.18);
  padding: 0.5rem 0;
  color: var(--on-surface, #dae2fd);
  font-family: monospace;
  font-size: 1rem;
  &:focus{ outline:none; border-bottom-color:#4b8eff; }
`;

export const Select = styled.select`
  width: 100%;
  background: transparent;
  border-bottom: 1px solid rgba(65,71,85,0.18);
  padding: 0.5rem 0;
  color: var(--on-surface, #dae2fd);
  font-family: Inter, sans-serif;
  &:focus { outline:none; border-bottom-color:#4b8eff; }
`;

export const PerilButton = styled.button`
  padding: 0.35rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  &[data-active="true"] {
    background: #171f33;
    color: #4b8eff;
    border: 1px solid rgba(75,142,255,0.15);
  }
`;

export const TrancheCard = styled.div`
  background: #171f33;
  border-left: 4px solid rgba(75,142,255,0.25);
  padding: 1.25rem;
  border-radius: 0 0.5rem 0.5rem 0;
  &[data-primary="true"] {
    border-left-color: #4b8eff;
  }
  &[data-kind="subject"] {
    border-left-color: #4edea3;
  }
`;

export const TrancheGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  align-items: end;
`;

export const RightAside = styled.aside`
  width: 24rem;
  position: sticky;
  top: 6rem;
`;

export const SummaryCard = styled.div`
  background: #171f33;
  border-radius: 0.5rem;
  border: 1px solid rgba(75,142,255,0.08);
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
`;

export const SummaryInner = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(65,71,85,0.08);
`;

export const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

export const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: var(--on-surface, #dae2fd);
`;

export const SubmitButton = styled.button`
  background: #4b8eff;
  color: #001a41;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-weight: 800;
  cursor: pointer;
  border: none;
`;

export const MobileBottomBar = styled.div`
  display: none;
  @media (max-width: 767px) {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background: #171f33;
    border-top: 1px solid rgba(65,71,85,0.15);
    justify-content: space-around;
    padding: 0.75rem;
    z-index: 50;
  }
`;

export const Icon = styled.span`
  &.material-symbols-outlined { font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24; }
`;

/* Pipeline & Ingestion specific layout components */
export const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
`;

export const PageTitle = styled.h2`
  margin: 0;
  font-size: 2rem;
  font-weight: 800;
`;

export const PageSubtitle = styled.p`
  margin-top: 0.375rem;
  color: var(--on-surface-variant, #98a6bf);
`;

export const HeaderControls = styled.div`
  display: flex;
  gap: 0.75rem;
`;

export const StatusBadge = styled.div`
  background: #0f1724;
  padding: 0.625rem 0.875rem;
  display: flex;
  gap: 0.75rem;
  align-items: center;
  border-left: 4px solid transparent;
  border-radius: 6px;
`;

export const StatusDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 999px;
`;

export const StatusText = styled.div`
  font-size: 0.6875rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  text-transform: uppercase;
  font-weight: 700;
`;

export const QueueCard = styled.div`
  background: #0f1724;
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1.25rem;
`;

export const QueueHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

export const QueueTitle = styled.div`
  font-size: 0.75rem;
  font-family: var(--font-headline, Manrope, sans-serif);
  font-weight: 800;
  text-transform: uppercase;
  color: var(--on-surface-variant, #98a6bf);
`;

export const StreamsBadge = styled.div`
  font-size: 0.625rem;
  background: rgba(75,142,255,0.08);
  color: #4b8eff;
  padding: 4px 8px;
  border-radius: 6px;
`;

export const Grid3 = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
`;

export const PageShell = styled.div`
  padding: 2.5rem;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
`;

export const IntroColumn = styled.div`
  width: 18rem;
  flex: 0 0 18rem;
`;

export const CenterColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const Step = styled.div``;

export const StepRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 0.5rem;
`;

export const StepLabel = styled.div`
  font-size: 0.75rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  color: var(--on-surface, #dae2fd);
`;

export const StepPercent = styled.div`
  font-size: 0.625rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  color: #4edea3;
`;

export const ProgressBar = styled.div`
  height: 8px;
  background: #171f33;
  border-radius: 6px;
  overflow: hidden;
`;

export const ProgressFill = styled.div<{ w?: string }>`
  height: 100%;
  width: ${(p) => p.w || '0%'};
  background: #4edea3;
`;

export const Tag = styled.div`
  margin-top: 0.5rem;
  font-size: 0.625rem;
  background: #00a57214;
  color: #4edea3;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 700;
  display: inline-block;
`;

export const ConfigGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
`;

export const ChannelCard = styled.div`
  background: #0f1724;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid rgba(0,0,0,0);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 10rem;
`;

export const ChannelPrimary = styled(ChannelCard)`
  border-left-color: #00a572;
`;

export const ChannelSync = styled(ChannelCard)`
  border-left-color: #4b8eff;
`;

export const ChannelNeutral = styled(ChannelCard)`
  border-left-color: rgba(148,163,184,0.2);
`;

export const UploadCard = styled.div`
  border: 2px dashed rgba(65,71,85,0.3);
  border-radius: 8px;
  padding: 1.25rem;
  text-align: center;
  background: #0b1326;
`;

export const QueuedList = styled.div`
  display: grid;
  gap: 0.75rem;
`;

export const QueueItem = styled.div`
  background: #0f1724;
  padding: 0.75rem;
  border-radius: 8px;
  display: flex;
  gap: 0.75rem;
  align-items: center;
`;

export const ItemLeft = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  min-width: 12.5rem;
`;

export const ItemMeta = styled.div``;

export const ItemTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 800;
`;

export const ItemSub = styled.div`
  font-size: 0.75rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  color: var(--on-surface-variant, #98a6bf);
`;

/* Reusable primitives inspired by the Tailwind prototype */
export const IconAvatar = styled.div<{ bg?: string; color?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(p) => p.bg || 'transparent'};
  color: ${(p) => p.color || 'var(--on-surface)'};
  font-size: 1rem;
`;

export const Pill = styled.div<{ tone?: 'primary' | 'secondary' | 'muted' }>`
  background: ${(p) => (p.tone === 'primary' ? '#4b8eff14' : p.tone === 'secondary' ? '#00a57214' : '#171f33')};
  color: ${(p) => (p.tone === 'primary' ? '#4b8eff' : p.tone === 'secondary' ? '#4edea3' : '#98a6bf')};
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
`;

export const CardTitle = styled.h4`
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: var(--on-surface);
`;

export const CardMeta = styled.p`
  margin-top: 6px;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 0.75rem;
  color: var(--on-surface-variant);
`;

export const ConfigureBtn = styled.button`
  flex: 1;
  padding: 8px 10px;
  background: var(--surface-container);
  color: var(--on-surface-variant, #94a3b8);
  border-radius: 6px;
  border: none;
  cursor: pointer;
`;

export const ToggleBtn = styled.button<{ active?: boolean }>`
  padding: 8px;
  border-radius: 6px;
  border: none;
  background: ${(p) => (p.active ? '#00a57222' : '#171f33')};
  color: ${(p) => (p.active ? '#00a572' : '#98a6bf')};
  cursor: pointer;
`;

export const CardFooter = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`;

/* ── Pipeline Ingestion — channel grid & picker ─────────────── */
export const ChannelGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  @media (max-width: 1200px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 760px)  { grid-template-columns: 1fr; }
`;

export const ChannelCardBase = styled.div<{ $accent?: string }>`
  background: #0f1724;
  padding: 1rem;
  border-radius: 10px;
  border-left: 4px solid ${({ $accent }) => $accent ?? 'rgba(148,163,184,0.2)'};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 10rem;
  transition: box-shadow 0.15s;
  &:hover { box-shadow: 0 4px 24px rgba(0,0,0,0.25); }
`;

export const AddChannelCard = styled.button`
  background: transparent;
  border: 2px dashed rgba(65,71,85,0.4);
  border-radius: 10px;
  padding: 1.25rem;
  text-align: center;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 10rem;
  color: #94a3b8;
  font-size: 0.875rem;
  font-weight: 500;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  &:hover {
    border-color: #4b8eff;
    color: #adc6ff;
    background: rgba(75,142,255,0.04);
  }
`;

export const AddChannelIcon = styled.span`
  font-family: 'Material Symbols Outlined';
  font-size: 2rem;
  line-height: 1;
`;

export const PickerPanel = styled.div`
  background: rgba(13,20,34,0.98);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  padding: 1.5rem;
  grid-column: 1 / -1;
`;

export const PickerPanelTitle = styled.div`
  font-size: 0.8125rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  margin-bottom: 1rem;
`;

export const PickerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
  @media (max-width: 900px) { grid-template-columns: repeat(3, 1fr); }
`;

export const PickerTypeCard = styled.button<{ $accent: string; $selected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0.5rem;
  border-radius: 0.75rem;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  background: ${({ $selected, $accent }) => $selected ? `${$accent}1a` : 'rgba(255,255,255,0.03)'};
  border: 1.5px solid ${({ $selected, $accent }) => $selected ? $accent : 'rgba(255,255,255,0.06)'};
  color: ${({ $selected, $accent }) => $selected ? $accent : '#64748b'};
  &:hover { border-color: ${({ $accent }) => $accent}; color: ${({ $accent }) => $accent}; background: ${({ $accent }) => $accent}14; }
`;

export const PickerTypeIcon = styled.div<{ $bg: string }>`
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.625rem;
  background: ${({ $bg }) => $bg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
`;

export const PickerActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255,255,255,0.06);
`;

// ---- RabbitMQ Config page ----

export const Breadcrumb = styled.nav`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  color: #64748b;
  margin-bottom: 1.5rem;
  letter-spacing: -0.01em;
`;

export const BreadcrumbItem = styled.span`
  cursor: pointer;
  transition: color 0.15s;
  &:hover { color: #adc6ff; }
`;

export const BreadcrumbSep = styled.span`
  font-size: 14px;
  user-select: none;
  font-family: 'Material Symbols Outlined';
`;

export const BreadcrumbActive = styled.span`
  color: #dae2fd;
`;

export const RabbitPageHeader = styled.header`
  margin-bottom: 2.5rem;
`;

export const RabbitPageTitle = styled.h1`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #dae2fd;
  margin: 0 0 0.5rem;
`;

export const RabbitPageDesc = styled.p`
  color: var(--on-surface-variant, #98a6bf);
  max-width: 42rem;
  margin: 0;
  line-height: 1.6;
`;

export const RabbitGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2rem;
`;

export const ConfigCard = styled.section`
  grid-column: span 7;
  background: #131b2e;
  padding: 2rem;
  border-radius: 0.75rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  position: relative;
  overflow: hidden;
  @media (max-width: 1024px) { grid-column: span 12; }
`;

export const ConfigCardDecor = styled.span`
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-family: 'Material Symbols Outlined';
  font-size: 3.75rem;
  color: rgba(65, 71, 85, 0.3);
  user-select: none;
`;

export const ConfigCardTitle = styled.h2`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 1.125rem;
  font-weight: 700;
  color: #adc6ff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1.5rem;
`;

export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export const FieldLabel = styled.label`
  display: block;
  font-size: 0.6875rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #64748b;
  margin-bottom: 0.5rem;
`;

export const TwoFields = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
`;

export const TogglesRow = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
  padding-top: 1rem;
`;

export const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
`;

export const ToggleTrack = styled.div<{ $checked?: boolean }>`
  position: relative;
  width: 2.5rem;
  height: 1.25rem;
  border-radius: 9999px;
  background: ${(p) => (p.$checked ? '#4edea3' : '#222a3d')};
  transition: background 0.2s;
  flex-shrink: 0;
`;

export const ToggleKnob = styled.div<{ $checked?: boolean }>`
  position: absolute;
  top: 0.125rem;
  left: ${(p) => (p.$checked ? 'calc(100% - 1rem - 0.125rem)' : '0.125rem')};
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: #ffffff;
  transition: left 0.2s;
`;

export const ToggleText = styled.span`
  font-size: 0.6875rem;
  font-weight: 700;
  font-family: var(--font-headline, Manrope, sans-serif);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #94a3b8;
`;

export const BtnRow = styled.div`
  display: flex;
  gap: 1rem;
  padding-top: 1.5rem;
`;

export const GhostBtn = styled.button`
  padding: 0.75rem 1.5rem;
  background: #222a3d;
  color: #dae2fd;
  font-size: 0.6875rem;
  font-weight: 700;
  font-family: var(--font-headline, Manrope, sans-serif);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  border: 1px solid rgba(65, 71, 85, 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.15s;
  &:hover { background: #31394d; }
`;

export const FillBtn = styled.button`
  padding: 0.75rem 1.5rem;
  background: #4b8eff;
  color: #001a41;
  font-size: 0.6875rem;
  font-weight: 700;
  font-family: var(--font-headline, Manrope, sans-serif);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  border: none;
  cursor: pointer;
  box-shadow: 0 10px 15px -3px rgba(75, 142, 255, 0.2);
  transition: filter 0.15s;
  &:hover { filter: brightness(1.1); }
`;

export const StatsColumn = styled.div`
  grid-column: span 5;
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 2rem;
  @media (max-width: 1024px) { grid-column: span 12; }
`;

export const ThroughputCard = styled.div`
  background: #171f33;
  padding: 1.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(65, 71, 85, 0.1);
  position: relative;
  overflow: hidden;
`;

export const ThroughputHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

export const ThroughputLabel = styled.h3`
  font-size: 0.625rem;
  text-transform: uppercase;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  letter-spacing: 0.1em;
  color: #64748b;
  margin: 0 0 0.25rem;
`;

export const ThroughputNum = styled.div`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 2.5rem;
  font-weight: 800;
  color: #dae2fd;
  line-height: 1.1;
`;

export const ThroughputUnit = styled.span`
  font-size: 1.125rem;
  font-weight: 400;
  color: #64748b;
  margin-left: 0.25rem;
`;

export const BarsWrap = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 0.25rem;
  height: 4rem;
  width: 100%;
  opacity: 0.5;
  margin-top: 0.5rem;
`;

export const Bar = styled.div<{ $h: string; $op?: number }>`
  flex: 1;
  background: #4edea3;
  height: ${(p) => p.$h};
  opacity: ${(p) => p.$op ?? 1};
`;

export const MetricsCard = styled.div`
  background: #171f33;
  padding: 1.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(65, 71, 85, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

export const MetricsList = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
`;

export const MetricEntry = styled.div<{ $accent?: string }>`
  border-left: 2px solid ${(p) => p.$accent || '#adc6ff'};
  padding-left: 1rem;
`;

export const MetricLabel = styled.div`
  font-size: 0.625rem;
  text-transform: uppercase;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  letter-spacing: 0.1em;
  color: #64748b;
  margin-bottom: 0.25rem;
`;

export const MetricValue = styled.div`
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 1.5rem;
  color: #dae2fd;
`;

export const QueueSection = styled.section`
  grid-column: span 12;
  background: #131b2e;
  border-radius: 0.5rem;
  overflow: hidden;
`;

export const QueueTableTop = styled.div`
  padding: 1rem 2rem;
  background: #171f33;
  border-bottom: 1px solid rgba(65, 71, 85, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const QueueTableTitle = styled.h2`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #cbd5e1;
  margin: 0;
`;

export const StreamingBadge = styled.span`
  font-size: 0.625rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  color: #4edea3;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const StreamingDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4edea3;
  animation: rmq-pulse 2s ease-in-out infinite;
  @keyframes rmq-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
`;

export const QueueTable = styled.table`
  width: 100%;
  text-align: left;
  border-collapse: collapse;
`;

export const QueueTH = styled.th`
  padding: 1rem 2rem;
  font-size: 0.625rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748b;
  font-weight: 500;
  background: rgba(6, 14, 32, 0.5);
`;

export const QueueTR = styled.tr`
  border-bottom: 1px solid rgba(65, 71, 85, 0.1);
  transition: background 0.15s;
  &:hover { background: rgba(34, 42, 61, 0.5); }
`;

export const QueueTD = styled.td`
  padding: 1rem 2rem;
  font-size: 0.875rem;
`;

export const QueueNameCell = styled(QueueTD)`
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  color: #adc6ff;
`;

export const QueueMonoCell = styled(QueueTD)`
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
`;

export const QueueStatusChip = styled.span<{ $status: 'active' | 'idle' | 'slow' }>`
  padding: 2px 8px;
  border-radius: 0.125rem;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: ${(p) =>
    p.$status === 'active' ? '#00a572' :
    p.$status === 'slow'   ? '#ff5451' :
    '#222a3d'};
  color: ${(p) =>
    p.$status === 'active' ? '#00311f' :
    p.$status === 'slow'   ? '#5c0008' :
    '#94a3b8'};
`;

export const QueueActionBtn = styled.button`
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-family: 'Material Symbols Outlined';
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  transition: color 0.15s;
  &:hover { color: #adc6ff; }
`;

export const QueueMenuWrap = styled.div`
  position: relative;
  display: inline-block;
`;

export const QueueMenu = styled.div`
  position: absolute;
  right: 0;
  top: 1.75rem;
  background: #0f1724;
  border: 1px solid rgba(65,71,85,0.12);
  border-radius: 6px;
  padding: 0.25rem;
  min-width: 12rem;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  z-index: 100;
`;

export const QueueMenuItem = styled.button`
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: transparent;
  color: #dae2fd;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.875rem;
  &:hover { background: rgba(75,142,255,0.06); color: #adc6ff; }
`;

// ---- Email Ingest Config page ----

export const EmailPageHeader = styled.header`
  margin-bottom: 2.5rem;
`;

export const EmailPageTitle = styled.h1`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #dae2fd;
  margin: 0 0 0.5rem;
`;

export const EmailPageDesc = styled.p`
  color: var(--on-surface-variant, #98a6bf);
  max-width: 42rem;
  margin: 0;
  line-height: 1.6;
`;

export const EmailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2rem;
`;

/* Provider selection cards row */
export const ProviderRow = styled.div`
  grid-column: span 12;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

export const ProviderCard = styled.button<{ $selected?: boolean; $accent: string }>`
  background: #131b2e;
  border: 2px solid ${(p) => (p.$selected ? p.$accent : 'rgba(65,71,85,0.2)')};
  border-radius: 0.75rem;
  padding: 1.5rem;
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  position: relative;
  box-shadow: ${(p) => (p.$selected ? `0 0 0 1px ${p.$accent}33, 0 8px 24px rgba(0,0,0,0.4)` : 'none')};
  &:hover { border-color: ${(p) => p.$accent}; }
`;

export const ProviderLogo = styled.div<{ $bg: string }>`
  width: 3rem;
  height: 3rem;
  border-radius: 0.5rem;
  background: ${(p) => p.$bg};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1.5rem;
`;

export const ProviderName = styled.div`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 1rem;
  font-weight: 700;
  color: #dae2fd;
  margin-bottom: 0.25rem;
`;

export const ProviderMeta = styled.div`
  font-size: 0.75rem;
  color: var(--on-surface-variant, #98a6bf);
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
`;

export const ProviderCheckmark = styled.div<{ $accent: string; $visible?: boolean }>`
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: ${(p) => p.$accent};
  color: #ffffff;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${(p) => (p.$visible ? 1 : 0)};
  transition: opacity 0.2s;
  font-family: 'Material Symbols Outlined';
`;

/* OAuth connect panel */
export const OAuthPanel = styled.section`
  grid-column: span 7;
  background: #131b2e;
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
  @media (max-width: 1024px) { grid-column: span 12; }
`;

export const OAuthPanelTitle = styled.h2`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 1.125rem;
  font-weight: 700;
  color: #adc6ff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1.75rem;
`;

export const OAuthScopes = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.75rem;
`;

export const ScopeRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  background: #0b1326;
  border-radius: 0.5rem;
  border: 1px solid rgba(65,71,85,0.15);
`;

export const ScopeIcon = styled.div<{ $color: string }>`
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  background: ${(p) => p.$color}14;
  color: ${(p) => p.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-family: 'Material Symbols Outlined';
  font-size: 1rem;
`;

export const ScopeText = styled.div`
  flex: 1;
`;

export const ScopeName = styled.div`
  font-size: 0.8125rem;
  font-weight: 600;
  color: #dae2fd;
  margin-bottom: 0.125rem;
`;

export const ScopeDesc = styled.div`
  font-size: 0.6875rem;
  color: var(--on-surface-variant, #98a6bf);
  line-height: 1.5;
`;

export const ScopeToggleWrap = styled.div`
  margin-left: auto;
  flex-shrink: 0;
`;

export const ConnectBtn = styled.button<{ $provider: 'google' | 'microsoft' | 'disabled' }>`
  width: 100%;
  padding: 0.875rem 1.5rem;
  border-radius: 0.5rem;
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: ${(p) => (p.$provider === 'disabled' ? 'not-allowed' : 'pointer')};
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  transition: filter 0.15s, box-shadow 0.15s;
  background: ${(p) =>
    p.$provider === 'google'    ? 'linear-gradient(135deg,#4285f4,#34a853)' :
    p.$provider === 'microsoft' ? 'linear-gradient(135deg,#00a4ef,#7fba00)' :
    '#222a3d'};
  color: ${(p) => (p.$provider === 'disabled' ? '#64748b' : '#ffffff')};
  box-shadow: ${(p) =>
    p.$provider === 'google'    ? '0 8px 24px rgba(66,133,244,0.3)' :
    p.$provider === 'microsoft' ? '0 8px 24px rgba(0,164,239,0.3)' :
    'none'};
  &:hover:not(:disabled) { filter: brightness(1.08); }
`;

export const SecurityNote = styled.div`
  margin-top: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.6875rem;
  color: #64748b;
  line-height: 1.5;
`;

/* Mail filter settings panel */
export const FilterPanel = styled.section`
  grid-column: span 5;
  background: #131b2e;
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
  @media (max-width: 1024px) { grid-column: span 12; }
`;

export const FilterPanelTitle = styled.h2`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 1.125rem;
  font-weight: 700;
  color: #adc6ff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1.75rem;
`;

export const FilterFieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

export const RadioGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const RadioOption = styled.label<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  border-radius: 0.375rem;
  background: ${(p) => (p.$selected ? 'rgba(75,142,255,0.08)' : 'transparent')};
  border: 1px solid ${(p) => (p.$selected ? 'rgba(75,142,255,0.25)' : 'transparent')};
  cursor: pointer;
  transition: background 0.15s;
  font-size: 0.8125rem;
  color: ${(p) => (p.$selected ? '#adc6ff' : '#94a3b8')};
  &:hover { background: rgba(75,142,255,0.05); }
`;

export const RadioDot = styled.div<{ $selected?: boolean }>`
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  border: 2px solid ${(p) => (p.$selected ? '#4b8eff' : '#414755')};
  position: relative;
  flex-shrink: 0;
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;
    background: #4b8eff;
    opacity: ${(p) => (p.$selected ? 1 : 0)};
    transition: opacity 0.15s;
  }
`;

/* Connected accounts table */
export const AccountsSection = styled.section`
  grid-column: span 12;
  background: #131b2e;
  border-radius: 0.75rem;
  overflow: hidden;
`;

export const AccountsTableTop = styled.div`
  padding: 1rem 2rem;
  background: #171f33;
  border-bottom: 1px solid rgba(65,71,85,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const AccountsTableTitle = styled.h2`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #cbd5e1;
  margin: 0;
`;

export const AccountsTable = styled.table`
  width: 100%;
  text-align: left;
  border-collapse: collapse;
`;

export const AccountsTH = styled.th`
  padding: 1rem 2rem;
  font-size: 0.625rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748b;
  font-weight: 500;
  background: rgba(6,14,32,0.5);
`;

export const AccountsTR = styled.tr`
  border-bottom: 1px solid rgba(65,71,85,0.1);
  transition: background 0.15s;
  &:hover { background: rgba(34,42,61,0.5); }
`;

export const AccountsTD = styled.td`
  padding: 1rem 2rem;
  font-size: 0.875rem;
  color: #dae2fd;
`;

export const AccountLogoCell = styled(AccountsTD)`
  width: 2.5rem;
  padding-right: 0;
`;

export const AccountLogo = styled.div<{ $bg: string }>`
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  background: ${(p) => p.$bg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
`;

export const AccountEmailCell = styled(AccountsTD)`
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  color: #adc6ff;
`;

export const AccountStatusChip = styled.span<{ $ok?: boolean }>`
  padding: 2px 8px;
  border-radius: 0.125rem;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: ${(p) => (p.$ok ? '#00a572' : '#ff5451')};
  color: ${(p) => (p.$ok ? '#00311f' : '#5c0008')};
`;

export const AccountRevokeBtn = styled.button`
  background: transparent;
  border: 1px solid rgba(255,84,81,0.25);
  color: #ff5451;
  border-radius: 0.25rem;
  padding: 4px 10px;
  font-size: 0.625rem;
  font-weight: 700;
  font-family: var(--font-headline, Manrope, sans-serif);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: rgba(255,84,81,0.1); }
`;

// ---- Cloud Storage Config page ----

export const CloudGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2rem;
`;

/* Provider picker row — 3 cards */
export const CloudProviderRow = styled.div`
  grid-column: span 12;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

/* Reuses ProviderCard / ProviderLogo / ProviderName / ProviderMeta / ProviderCheckmark from email section */

/* Credentials / connection card */
export const CloudConnCard = styled.section`
  grid-column: span 7;
  background: #131b2e;
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
  position: relative;
  overflow: hidden;
  @media (max-width: 1024px) { grid-column: span 12; }
`;

export const CloudConnCardDecor = styled.span`
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-family: 'Material Symbols Outlined';
  font-size: 3.75rem;
  color: rgba(65,71,85,0.25);
  user-select: none;
`;

export const CloudConnTitle = styled.h2`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 1.125rem;
  font-weight: 700;
  color: #adc6ff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1.75rem;
`;

export const MaskedInput = styled.div`
  position: relative;
`;

export const EyeBtn = styled.button`
  position: absolute;
  right: 0;
  bottom: 0.5rem;
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-family: 'Material Symbols Outlined';
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  transition: color 0.15s;
  &:hover { color: #adc6ff; }
`;

/* Watch paths list */
export const WatchPathList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

export const WatchPathRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const WatchPathChip = styled.div`
  flex: 1;
  background: #0b1326;
  border: 1px solid rgba(65,71,85,0.2);
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 0.8125rem;
  color: #adc6ff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const WatchPathRemove = styled.button`
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-family: 'Material Symbols Outlined';
  font-size: 1rem;
  display: flex;
  align-items: center;
  transition: color 0.15s;
  &:hover { color: #ff5451; }
`;

export const AddPathBtn = styled.button`
  background: transparent;
  border: 1px dashed rgba(65,71,85,0.4);
  border-radius: 0.375rem;
  padding: 0.5rem 0.875rem;
  font-size: 0.6875rem;
  font-weight: 600;
  font-family: var(--font-headline, Manrope, sans-serif);
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  transition: border-color 0.15s, color 0.15s;
  &:hover { border-color: #adc6ff; color: #adc6ff; }
`;

/* Options side panel */
export const CloudOptionsPanel = styled.section`
  grid-column: span 5;
  background: #131b2e;
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  @media (max-width: 1024px) { grid-column: span 12; }
`;

export const CloudOptionTitle = styled.h2`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 1.125rem;
  font-weight: 700;
  color: #adc6ff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.25rem;
`;

export const OptionRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.875rem 1rem;
  background: #0b1326;
  border-radius: 0.5rem;
  border: 1px solid rgba(65,71,85,0.12);
  gap: 1rem;
`;

export const OptionText = styled.div``;

export const OptionName = styled.div`
  font-size: 0.8125rem;
  font-weight: 600;
  color: #dae2fd;
  margin-bottom: 0.125rem;
`;

export const OptionDesc = styled.div`
  font-size: 0.6875rem;
  color: var(--on-surface-variant, #98a6bf);
  line-height: 1.5;
`;

/* Connected buckets table */
export const BucketsSection = styled.section`
  grid-column: span 12;
  background: #131b2e;
  border-radius: 0.75rem;
  overflow: hidden;
`;

export const BucketsTableTop = styled.div`
  padding: 1rem 2rem;
  background: #171f33;
  border-bottom: 1px solid rgba(65,71,85,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const BucketsTableTitle = styled.h2`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #cbd5e1;
  margin: 0;
`;

export const BucketsTable = styled.table`
  width: 100%;
  text-align: left;
  border-collapse: collapse;
`;

export const BucketsTH = styled.th`
  padding: 1rem 2rem;
  font-size: 0.625rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748b;
  font-weight: 500;
  background: rgba(6,14,32,0.5);
`;

export const BucketsTR = styled.tr`
  border-bottom: 1px solid rgba(65,71,85,0.1);
  transition: background 0.15s;
  &:hover { background: rgba(34,42,61,0.5); }
`;

export const BucketsTD = styled.td`
  padding: 1rem 2rem;
  font-size: 0.875rem;
  color: #dae2fd;
`;

export const BucketNameCell = styled(BucketsTD)`
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  color: #adc6ff;
`;

export const BucketMonoCell = styled(BucketsTD)`
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  color: #98a6bf;
  font-size: 0.8125rem;
`;

export const BucketStatusChip = styled.span<{ $status: 'syncing' | 'idle' | 'error' }>`
  padding: 2px 8px;
  border-radius: 0.125rem;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: ${(p) =>
    p.$status === 'syncing' ? '#4b8eff22' :
    p.$status === 'error'   ? '#ff5451' :
    '#222a3d'};
  color: ${(p) =>
    p.$status === 'syncing' ? '#4b8eff' :
    p.$status === 'error'   ? '#5c0008' :
    '#94a3b8'};
`;

export const BucketActionBtn = styled.button`
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-family: 'Material Symbols Outlined';
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  transition: color 0.15s;
  &:hover { color: #adc6ff; }
`;

/* ── SFTP Config ─────────────────────────────────────────────── */
export const SFTPGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 1.25rem;
  @media (max-width: 1100px) { grid-template-columns: 1fr; }
`;

export const SFTPConnCard = styled.div`
  grid-column: 1;
  grid-row: 1 / 3;
  background: rgba(17,25,40,0.72);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  padding: 1.75rem;
  position: relative;
  overflow: hidden;
`;

export const SFTPConnCardDecor = styled.span`
  position: absolute;
  top: -1rem; right: -1rem;
  font-family: 'Material Symbols Outlined';
  font-size: 9rem;
  color: rgba(255,255,255,0.03);
  pointer-events: none;
  user-select: none;
  line-height: 1;
`;

export const SFTPConnTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 1.25rem;
`;

export const SFTPAuthRow = styled.div`
  display: flex;
  gap: 0.625rem;
  margin-bottom: 1.25rem;
`;

export const SFTPAuthTab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 0.5rem 0;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  background: ${({ $active }) => $active ? 'rgba(75,142,255,0.18)' : 'rgba(255,255,255,0.04)'};
  border: 1.5px solid ${({ $active }) => $active ? '#4b8eff' : 'rgba(255,255,255,0.08)'};
  color: ${({ $active }) => $active ? '#adc6ff' : '#64748b'};
  &:hover { border-color: #4b8eff; color: #adc6ff; }
`;

export const SFTPKeyArea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  min-height: 8rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 0.5rem;
  color: #c8d8f0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  padding: 0.625rem 0.75rem;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
  &::placeholder { color: #475569; }
  &:focus { border-color: rgba(75,142,255,0.5); }
`;

export const SFTPKnownHostsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0;
  border-top: 1px solid rgba(255,255,255,0.06);
`;

export const SFTPKnownHostsLabel = styled.span`
  font-size: 0.8125rem;
  color: #94a3b8;
`;

export const SFTPKnownHostsFp = styled.code`
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: #4edea3;
  background: rgba(78,222,163,0.08);
  border-radius: 0.25rem;
  padding: 0.125rem 0.375rem;
`;

export const SFTPStatsCard = styled.div`
  background: rgba(17,25,40,0.72);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  padding: 1.5rem;
`;

export const SFTPStatsTitle = styled.h3`
  font-size: 0.8125rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 1rem;
`;

export const SFTPStatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  &:last-child { border-bottom: none; }
`;

export const SFTPStatLabel = styled.span`
  font-size: 0.8125rem;
  color: #64748b;
`;

export const SFTPStatValue = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  color: #adc6ff;
  font-weight: 600;
`;

export const SFTPSessionsCard = styled.div`
  background: rgba(17,25,40,0.72);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  overflow: hidden;
`;

export const SFTPSessionsTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
`;

export const SFTPSessionsTitle = styled.h3`
  font-size: 0.9375rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0;
`;

export const SFTPTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const SFTPTh = styled.th`
  padding: 0.625rem 1.25rem;
  text-align: left;
  font-size: 0.75rem;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
  background: rgba(255,255,255,0.02);
`;

export const SFTPTr = styled.tr`
  border-top: 1px solid rgba(255,255,255,0.05);
  transition: background 0.12s;
  &:hover { background: rgba(255,255,255,0.025); }
`;

export const SFTPTd = styled.td`
  padding: 0.75rem 1.25rem;
  font-size: 0.8125rem;
  color: #94a3b8;
  vertical-align: middle;
`;

export const SFTPHostCell = styled(SFTPTd)`
  font-family: 'JetBrains Mono', monospace;
  color: #c8d8f0;
`;

export const SFTPStatusChip = styled.span<{ $status: 'connected' | 'idle' | 'error' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  padding: 0.1875rem 0.625rem;
  border-radius: 99px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${({ $status }) =>
    $status === 'connected' ? 'rgba(78,222,163,0.12)' :
    $status === 'idle'      ? 'rgba(75,142,255,0.12)' :
                              'rgba(255,100,100,0.12)'};
  color: ${({ $status }) =>
    $status === 'connected' ? '#4edea3' :
    $status === 'idle'      ? '#adc6ff' :
                              '#ff6464'};
`;

export const SFTPActionBtn = styled.button`
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-family: 'Material Symbols Outlined';
  font-size: 1.125rem;
  display: flex;
  align-items: center;
  transition: color 0.15s;
  &:hover { color: #4edea3; }
`;

/* ── Webhook Config ──────────────────────────────────────────── */
export const WebhookGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 1.25rem;
  @media (max-width: 1100px) { grid-template-columns: 1fr; }
`;

export const WebhookEndpointCard = styled.div`
  grid-column: 1;
  background: rgba(17,25,40,0.72);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  padding: 1.75rem;
  position: relative;
  overflow: hidden;
`;

export const WebhookEndpointDecor = styled.span`
  position: absolute;
  top: -1rem; right: -1rem;
  font-family: 'Material Symbols Outlined';
  font-size: 9rem;
  color: rgba(255,255,255,0.03);
  pointer-events: none;
  user-select: none;
  line-height: 1;
`;

export const WebhookEndpointTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 1.25rem;
`;

export const WebhookUrlDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 0.5rem;
  padding: 0.625rem 0.75rem;
  margin-bottom: 1.25rem;
`;

export const WebhookUrlText = styled.code`
  flex: 1;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  color: #4edea3;
  word-break: break-all;
`;

export const WebhookCopyBtn = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: 'Material Symbols Outlined';
  font-size: 1.125rem;
  color: #64748b;
  flex-shrink: 0;
  transition: color 0.15s;
  &:hover { color: #adc6ff; }
`;

export const WebhookSecretRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 0.625rem;
  margin-bottom: 1.25rem;
`;

export const WebhookSecretField = styled.div`
  flex: 1;
`;

export const WebhookRotateBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5625rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.10);
  color: #94a3b8;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
  &:hover { background: rgba(75,142,255,0.14); border-color: #4b8eff; color: #adc6ff; }
`;

export const WebhookEventsCard = styled.div`
  grid-column: 2;
  grid-row: 1;
  background: rgba(17,25,40,0.72);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  padding: 1.75rem;
`;

export const WebhookEventsTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 1rem;
`;

export const WebhookEventRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  &:last-child { border-bottom: none; }
`;

export const WebhookEventMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

export const WebhookEventName = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: #c8d8f0;
  font-family: 'JetBrains Mono', monospace;
`;

export const WebhookEventDesc = styled.span`
  font-size: 0.75rem;
  color: #64748b;
`;

export const WebhookDeliveryCard = styled.div`
  grid-column: 2;
  grid-row: 2;
  background: rgba(17,25,40,0.72);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  padding: 1.75rem;
`;

export const WebhookDeliveryTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 1rem;
`;

export const WebhookLogsSection = styled.div`
  grid-column: 1 / -1;
  background: rgba(17,25,40,0.72);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  overflow: hidden;
`;

export const WebhookLogsTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
`;

export const WebhookLogsTitle = styled.h3`
  font-size: 0.9375rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0;
`;

export const WebhookTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const WebhookTh = styled.th`
  padding: 0.625rem 1.25rem;
  text-align: left;
  font-size: 0.75rem;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
  background: rgba(255,255,255,0.02);
`;

export const WebhookTr = styled.tr`
  border-top: 1px solid rgba(255,255,255,0.05);
  transition: background 0.12s;
  &:hover { background: rgba(255,255,255,0.025); }
`;

export const WebhookTd = styled.td`
  padding: 0.75rem 1.25rem;
  font-size: 0.8125rem;
  color: #94a3b8;
  vertical-align: middle;
`;

export const WebhookEventChip = styled.span`
  display: inline-flex;
  padding: 0.1875rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.6875rem;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  background: rgba(75,142,255,0.10);
  color: #adc6ff;
`;

export const WebhookStatusChip = styled.span<{ $status: 'delivered' | 'pending' | 'failed' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  padding: 0.1875rem 0.625rem;
  border-radius: 99px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${({ $status }) =>
    $status === 'delivered' ? 'rgba(78,222,163,0.12)' :
    $status === 'pending'   ? 'rgba(251,188,5,0.12)'  :
                              'rgba(255,100,100,0.12)'};
  color: ${({ $status }) =>
    $status === 'delivered' ? '#4edea3' :
    $status === 'pending'   ? '#fbbc05' :
                              '#ff6464'};
`;

export const WebhookReplayBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: #64748b;
  transition: background 0.15s, color 0.15s;
  &:hover { background: rgba(75,142,255,0.12); border-color: #4b8eff; color: #adc6ff; }
`;
