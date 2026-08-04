import styled from 'styled-components';
import { colors, withAlpha } from '../colors';

export const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
`;

export const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
`;

export const HeadLabel = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  /* Use the stronger on-surface token to ensure good contrast on light theme */
  color: var(--xds-on-surface-strong, ${colors.onSurfaceStrong});
`;

export const ResetBtn = styled.button`
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--primary, ${colors.primary});
  cursor: pointer;
`;

export const Row = styled.div<{ $indent?: boolean; $dim?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.28rem 0.35rem;
  padding-left: ${({ $indent }) => ($indent ? '1.55rem' : '0.35rem')};
  border-radius: 0.4rem;
  /* Provide a label color variable so dimmed rows remain readable without
     lowering overall opacity (which reduces contrast too aggressively). */
  --submission-label-color: var(--xds-on-surface-strong, ${colors.onSurfaceStrong});
  ${({ $dim }) => ($dim ? `--submission-label-color: var(--xds-on-surface-variant, ${colors.onSurfaceVariant});` : '')}
  &:hover {
    background: ${withAlpha(colors.neutral[400], 0.08)};
    --submission-label-color: var(--xds-on-surface-strong, ${colors.onSurfaceStrong});
  }
`;

export const Twisty = styled.button`
  border: none;
  background: none;
  padding: 0;
  display: inline-flex;
  align-items: center;
  color: var(--xds-on-surface, ${colors.onSurface});
  cursor: pointer;
  .material-symbols-outlined { font-size: 18px; }
`;

export const Box = styled.button<{ $state: 'all' | 'some' | 'none' }>`
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  border: ${({ $state }) =>
    $state === 'none' ? `1px solid ${colors.border}` : 'none'};
  background: ${({ $state }) =>
    $state === 'none' ? 'transparent' : `var(--primary, ${colors.primary})`} ;
  color: var(--on-primary, ${colors.onPrimary});
  .material-symbols-outlined { font-size: 12px; }
`;

export const Dot = styled.button<{ $color: string }>`
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  padding: 0;
  background: ${({ $color }) => $color};
`;

export const Label = styled.span<{ $bold?: boolean }>`
  flex: 1;
  font-size: 0.78rem;
  font-weight: ${({ $bold }) => ($bold ? 500 : 400)};
  /* Use the per-row label color so nested/dim rows remain legible. */
  color: var(--submission-label-color, var(--xds-on-surface-strong, ${colors.onSurfaceStrong}));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Count = styled.span`
  font-size: 0.7rem;
  color: var(--on-surface-variant, ${colors.onSurfaceVariant});
`;

export const PickerWrap = styled.div`
  position: relative;
`;

export const Picker = styled.div`
  position: absolute;
  right: 0;
  top: 1.6rem;
  z-index: 20;
  width: 9.5rem;
  background: var(--surface-deep, ${colors.surfaceDeep});
  border: 1px solid ${colors.border};
  border-radius: 0.55rem;
  padding: 0.55rem;
  box-shadow: 0 8px 24px ${withAlpha(colors.black, 0.45)};
`;

export const PickerLabel = styled.div`
  font-size: 0.62rem;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--on-surface-variant, ${colors.onSurfaceVariant});
  margin-bottom: 0.45rem;
`;

export const SwatchGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.35rem;
`;

export const Swatch = styled.button<{ $color: string; $active: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 5px;
  cursor: pointer;
  padding: 0;
  background: ${({ $color }) => $color};
  border: none;
  outline: ${({ $active }) => ($active ? `2px solid ${colors.onSurface}` : 'none')};
  outline-offset: 1px;
`;

export default {} as any;
