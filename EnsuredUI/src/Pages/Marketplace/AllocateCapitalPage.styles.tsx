import styled from 'styled-components';

export const Page = styled.div`
  min-height: auto;
  background: radial-gradient(1200px 700px at 85% -10%, rgba(173, 198, 255, 0.12), transparent 50%),
    radial-gradient(900px 600px at -15% 90%, rgba(78, 222, 163, 0.08), transparent 50%),
    var(--background, #0b1326);
  color: var(--on-surface, #dae2fd);
  font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
`;

export const Topbar = styled.header`
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 50;
  background: rgba(11, 19, 38, 0.6);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(65, 71, 85, 0.22);
  box-shadow: 0 40px 40px -15px rgba(173, 198, 255, 0.08);
`;

export const TopbarInner = styled.div`
  height: 64px;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`;

export const TopbarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
`;

export const Brand = styled.span`
  font-family: Manrope, Inter, sans-serif;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--primary-fixed-dim, #adc6ff);
`;

export const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  a { color: var(--on-surface-variant, #c1c6d7); text-decoration: none; font-weight: 700; }
  a.active { color: var(--primary-fixed-dim, #adc6ff); border-bottom: 2px solid var(--primary-container, #4b8eff); padding-bottom: 0.25rem; }
`;

export const TopbarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  button { border: 0; background: transparent; color: var(--on-surface-variant, #c1c6d7); width: 2.1rem; height: 2.1rem; border-radius: 0.35rem; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
`;

export const Avatar = styled.div`
  width: 2rem; height: 2rem; border-radius: 999px; overflow: hidden; border: 1px solid rgba(65,71,85,0.4);
  img { width: 100%; height: 100%; object-fit: cover; }
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

export const Breadcrumbs = styled.div`
  display: flex; align-items: center; flex-wrap: wrap; gap: 0.45rem; margin-bottom: 1rem; color: var(--outline, #98a6bf); text-transform: uppercase; letter-spacing: 0.14em; font-size: 0.66rem;
  .material-symbols-outlined { font-size: 0.85rem; }
  .is-current { color: var(--primary-fixed-dim, #adc6ff); }
`;

export const Stepper = styled.div`
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem;
`;

export const Step = styled.div<{ active?: boolean }>`
  display: flex; align-items: center; gap: 1rem; border-left: 4px solid rgba(65,71,85,0.35); background: var(--surface-container-lowest, #060e20); padding: 1rem; opacity: ${(p) => (p.active ? 1 : 0.62)}; border-left-color: ${(p) => (p.active ? 'var(--primary-fixed-dim, #adc6ff)' : 'rgba(65,71,85,0.35)')}; background: ${(p) => (p.active ? 'var(--surface-container-low, #171f33)' : 'var(--surface-container-lowest, #060e20)')};
`;

export const StepIndex = styled.span`
  font-size: 1.75rem; font-weight: 800; color: var(--outline, #98a6bf);
`;

export const StepMeta = styled.div``;
export const StepLabel = styled.span`
  display:block; color: var(--outline, #98a6bf); font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.12em;
`;
export const StepTitle = styled.span`
  display:block; margin-top: 0.2rem; color: #ffffff; font-weight:700;
`;

export const Grid = styled.div`
  display: grid; grid-template-columns: repeat(12, minmax(0,1fr)); gap: 2rem; align-items: start;
`;

export const LeftRail = styled.div`
  grid-column: span 8; display:flex; flex-direction:column; gap:2rem;
`;

export const RightRail = styled.div`
  grid-column: span 4; display:flex; flex-direction:column; gap:1.5rem; position: sticky; top: 5.6rem;
`;

export const Panel = styled.section`
  background: var(--surface-container-low, #171f33); border:1px solid rgba(65,71,85,0.22); border-radius:0.35rem; padding:2rem;
`;

export const PanelHighlight = styled(Panel)`
  position: relative; overflow: hidden; box-shadow: 0 24px 40px rgba(4,8,20,0.35);
`;

export const Watermark = styled.div`
  position: absolute; top:0.3rem; right:1rem; font-size:5rem; font-weight:900; color: rgba(255,255,255,0.05); pointer-events:none;
`;

export const PanelHead = styled.div`
  display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:1.75rem;
  h3 { margin:0; display:flex; align-items:center; gap:0.55rem; color:#fff; font-size:1.3rem; }
`;

export const MaxTag = styled.span`
  border:1px solid rgba(78,222,163,0.2); color:var(--secondary,#4edea3); background: rgba(0,165,114,0.12); font-size:0.7rem; padding:0.35rem 0.6rem; border-radius:6px;
`;

export const InputWrap = styled.div`
  display:flex; align-items:flex-end; justify-content:space-between; border-bottom:2px solid var(--outline-variant,#414755); margin-bottom:1.4rem;
`;

export const AmountInput = styled.input`
  width:100%; border:0; outline:none; background:transparent; color:#ffffff; font-size:clamp(2rem,4.8vw,3.8rem); font-weight:700; padding:0.35rem 0 0.65rem;
`;

export const AmountSuffix = styled.div`
  color: var(--outline, #98a6bf); font-size:1.1rem; padding-bottom:0.95rem;
`;

export const ProgressTrack = styled.div`
  height: 0.45rem; border-radius:999px; overflow:hidden; background: var(--surface-container-highest,#222a3d);
`;

export const ProgressFill = styled.div`
  height:100%; background: linear-gradient(90deg,var(--primary-container,#4b8eff),var(--primary-fixed-dim,#adc6ff)); box-shadow:0 0 15px rgba(173,198,255,0.4);
`;

export const ProgressLabels = styled.div`
  margin-top:0.6rem; display:flex; justify-content:space-between; color:var(--outline,#98a6bf); font-size:0.67rem;
`;

export const PresetRow = styled.div`
  margin-top:1.4rem; display:flex; gap:0.7rem;
`;

export const PresetButton = styled.button`
  flex:1; border:1px solid rgba(65,71,85,0.4); background:var(--surface-container-high,#31394d); color:#fff; font-size:0.83rem; font-weight:700; padding:0.75rem 0.7rem; cursor:pointer; transition:all 0.2s ease;
  &.active { color: var(--primary-fixed-dim,#adc6ff); border-color: rgba(173,198,255,0.45); background: rgba(173,198,255,0.1); }
`;

export const TrancheGrid = styled.div`
  display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:1rem;
`;

export const TrancheCard = styled.button<{ tone?: string; selected?: boolean }>`
  border:0; text-align:left; cursor:pointer; padding:1rem; background:var(--surface-container,#171f33); border-left:4px solid var(--primary-container,#4b8eff); color:#fff; transition: all 0.2s ease;
  ${(p) => p.tone === 'tertiary' && 'border-left-color: var(--tertiary-container,#ff5451);'}
  ${(p) => p.selected && 'background: var(--surface-container-high); box-shadow: 0 10px 28px rgba(173,198,255,0.12); outline: 2px solid rgba(173,198,255,0.5);'}
`;

export const TrancheHead = styled.div`
  display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.12em; font-weight:700; color:var(--outline,#98a6bf);
`;

export const TrancheYield = styled.div`
  margin-bottom:1rem; font-size:2rem; font-weight:700;
  p { margin:0.3rem 0 0; font-size:0.67rem; color:var(--outline,#98a6bf); }
`;

export const TrancheStats = styled.div`
  display:flex; flex-direction:column; gap:0.6rem; font-size:0.72rem;
  div { display:flex; justify-content:space-between; }
`;

export const ImpactGrid = styled.div`
  display:grid; grid-template-columns:1fr 1fr; gap:2rem;
`;

export const MetricStack = styled.div`
  display:flex; flex-direction:column; gap:1rem;
`;

export const MetricCard = styled.div`
  background: var(--surface-container-lowest,#060e20); padding:1rem; display:flex; align-items:center; justify-content:space-between; gap:1rem;
  span { font-size:0.72rem; color:var(--outline,#98a6bf); text-transform:uppercase; }
`;

export const MiniLabel = styled.span`
  display:block; color:var(--outline,#98a6bf); font-size:0.67rem; text-transform:uppercase; letter-spacing:0.16em; font-weight:700; margin-bottom:0.8rem;
`;

export const RegionStack = styled.div`
  display:flex; flex-direction:column; gap:0.9rem;
`;

export const RowBetween = styled.div`
  display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem; font-size:0.78rem; color: #fff;
`;

export const MiniTrack = styled.div`
  height:0.26rem; border-radius:999px; overflow:hidden; background: var(--surface-container-highest,#222a3d);
`;

export const MiniFill = styled.div<{ variant?: 'gain' | 'primary' | 'neutral' }>`
  height:100%; background: ${(p) => (p.variant === 'gain' ? 'var(--secondary,#4edea3)' : p.variant === 'primary' ? 'var(--primary-container,#4b8eff)' : 'var(--outline-variant,#8b90a0)')};
`;

export const Summary = styled.div`
  background: var(--surface-container-high,#222a3d); padding:1.5rem; border-radius:0.35rem; border:1px solid rgba(173,198,255,0.3); box-shadow: 0 16px 32px rgba(3,8,22,0.35);
`;

export const SummaryList = styled.div`
  border-bottom:1px solid rgba(65,71,85,0.35); padding-bottom:1.3rem; margin-bottom:1.25rem; display:flex; flex-direction:column; gap:1.1rem;
  div { display:flex; justify-content:space-between; gap:1rem; font-size:0.86rem; }
`;

export const TotalBlock = styled.div`
  span { color: var(--on-surface-variant,#c1c6d7); font-size:0.85rem; }
  strong { display:block; margin-top:0.35rem; color: var(--primary-fixed-dim,#adc6ff); font-size:1.72rem; font-weight:800; }
`;

export const FundingBox = styled.div`
  margin:1.3rem 0; border:1px solid rgba(65,71,85,0.3); background: var(--surface-container-lowest,#060e20); border-radius:0.3rem; padding:1rem;
`;

export const FundingHead = styled.div`
  display:flex; align-items:center; gap:0.5rem; color:#fff; font-size:0.85rem; font-weight:600; margin-bottom:0.9rem;
  .material-symbols-outlined { color: var(--secondary,#4edea3); }
`;

export const FundingSteps = styled.div`
  display:flex; flex-direction:column; gap:0.7rem;
  > div { display:flex; align-items:flex-start; gap:0.6rem; }
`;

export const ConfirmButton = styled.button`
  width:100%; border:0; border-radius:0.3rem; padding:0.95rem 1rem; background: var(--primary-container,#4b8eff); color: var(--on-primary,#001a41); font-weight:700; font-size:0.95rem; display:inline-flex; align-items:center; justify-content:center; gap:0.45rem; cursor:pointer; box-shadow:0 12px 30px rgba(75,142,255,0.28);
`;

export const ContextCard = styled.div`
  background: var(--surface-container,#171f33); border:1px solid rgba(65,71,85,0.22); border-radius:0.35rem; padding:1.2rem;
`;

export const ContextImage = styled.div`
  aspect-ratio: 16/9; border-radius: 0.25rem; overflow: hidden; margin-bottom: 1rem; background: var(--surface-container-lowest);
  img { width:100%; height:100%; object-fit:cover; opacity:0.6; }
`;

export const Footer = styled.footer`
  border-top:1px solid rgba(65,71,85,0.25); padding:1.6rem 2rem; margin-top:1rem;
`;

export const FooterInner = styled.div`
  max-width:80rem; margin:0 auto; display:flex; align-items:center; justify-content:space-between; gap:1rem;
`;

export const LoadingBanner = styled.div`
  padding: 0.7rem 1rem; border-radius: 0.35rem; background: linear-gradient(90deg,#0f1724,#071026); color: var(--on-surface-variant,#c1c6d7); font-weight:700; display:flex; align-items:center; gap:0.6rem; border:1px solid rgba(65,71,85,0.18);
`;

export const ErrorBanner = styled(LoadingBanner)`
  background: linear-gradient(90deg,#2b0f14,#1a0a0d); color: #ffd6d6; border:1px solid rgba(255,80,80,0.16);
`;
