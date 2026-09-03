import styled, { keyframes } from 'styled-components';
import { colors, withAlpha } from '../../xds/colors';

export const Page = styled.div`
  min-height: auto;
  background: radial-gradient(1200px 700px at 85% -10%, ${withAlpha(colors.primarySoft, 0.12)}, transparent 50%),
    radial-gradient(900px 600px at -15% 90%, ${withAlpha(colors.accent, 0.08)}, transparent 50%),
    var(--background, ${colors.surfaceDeep});
  color: var(--on-surface, ${colors.onSurfaceStrong});
  font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
`;

export const Main = styled.main`
  width: 100%;
  padding: 0;
  max-width: 80rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
`;

export const Intro = styled.section`
  h1 { margin: 0 0 0.5rem; color: ${colors.onSurfaceStrong}; font-size: 1.9rem; font-weight: 800; }
  p { margin: 0; color: var(--on-surface-variant, ${colors.onSurfaceMuted}); font-size: 0.92rem; max-width: 52rem; }
`;

export const Grid = styled.div`
  display: grid; grid-template-columns: repeat(12, minmax(0,1fr)); gap: 2rem; align-items: start;
  @media (max-width: 1200px) { grid-template-columns: 1fr; }
`;

export const LeftRail = styled.div`
  grid-column: span 8; display:flex; flex-direction:column; gap:2rem;
  @media (max-width: 1200px) { grid-column: auto; }
`;

export const RightRail = styled.div`
  grid-column: span 4; display:flex; flex-direction:column; gap:1.5rem; position: sticky; top: 5.6rem;
  @media (max-width: 1200px) { grid-column: auto; position: static; }
`;

export const Panel = styled.section`
  background: var(--surface-container-low, ${colors.surfaceRaised}); border:1px solid ${withAlpha(colors.border, 0.22)}; border-radius:0.35rem; padding:2rem;
  @media (max-width: 960px) { padding: 1rem; }
`;

export const PanelHighlight = styled(Panel)`
  position: relative; overflow: hidden; box-shadow: 0 24px 40px ${withAlpha(colors.scrim, 0.35)};
`;

export const Watermark = styled.div`
  position: absolute; top:0.3rem; right:1rem; font-size:5rem; font-weight:900; color: ${withAlpha(colors.onSurface, 0.05)}; pointer-events:none;
`;

export const PanelHead = styled.div`
  display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:1.75rem;
  h3 { margin:0; display:flex; align-items:center; gap:0.55rem; color:${colors.onSurfaceStrong}; font-size:1.3rem; }
  @media (max-width: 960px) { flex-direction: column; align-items: flex-start; }
`;

export const PanelTitle = styled.h3`
  margin:0; display:flex; align-items:center; gap:0.55rem; color:${colors.onSurfaceStrong}; font-size:1.3rem;
`;

export const MaxTag = styled.span`
  border:1px solid ${withAlpha(colors.accent, 0.2)}; color:var(--secondary,${colors.accent}); background: ${withAlpha(colors.accentStrong, 0.12)}; font-size:0.7rem; padding:0.35rem 0.6rem; border-radius:6px;
`;

export const InputWrap = styled.div`
  display:flex; align-items:flex-end; justify-content:space-between; border-bottom:2px solid var(--outline-variant,${colors.border}); margin-bottom:1.4rem;
`;

export const AmountInput = styled.input`
  width:100%; border:0; outline:none; background:transparent; color:${colors.onSurfaceStrong}; font-size:clamp(2rem,4.8vw,3.8rem); font-weight:700; padding:0.35rem 0 0.65rem;
`;

export const AmountSuffix = styled.div`
  color: var(--outline, ${colors.onSurfaceVariant}); font-size:1.1rem; padding-bottom:0.95rem;
`;

export const ProgressLabels = styled.div`
  margin-top:0.6rem; display:flex; justify-content:space-between; color:var(--outline,${colors.onSurfaceVariant}); font-size:0.67rem;
`;

export const PresetRow = styled.div`
  margin-top:1.4rem; display:flex; gap:0.7rem;
  @media (max-width: 960px) { flex-direction: column; }
`;

export const PresetButton = styled.button`
  flex:1; border:1px solid ${withAlpha(colors.border, 0.4)}; background:var(--surface-container-high,${colors.surfaceElevated}); color:${colors.onSurfaceStrong}; font-size:0.83rem; font-weight:700; padding:0.75rem 0.7rem; cursor:pointer; transition:all 0.2s ease; border-radius: 0.3rem;
  &.active { color: var(--primary-fixed-dim,${colors.primarySoft}); border-color: ${withAlpha(colors.primarySoft, 0.45)}; background: ${withAlpha(colors.primarySoft, 0.1)}; }
`;

export const TrancheGrid = styled.div`
  display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:1rem;
  @media (max-width: 960px) { grid-template-columns: 1fr; }
`;

export const TrancheStats = styled.div`
  display:flex; flex-direction:column; gap:0.6rem; font-size:0.72rem;
  div { display:flex; justify-content:space-between; flex-wrap: wrap; gap: 0.25rem; }
`;

export const ImpactGrid = styled.div`
  display:grid; grid-template-columns:1fr 1fr; gap:2rem;
  @media (max-width: 960px) { grid-template-columns: 1fr; }
`;

export const MetricStack = styled.div`
  display:flex; flex-direction:column; gap:1rem;
`;

export const MiniLabel = styled.span`
  display:block; color:var(--outline,${colors.onSurfaceVariant}); font-size:0.67rem; text-transform:uppercase; letter-spacing:0.16em; font-weight:700; margin-bottom:0.8rem;
`;

export const RegionStack = styled.div`
  display:flex; flex-direction:column; gap:0.9rem;
`;

