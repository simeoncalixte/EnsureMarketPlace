import styled from 'styled-components';

export const Page = styled.div`
  background: var(--surface, #071026);
  color: var(--on-surface, #e6eef8);
  font-family: var(--font-body, Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial);
  ::selection {
    background: var(--primary-container, rgba(75,142,255,0.12));
    color: var(--on-primary-container, #fff);
  }
`;

export const Header = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
  height: 4rem;
  background: rgba(11,19,38,0.6);
  backdrop-filter: blur(8px);
  z-index: 50;
  box-shadow: 0 40px 64px rgba(173,198,255,0.08);
`;

export const Sidebar = styled.aside`
  position: fixed;
  left: 0;
  top: 0;
  height: 100%;
  width: 16rem;
  background: #0b1326;
  border-right: 1px solid rgba(65,71,85,0.15);
  display: flex;
  flex-direction: column;
  padding-top: 5rem;
  padding-bottom: 1rem;
  z-index: 40;
`;

export const Main = styled.main`
  width: 100%;
  padding: 0;
  min-height: auto;
  background: var(--surface, #071026);
`;

export const Footer = styled.footer`
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  height: 2rem;
  background: #131b2e;
  border-top: 1px solid rgba(65,71,85,0.15);
  font-family: monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

export const SidebarNav = styled.nav`
  flex: 1;
  padding: 0 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const Brand = styled.span`
  font-size: 1.125rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #e6eef8;
`;

export const AvatarWrap = styled.div`
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  background: var(--surface-variant, #1f2a3a);
  overflow: hidden;
`;

export const StatsSection = styled.section`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-bottom: 3rem;
  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

export const FiltersAside = styled.aside`
  width: 100%;
  max-width: 18rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

export const DealGrid = styled.div`
  flex: 1;
`;

export const StatCard = styled.div`
  background: var(--surface-container-low, #0f1724);
  padding: 1.5rem;
  border-left: 4px solid transparent;
`;

export const HeaderLink = styled.a`
  font-family: var(--font-headline, inherit);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #4b8eff;
  border-bottom: 2px solid #4b8eff;
  padding-bottom: 0.25rem;
`;

export const HeaderSubLink = styled.a`
  font-family: var(--font-headline, inherit);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #94a3b8;
  transition: color 160ms;
  &:hover { color: #e6eef8; }
`;

export const SidebarLink = styled.a`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: #94a3b8;
  font-weight: 500;
  font-size: 0.875rem;
  border-radius: 0.25rem;
  transition: background-color 160ms, color 160ms, transform 200ms;
  &:hover { background: #0f1728; color: #e6eef8; }
`;

export const ActiveSidebarLink = styled(SidebarLink)`
  background: #171f33;
  color: #4b8eff;
  border-left: 2px solid #4b8eff;
`;

export const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-container, #4b8eff);
  color: var(--on-primary, #fff);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
  transition: filter 120ms, transform 80ms;
  &:hover { filter: brightness(1.1); }
  &:active { transform: scale(0.95); }
`;

export const IconButton = styled.button`
  background: var(--surface-container-high, #0b1220);
  border: 1px solid rgba(148,163,184,0.15);
  color: var(--on-surface, #e6eef8);
  padding: 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  &:hover { background: #0f1728; }
`;

export const DealCard = styled.div`
  background: var(--surface-container-low, #0f1724);
  transition: background 300ms;
  position: relative;
  overflow: hidden;
  border-radius: 0.375rem;
  &:hover { background: var(--surface-container, #0f1b2a); }
`;

export const FooterLink = styled.a`
  color: #94a3b8;
  transition: color 160ms;
  &:hover { color: #e6eef8; }
`;

export const HeaderInner = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
`;

export const BrandTitle = styled.span`
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #e6eef8;
`;

export const HeaderNav = styled.nav`
  display: none;
  gap: 1.5rem;
  align-items: center;
  @media (min-width: 768px) { display: flex; }
`;

export const HeaderActions = styled.div`
  display: flex;
  gap: 1rem;
`;

export const IconCircleBtn = styled.button`
  font-family: 'Material Symbols Outlined', sans-serif;
  color: var(--on-surface-variant, #94a3b8);
  background: transparent;
  padding: 0.5rem;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  transition: background 160ms;
  &:hover { background: #222a3d; }
`;

export const SidebarHeader = styled.div`
  padding: 0 1.5rem;
  margin-bottom: 2rem;
`;

export const SidebarH2 = styled.h2`
  font-size: 1.125rem;
  font-weight: 700;
  color: #adc6ff;
`;

export const SidebarP = styled.p`
  font-size: 0.75rem;
  color: var(--on-surface-variant, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-family: monospace;
`;

export const SidebarFooterWrap = styled.div`
  padding: 0 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: auto;
`;

export const StatTitle = styled.p`
  font-size: 0.75rem;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--on-surface-variant, #94a3b8);
  margin-bottom: 0.5rem;
`;

export const StatValue = styled.h3`
  font-size: 1.875rem;
  font-weight: 800;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  color: var(--on-surface, #e6eef8);
`;

export const StatCurrencyPrimary = styled.span`
  font-family: monospace;
  color: var(--primary, #4b8eff);
`;

export const StatCurrencySecondary = styled.span`
  font-family: monospace;
  color: var(--secondary, #7dd3fc);
`;

export const StatSuffixDim = styled.span`
  font-size: 1.25rem;
  color: rgba(75,142,255,0.6);
`;

export const StatNotePrimary = styled.div`
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--secondary, #7dd3fc);
  font-size: 0.75rem;
  font-family: monospace;
`;

export const StatNoteVariant = styled.div`
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--on-surface-variant, #94a3b8);
  font-size: 0.75rem;
  font-family: monospace;
`;

export const StatNoteTertiary = styled.div`
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--tertiary, #f1a9a9);
  font-size: 0.75rem;
  font-family: monospace;
`;

export const FlexRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  @media (min-width: 1024px) { flex-direction: row; }
`;

export const FilterHeading = styled.h4`
  color: var(--on-surface, #e6eef8);
  font-family: var(--font-headline, inherit);
  font-weight: 700;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const SpaceY = styled.div`
  display: block;
  gap: 1rem;
`;

export const LabelSmall = styled.label`
  display: block;
  font-size: 0.75rem;
  font-family: monospace;
  color: var(--on-surface-variant, #94a3b8);
  text-transform: uppercase;
  margin-bottom: 0.5rem;
`;

export const CheckboxRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
`;

export const StyledCheckbox = styled.input.attrs({ type: 'checkbox' as any })`
  width: 1rem;
  height: 1rem;
  background: var(--surface-container, #0b1220);
  border: 1px solid rgba(148,163,184,0.12);
  border-radius: 0.25rem;
`;

export const CheckboxText = styled.span`
  font-size: 0.875rem;
  color: var(--on-surface, #e6eef8);
`;

export const RangeInput = styled.input.attrs({ type: 'range' as any })`
  width: 100%;
  height: 0.25rem;
  background: var(--surface-container-high, #12202b);
  border-radius: 0.5rem;
  appearance: none;
`;

export const RangeLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.625rem;
  font-family: monospace;
  margin-top: 0.5rem;
  color: var(--on-surface-variant, #94a3b8);
`;

export const TextInput = styled.input`
  background: var(--surface-container-lowest, #071023);
  border: none;
  color: var(--on-surface, #e6eef8);
  font-size: 0.875rem;
  font-family: monospace;
  padding: 0.5rem;
  border-radius: 0.25rem;
  &:focus { outline: 2px solid rgba(75,142,255,0.12); }
`;

export const SignalCard = styled.div`
  padding: 1rem;
  background: rgba(75,142,255,0.06);
  border: 1px solid rgba(75,142,255,0.12);
  border-radius: 0.5rem;
`;

export const SignalTitle = styled.p`
  font-size: 0.75rem;
  color: var(--primary, #4b8eff);
  font-weight: 700;
  margin-bottom: 0.5rem;
`;

export const SignalText = styled.p`
  font-size: 0.75rem;
  color: var(--on-surface-variant, #94a3b8);
  line-height: 1.25rem;
`;

export const SectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

export const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-family: var(--font-headline, inherit);
  font-weight: 800;
`;

export const SortControls = styled.div`
  display: flex;
  gap: 0.5rem;
`;

export const SortButton = styled.button`
  background: var(--surface-container-high, #0b1724);
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  font-family: monospace;
  text-transform: uppercase;
  color: var(--on-surface, #e6eef8);
  border: none;
  border-radius: 0.25rem;
  transition: background 160ms, color 160ms, box-shadow 160ms;
  &:hover { background: #0f2435; }
  &.active {
    background: #171f33;
    color: #adc6ff;
    box-shadow: inset 0 0 0 1px rgba(75,142,255,0.2);
  }
`;

export const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  @media (min-width: 1280px) { grid-template-columns: repeat(2, 1fr); }
`;

export const AccentBarPrimary = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--primary, #4b8eff);
  transition: width 200ms;
`;

export const AccentBarTertiary = styled(AccentBarPrimary)`
  background: var(--tertiary, #f1a9a9);
`;

export const CardBody = styled.div`
  padding: 1.5rem;
`;

export const CardTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
`;

export const BadgeSpan = styled.span`
  background: var(--secondary-container, #0b2a38);
  padding: 0.125rem 0.5rem;
  font-size: 0.625rem;
  font-family: monospace;
  color: var(--on-secondary-container, #e6eef8);
  border-radius: 0.25rem;
  text-transform: uppercase;
`;

export const CardId = styled.span`
  font-size: 0.75rem;
  font-family: monospace;
  color: var(--on-surface-variant, #94a3b8);
`;

export const CardTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--on-surface, #e6eef8);
`;

export const CardSub = styled.p`
  font-size: 0.875rem;
  color: var(--on-surface-variant, #94a3b8);
`;

export const CardRight = styled.div`
  text-align: right;
`;

export const ExpReturn = styled.div`
  font-size: 1.5rem;
  font-family: monospace;
  font-weight: 700;
`;

export const ExpReturnLabel = styled.div`
  font-size: 0.625rem;
  font-family: monospace;
  text-transform: uppercase;
  color: var(--on-surface-variant, #94a3b8);
`;

export const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

export const StatLabel = styled.p`
  font-size: 0.625rem;
  font-family: monospace;
  text-transform: uppercase;
  color: var(--on-surface-variant, #94a3b8);
`;

export const StatValueLarge = styled.p`
  font-size: 1.125rem;
  font-weight: 800;
`;

export const ProgressWrap = styled.div`
  display: block;
  gap: 0.5rem;
`;

export const ProgressMeta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  font-family: monospace;
`;

export const ProgressTrack = styled.div`
  width: 100%;
  height: 4px;
  background: var(--surface-container-highest, #081018);
  overflow: hidden;
  border-radius: 9999px;
`;

export const ProgressFillPrimary = styled.div`
  height: 100%;
  background: var(--primary, #4b8eff);
`;

export const ProgressFillTertiary = styled.div`
  height: 100%;
  background: var(--tertiary, #f1a9a9);
`;

export const CardActions = styled.div`
  margin-top: 1.5rem;
  display: flex;
  gap: 0.75rem;
`;

export const FooterStatus = styled.div`
  display: flex;
  gap: 1.5rem;
  align-items: center;
`;

export const PulseRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #34d399;
  animation: pulse 2s infinite;
`;

export const PulseDot = styled.span`
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  background: #34d399;
`;

export const FooterStat = styled.div`
  color: #94a3b8;
`;

export const AggregatedCardsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export const AggregatedDealCard = styled(DealCard)`
  border: 1px solid rgba(65,71,85,0.18);
  border-radius: 0.125rem;
  background: #171f33;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);
  &:hover {
    background: #19233a;
  }
`;

export const AggregatedAccentBar = styled.div<{ $tone: 'primary' | 'secondary' | 'tertiary' }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 100%;
  background: ${({ $tone }) => ($tone === 'secondary' ? '#4edea3' : $tone === 'tertiary' ? '#ff5451' : '#4b8eff')};
`;

export const AggregatedCardInner = styled.div`
  padding: 2rem;
  @media (max-width: 767px) {
    padding: 1.25rem;
  }
`;

export const AggregatedDealHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 1.75rem;
  @media (max-width: 767px) {
    flex-direction: column;
    margin-bottom: 1.25rem;
  }
`;

export const AggregatedDealMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`;

export const AggregatedBadgeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

export const AggregatedDealBadge = styled.span<{ $tone: 'primary' | 'secondary' | 'tertiary' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem 0.75rem;
  border-radius: 0.1875rem;
  border: 1px solid ${({ $tone }) => ($tone === 'secondary' ? 'rgba(78,222,163,0.2)' : $tone === 'tertiary' ? 'rgba(255,84,81,0.2)' : 'rgba(75,142,255,0.2)')};
  background: ${({ $tone }) => ($tone === 'secondary' ? 'rgba(78,222,163,0.08)' : $tone === 'tertiary' ? 'rgba(255,84,81,0.08)' : 'rgba(75,142,255,0.08)')};
  color: ${({ $tone }) => ($tone === 'secondary' ? '#6ffbbe' : $tone === 'tertiary' ? '#ffb3ad' : '#adc6ff')};
  font-size: 0.75rem;
  font-family: monospace;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
`;

export const AggregatedDealReference = styled.span`
  color: #c1c6d7;
  font-size: 0.9rem;
  font-family: monospace;
  letter-spacing: 0.03em;
`;

export const AggregatedDealTitle = styled.h3`
  margin: 0;
  color: #dae2fd;
  font-family: Manrope, var(--font-headline, sans-serif);
  font-size: clamp(1.9rem, 3vw, 2.45rem);
  line-height: 1.02;
  font-weight: 800;
  letter-spacing: -0.04em;
`;

export const AggregatedDealDescription = styled.p`
  margin: 0;
  max-width: 40rem;
  color: #c1c6d7;
  font-size: 1rem;
  line-height: 1.45;
`;

export const AggregatedSummary = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 2.25rem;
  text-align: right;
  @media (max-width: 767px) {
    width: 100%;
    justify-content: space-between;
    gap: 1rem;
  }
`;

export const AggregatedSummaryMetric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 6.25rem;
`;

export const AggregatedSummaryLabel = styled.p`
  margin: 0;
  color: #c1c6d7;
  font-size: 0.75rem;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.16em;
`;

export const AggregatedSummaryValue = styled.p`
  margin: 0;
  color: #dae2fd;
  font-family: Manrope, var(--font-headline, sans-serif);
  font-size: clamp(1.9rem, 2.5vw, 2.6rem);
  font-weight: 800;
  letter-spacing: -0.05em;
  line-height: 0.95;
`;

export const AggregatedTrancheTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

export const AggregatedTrancheHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 3.3fr) 1fr 1fr 1fr 1.1fr;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.5rem;
  background: rgba(6,14,32,0.55);
  color: #c1c6d7;
  border-bottom: 1px solid rgba(65,71,85,0.14);
  font-size: 0.75rem;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  @media (max-width: 900px) {
    display: none;
  }
`;

export const AggregatedTrancheRow = styled.div<{ $selected?: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 3.3fr) 1fr 1fr 1fr 1.1fr;
  gap: 1rem;
  align-items: center;
  padding: 1.5rem;
  border-left: ${({ $selected }) => ($selected ? '2px solid #4b8eff' : '2px solid transparent')};
  background: ${({ $selected }) => ($selected ? 'rgba(75,142,255,0.1)' : 'transparent')};
  transition: background 160ms ease;
  &:hover {
    background: ${({ $selected }) => ($selected ? 'rgba(75,142,255,0.12)' : 'rgba(75,142,255,0.05)')};
  }
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 0.875rem;
    padding: 1rem;
  }
`;

export const AggregatedTrancheMain = styled.div`
  min-width: 0;
`;

export const AggregatedTrancheTitle = styled.p`
  margin: 0;
  color: #dae2fd;
  font-size: 1rem;
  font-weight: 800;
`;

export const AggregatedTrancheCaption = styled.p`
  margin: 0.35rem 0 0;
  color: #c1c6d7;
  font-size: 0.8rem;
  font-family: monospace;
  letter-spacing: 0.08em;
`;

export const AggregatedMetricCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  @media (max-width: 900px) {
    align-items: flex-start;
  }
`;

export const AggregatedMetricLabel = styled.span`
  display: none;
  color: #8b90a0;
  font-size: 0.68rem;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  @media (max-width: 900px) {
    display: inline;
  }
`;

export const AggregatedRiskScore = styled.span<{ $tone: 'primary' | 'secondary' | 'tertiary' }>`
  color: ${({ $tone }) => ($tone === 'secondary' ? '#4edea3' : $tone === 'tertiary' ? '#ffb3ad' : '#adc6ff')};
  font-family: Manrope, var(--font-headline, sans-serif);
  font-size: 1rem;
  font-weight: 800;
`;

export const AggregatedYieldValue = styled.span<{ $tone: 'primary' | 'secondary' | 'tertiary' }>`
  color: ${({ $tone }) => ($tone === 'secondary' ? '#6ffbbe' : $tone === 'tertiary' ? '#ffb3ad' : '#adc6ff')};
  font-family: Manrope, var(--font-headline, sans-serif);
  font-size: 1rem;
  font-weight: 800;
`;

export const AggregatedFundedCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  @media (max-width: 900px) {
    align-items: flex-start;
  }
`;

export const AggregatedFundedBar = styled.div`
  width: 100%;
  max-width: 5.875rem;
  height: 0.375rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(65,71,85,0.45);
`;

export const AggregatedFundedFill = styled.div<{ $tone: 'primary' | 'secondary' | 'tertiary'; $width: number }>`
  height: 100%;
  width: ${({ $width }) => `${$width}%`};
  background: ${({ $tone }) => ($tone === 'secondary' ? '#4edea3' : $tone === 'tertiary' ? '#ffb3ad' : '#adc6ff')};
`;

export const AggregatedFundedValue = styled.span`
  color: #c1c6d7;
  font-size: 0.9rem;
  font-family: monospace;
  font-weight: 600;
`;

export const AggregatedActionCell = styled.div`
  display: flex;
  justify-content: flex-end;
  @media (max-width: 900px) {
    justify-content: flex-start;
  }
`;

export const AggregatedAllocateButton = styled.button<{ $primary?: boolean }>`
  min-width: 7.5rem;
  padding: 0.95rem 1.15rem;
  border: none;
  border-radius: 0.1875rem;
  background: ${({ $primary }) => ($primary ? '#adc6ff' : '#283044')};
  color: ${({ $primary }) => ($primary ? '#002e69' : '#dae2fd')};
  font-size: 0.92rem;
  font-weight: 800;
  text-transform: uppercase;
  cursor: pointer;
  transition: filter 160ms ease, transform 120ms ease;
  &:hover {
    filter: brightness(1.06);
  }
  &:active {
    transform: translateY(1px);
  }
`;

export const AggregatedFooter = styled.div`
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(65,71,85,0.14);
  display: flex;
  justify-content: flex-end;
  gap: 1.25rem;
  flex-wrap: wrap;
`;

export const AggregatedFooterAction = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0;
  border: none;
  background: transparent;
  color: #c1c6d7;
  font-size: 0.92rem;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: color 160ms ease;
  &:hover {
    color: #adc6ff;
  }
`;

