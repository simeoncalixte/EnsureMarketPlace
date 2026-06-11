import styled, { keyframes } from 'styled-components';
import { colors, withAlpha } from '../../xds/colors';

export const Page = styled.div`
  background: var(--surface, ${colors.background});
  color: var(--on-surface, ${colors.onSurface});
  font-family: var(--font-body, Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial);
  ::selection {
    background: var(--primary-container, ${withAlpha(colors.primary, 0.12)});
    color: var(--on-primary-container, ${colors.white});
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
  background: ${withAlpha(colors.surfaceDeep, 0.6)};
  backdrop-filter: blur(8px);
  z-index: 50;
  box-shadow: 0 40px 64px ${withAlpha(colors.primarySoft, 0.08)};
`;

export const Sidebar = styled.aside`
  position: fixed;
  left: 0;
  top: 0;
  height: 100%;
  width: 16rem;
  background: ${colors.surfaceDeep};
  border-right: 1px solid ${withAlpha(colors.border, 0.15)};
  display: flex;
  flex-direction: column;
  padding-top: 5rem;
  padding-bottom: 1rem;
  z-index: 40;
`;

export const Main = styled.main`
  width: 100%;
  /* Fill the shell content area and reserve room for the fixed bottom ticker (2rem). */
  min-height: calc(100vh - 8rem);
  padding: 0 0 2.5rem;
  background: var(--surface, ${colors.background});
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
  background: ${colors.surfacePanel};
  border-top: 1px solid ${withAlpha(colors.border, 0.15)};
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
  color: ${colors.onSurface};
`;

export const AvatarWrap = styled.div`
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  background: var(--surface-variant, ${colors.surfaceRaised});
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

/** Surface wrapper for a single stat. Left accent bar tone is theme-driven. */
export const StatCardSurface = styled.div<{ $tone: 'primary' | 'secondary' | 'tertiary' }>`
  background: var(--surface-container-low, ${colors.surfaceLow});
  padding: 1.5rem;
  border-left: 4px solid
    ${({ $tone }) =>
      $tone === 'secondary'
        ? `var(--secondary, ${colors.dataViz.blueSky})`
        : $tone === 'tertiary'
        ? `var(--tertiary, ${colors.errorSoft})`
        : `var(--primary, ${colors.primary})`};
`;

/** Inline icon + label row used inside StatCard notes. */
export const StatNoteRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
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

/** Main content column to the right of the filter rail: map panel above deals. */
export const DealColumn = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

/** Generic page-local surface wrapper for opportunity / state cards. */
export const DealCardSurface = styled.div`
  background: var(--surface-container-low, ${colors.surfaceLow});
  transition: background 300ms;
  position: relative;
  overflow: hidden;
  border-radius: 0.375rem;
  &:hover { background: var(--surface-container, ${colors.surfaceLow}); }
`;

/** Heading used in the map and deal section headers. */
export const MapSectionWrap = styled.div`
  margin: 20px 0;
`;

export const FooterLink = styled.a`
  color: ${colors.neutral[400]};
  transition: color 160ms;
  &:hover { color: ${colors.onSurface}; }
`;

export const FlexRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  @media (min-width: 1024px) { flex-direction: row; }
`;

export const FilterHeading = styled.h4`
  color: var(--on-surface, ${colors.onSurface});
  font-family: var(--font-headline, inherit);
  font-weight: 700;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

/** Vertical stack for the filter accordions. */
export const FilterStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

/** Inner column inside an expanded filter accordion. */
export const FilterFieldStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

/** Two-column grid for the min/max yield inputs. */
export const FilterTwoColGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
`;

/** Scrollable bordered container for a checkbox filter list. */
export const CheckboxFilterScroll = styled.div`
  max-height: 260px;
  overflow-y: auto;
  padding-right: 6px;
  border: 1px solid ${withAlpha(colors.neutral[400], 0.14)};
  border-radius: 8px;
  background: ${withAlpha(colors.surfaceDeep, 0.45)};
`;

/** Column of checkbox rows. */
export const CheckboxFilterItems = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
`;

/** Empty / loading / error message inside a checkbox filter list. */
export const CheckboxFilterMessage = styled.span`
  font-size: 0.875rem;
  color: var(--on-surface, ${colors.onSurface});
  padding: 0.75rem;
`;

/** Sticky footer bar with the selected count + select-all / clear actions. */
export const CheckboxFilterFooter = styled.div`
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.75rem;
  border-top: 1px solid ${withAlpha(colors.neutral[400], 0.14)};
  background: ${withAlpha(colors.background, 0.95)};
  font-size: 0.8rem;