export const RowBetween = styled.div`
  display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem; font-size:0.78rem; color: ${colors.onSurfaceStrong};
  .gain { color: var(--secondary, ${colors.accent}); }
`;

export const Summary = styled.div`
  background: var(--surface-container-high,${colors.surfaceHigh}); padding:1.5rem; border-radius:0.35rem; border:1px solid ${withAlpha(colors.primarySoft, 0.3)}; box-shadow: 0 16px 32px ${withAlpha(colors.scrim, 0.35)};
  @media (max-width: 960px) { padding: 1rem; }
  h4 { margin: 0 0 1.25rem; color: ${colors.onSurfaceStrong}; font-size: 1.1rem; }
`;

export const SummaryList = styled.div`
  border-bottom:1px solid ${withAlpha(colors.border, 0.35)}; padding-bottom:1.3rem; margin-bottom:1.25rem; display:flex; flex-direction:column; gap:1.1rem;
  div { display:flex; justify-content:space-between; gap:1rem; font-size:0.86rem; }
`;

export const TotalBlock = styled.div`
  span { color: var(--on-surface-variant,${colors.onSurfaceMuted}); font-size:0.85rem; }
  > div:first-child strong { display:block; margin-top:0.35rem; color: var(--primary-fixed-dim,${colors.primarySoft}); font-size:1.72rem; font-weight:800; }
  > p { margin: 0.9rem 0 0; color: var(--outline, ${colors.onSurfaceVariant}); font-size: 0.7rem; line-height: 1.5; }
`;

export const FundingBox = styled.div`
  margin:1.3rem 0; border:1px solid ${withAlpha(colors.border, 0.3)}; background: var(--surface-container-lowest,${colors.background}); border-radius:0.3rem; padding:1rem;
`;

export const FundingHead = styled.div`
  display:flex; align-items:center; gap:0.5rem; color:${colors.onSurfaceStrong}; font-size:0.85rem; font-weight:600; margin-bottom:0.9rem;
  .material-symbols-outlined { color: var(--secondary,${colors.accent}); }
`;

export const FundingSteps = styled.div`
  display:flex; flex-direction:column; gap:0.7rem;
  > div { display:flex; align-items:flex-start; gap:0.6rem; }
  > div > span { flex: none; width: 1.4rem; height: 1.4rem; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; background: var(--surface-container-high, ${colors.surfaceElevated}); color: ${colors.onSurfaceStrong}; font-size: 0.75rem; font-weight: 700; }
  strong { display: block; color: ${colors.onSurfaceStrong}; font-size: 0.82rem; }
  small { display: block; color: var(--outline, ${colors.onSurfaceVariant}); font-size: 0.7rem; }
`;

export const ConfirmButtonWrap = styled.div`
  button {
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    padding: 0.95rem 1rem;
    font-size: 0.95rem;
    box-shadow: 0 12px 30px ${withAlpha(colors.primary, 0.28)};
  }
`;

export const ContextCard = styled.div`
  background: var(--surface-container,${colors.surfaceRaised}); border:1px solid ${withAlpha(colors.border, 0.22)}; border-radius:0.35rem; padding:1.2rem;
  @media (max-width: 960px) { padding: 1rem; }
  h5 { margin: 0 0 0.3rem; color: ${colors.onSurfaceStrong}; font-size: 1rem; }
  > p { margin: 0.3rem 0 1rem; color: var(--outline, ${colors.onSurfaceVariant}); font-size: 0.73rem; }
`;

export const ContextImage = styled.div`
  aspect-ratio: 16/9; border-radius: 0.25rem; overflow: hidden; margin-bottom: 1rem; background: var(--surface-container-lowest);
  img { width:100%; height:100%; object-fit:cover; opacity:0.6; }
`;

/* Migrated from AllocateCapitalPage.css (.acp-context-stats) */
export const ContextStats = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem;
  div { border: 1px solid ${withAlpha(colors.border, 0.25)}; background: var(--surface-container-low); border-radius: 0.3rem; padding: 0.55rem; }
  span { display: block; font-size: 0.58rem; color: var(--outline); text-transform: uppercase; }
  strong { margin-top: 0.2rem; display: block; color: ${colors.onSurfaceStrong}; font-size: 0.85rem; }
  strong.gain { color: var(--secondary); }
`;

/* Migrated from AllocateCapitalPage.css (.acp-footer) */
export const Footer = styled.footer`
  border-top:1px solid ${withAlpha(colors.border, 0.25)}; padding:1.6rem 2rem; margin-top:1rem;
`;

export const FooterInner = styled.div`
  max-width:80rem; margin:0 auto; display:flex; align-items:center; justify-content:space-between; gap:1rem;
  @media (max-width: 960px) { flex-direction: column; align-items: flex-start; }
`;

export const FooterLinks = styled.div`
  display: flex; align-items: center; gap: 2rem;
  a { text-decoration: none; text-transform: uppercase; letter-spacing: 0.12em; color: var(--outline); font-size: 0.65rem; font-weight: 600; transition: color 0.2s ease; }
  a:hover { color: ${colors.onSurfaceStrong}; }
  @media (max-width: 960px) { gap: 1rem; flex-wrap: wrap; }
`;

export const FooterStatus = styled.div`
  display: flex; align-items: center; gap: 0.5rem; color: var(--outline); font-size: 0.68rem;
`;

const pulse = keyframes`
  0% { opacity: 0.4; }
  50% { opacity: 1; transform: scale(1.15); }
  100% { opacity: 0.4; }
`;

export const Pulse = styled.div`
  width: 0.45rem; height: 0.45rem; border-radius: 999px; background: var(--secondary);
  animation: ${pulse} 1.4s infinite;
`;