`;

export const CheckboxFilterCount = styled.span`
  color: var(--on-surface-variant, ${colors.neutral[400]});
`;

export const CheckboxFilterActions = styled.div`
  display: flex;
  gap: 10px;
`;

export const RangeLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.625rem;
  font-family: monospace;
  margin-top: 0.5rem;
  color: var(--on-surface-variant, ${colors.neutral[400]});
`;

export const SignalCard = styled.div`
  padding: 1rem;
  background: ${withAlpha(colors.primary, 0.06)};
  border: 1px solid ${withAlpha(colors.primary, 0.12)};
  border-radius: 0.5rem;
`;

export const SignalTitle = styled.p`
  font-size: 0.75rem;
  color: var(--primary, ${colors.primary});
  font-weight: 700;
  margin-bottom: 0.5rem;
`;

export const SignalText = styled.p`
  font-size: 0.75rem;
  color: var(--on-surface-variant, ${colors.neutral[400]});
  line-height: 1.25rem;
`;

export const SectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 0.5rem;
`;

export const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-family: var(--font-headline, inherit);
  font-weight: 800;
`;

/** Data-freshness stamp shown next to the page title. */
export const UpdatedStamp = styled.span`
  font-size: 0.75rem;
  font-family: monospace;
  color: var(--on-surface-variant, ${colors.neutral[400]});
  white-space: nowrap;
`;

/** All view controls (sort, view mode, map toggle) on the right of the header. */
export const HeadControls = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-left: auto;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

/** Indented block under a map-layer checkbox: its status note + facet options. */
export const FilterIndent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-left: 1.75rem;
  margin-top: 0.25rem;
`;

/** Muted helper line in the filter rail (layer status, slider value). */
export const LayerNote = styled.span`
  display: block;
  font-size: 0.7rem;
  font-family: monospace;
  color: var(--on-surface-variant, ${colors.neutral[400]});
  margin-top: 0.25rem;
`;

export const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  @media (min-width: 1280px) { grid-template-columns: repeat(2, 1fr); }
`;

export const TableScroll = styled.div`
  width: 100%;
  overflow-x: auto;
`;

export const AccentBarPrimary = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--primary, ${colors.primary});
  transition: width 200ms;
`;

export const AccentBarTertiary = styled(AccentBarPrimary)`
  background: var(--tertiary, ${colors.errorSoft});
`;

export const CardBody = styled.div`
  padding: 1.5rem;
`;

export const CardTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--on-surface, ${colors.onSurface});
`;

export const CardSub = styled.p`
  font-size: 0.875rem;
  color: var(--on-surface-variant, ${colors.neutral[400]});
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
  color: ${colors.dataViz.mint};
  animation: pulse 2s infinite;
`;

export const PulseDot = styled.span`
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  background: ${colors.dataViz.mint};
`;

// Live risk-event ticker (footer) — a seamless horizontal marquee. The track holds the event
// list duplicated back-to-back and translates by -50%, so the loop point is invisible.
const tickerScroll = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;

export const TickerViewport = styled.div`
  flex: 1;
  min-width: 0;
  max-width: 46vw;
  overflow: hidden;
  position: relative;
  mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent);
`;

export const TickerTrack = styled.div`
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  gap: 1.75rem;
  animation: ${tickerScroll} 120s linear infinite;
  will-change: transform;

  ${TickerViewport}:hover & {
    animation-play-state: paused;
  }
`;

export const TickerItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: ${colors.neutral[300]};
`;

export const TickerDot = styled.span<{ $color: string }>`
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  background: ${(p) => p.$color};
  flex-shrink: 0;
`;

export const FooterStat = styled.div`
  color: ${colors.neutral[400]};
`;

export const FooterStrong = styled.span`
  color: ${colors.neutral[300]};
  font-weight: 700;
`;

export const FooterLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

export const AggregatedCardsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export const AggregatedDealCard = styled(DealCardSurface)<{ $highlighted?: boolean }>`
  border: 1px solid
    ${({ $highlighted }) =>
      $highlighted ? withAlpha(colors.primary, 0.65) : withAlpha(colors.border, 0.18)};
  border-radius: 0.125rem;
  background: ${colors.surfaceRaised};
  box-shadow: ${({ $highlighted }) =>
    $highlighted
      ? `0 0 0 1px ${withAlpha(colors.primary, 0.35)}, inset 0 1px 0 ${withAlpha(colors.white, 0.02)}`
      : `inset 0 1px 0 ${withAlpha(colors.white, 0.02)}`};
  transition: border-color 240ms ease, box-shadow 240ms ease;
  &:hover {
    background: ${colors.surfaceRaised};
  }
`;

export const AggregatedAccentBar = styled.div<{ $tone: 'primary' | 'secondary' | 'tertiary' }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 100%;
  background: ${({ $tone }) => ($tone === 'secondary' ? colors.accent : $tone === 'tertiary' ? colors.dangerBright : colors.primary)};
`;

export const AggregatedCardInner = styled.div`
  padding: 1.5rem;
  @media (max-width: 767px) {
    padding: 1rem;
  }
`;

export const AggregatedDealHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 1.25rem;
  @media (max-width: 767px) {
    flex-direction: column;
    margin-bottom: 1rem;
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

export const AggregatedDealReference = styled.span`
  color: ${colors.onSurfaceMuted};
  font-size: 0.75rem;
  font-family: monospace;
  letter-spacing: 0.03em;
`;

/* Card heading sits one step below the page title (SectionTitle, 1.5rem). */
export const AggregatedDealTitle = styled.h3`
  margin: 0;
  color: ${colors.onSurfaceStrong};
  font-family: Manrope, var(--font-headline, sans-serif);
  font-size: 1.25rem;
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: -0.02em;
`;

export const AggregatedDealDescription = styled.p`
  margin: 0;
  max-width: 40rem;
  color: ${colors.onSurfaceMuted};
  font-size: 0.875rem;
  line-height: 1.45;
`;

export const AggregatedSummary = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
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
  color: ${colors.onSurfaceMuted};
  font-size: 0.65rem;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.14em;
`;

/* Card-level metric: prominent within the card, but below the page stat cards. */
export const AggregatedSummaryValue = styled.p`
  margin: 0;
  color: ${colors.onSurfaceStrong};
  font-family: Manrope, var(--font-headline, sans-serif);
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
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
  padding: 0.75rem 1.25rem;
  background: ${withAlpha(colors.background, 0.55)};
  color: ${colors.onSurfaceMuted};
  border-bottom: 1px solid ${withAlpha(colors.border, 0.14)};
  font-size: 0.65rem;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  @media (max-width: 900px) {
    display: none;
  }
`;

export const AggregatedTrancheHeaderCenter = styled.div`
  text-align: center;
`;

export const AggregatedTrancheHeaderRight = styled.div`
  text-align: right;
`;

export const AggregatedTrancheRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 3.3fr) 1fr 1fr 1fr 1.1fr;
  gap: 1rem;
  align-items: center;
  padding: 0.875rem 1.25rem;
  border-left: 2px solid transparent;
  transition: background 160ms ease;
  &:hover {
    background: ${withAlpha(colors.primary, 0.05)};
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
  color: ${colors.onSurfaceStrong};
  font-size: 0.875rem;
  font-weight: 700;
`;

export const AggregatedTrancheCaption = styled.p`
  margin: 0.25rem 0 0;
  color: ${colors.onSurfaceMuted};
  font-size: 0.7rem;
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
  color: ${colors.outline};
  font-size: 0.68rem;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  @media (max-width: 900px) {
    display: inline;
  }
`;

export const AggregatedRiskScore = styled.span<{ $tone: 'primary' | 'secondary' | 'tertiary' }>`
  color: ${({ $tone }) => ($tone === 'secondary' ? colors.accent : $tone === 'tertiary' ? colors.errorSoft : colors.primarySoft)};
  font-family: Manrope, var(--font-headline, sans-serif);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.06em;
`;

export const AggregatedYieldValue = styled.span<{ $tone: 'primary' | 'secondary' | 'tertiary' }>`
  color: ${({ $tone }) => ($tone === 'secondary' ? colors.dataViz.mint : $tone === 'tertiary' ? colors.errorSoft : colors.primarySoft)};
  font-family: Manrope, var(--font-headline, sans-serif);
  font-size: 0.875rem;
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

/** Constrains the xds ProgressBar width inside the funded cell. */
export const AggregatedFundedBarWrap = styled.div`
  width: 100%;
  max-width: 5.875rem;
`;

export const AggregatedFundedValue = styled.span`
  color: ${colors.onSurfaceMuted};
  font-size: 0.75rem;
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

export const AggregatedAllocateButton = styled.button`
  min-width: 6.25rem;
  padding: 0.55rem 1rem;
  border: none;
  border-radius: 0.1875rem;
  background: ${colors.surfaceElevated};
  color: ${colors.onSurfaceStrong};
  font-size: 0.75rem;
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
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${withAlpha(colors.border, 0.14)};
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
  color: ${colors.onSurfaceMuted};
  font-size: 0.75rem;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: color 160ms ease;
  &:hover {
    color: ${colors.primarySoft};
  }
`;
